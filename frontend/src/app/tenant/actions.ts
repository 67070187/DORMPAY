"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { paymentReference } from "@/lib/billing";

export type PayResult = { ok: true; reference: string } | { ok: false; error: string };

/**
 * โหมดสาธิต: ผู้เช่ากด "โอนเงินเสร็จสิ้น" แล้วระบบถือว่าจ่ายแล้วทันที
 * (ระบบจริงต้องตรวจสอบยอดเงินเข้าจากธนาคาร/payment gateway ก่อน)
 */
export async function confirmDemoPayment(billId: number): Promise<PayResult> {
  const session = await requireRole("TENANT");

  const result = await prisma.$transaction(async (tx) => {
    const bill = await tx.bill.findUnique({ where: { id: billId } });
    if (!bill || bill.tenantId !== session.userId) return { ok: false as const, error: "ไม่พบบิลนี้" };
    if (bill.status === "PAID") return { ok: false as const, error: "บิลนี้ชำระแล้ว" };

    const reference = paymentReference(bill.id);
    await tx.payment.create({ data: { billId: bill.id, amount: bill.total, reference, method: "promptpay" } });
    // updateMany + เงื่อนไข UNPAID กันกดซ้ำพร้อมกันแล้วบันทึกสองครั้ง
    const updated = await tx.bill.updateMany({
      where: { id: bill.id, status: "UNPAID" },
      data: { status: "PAID", paidAt: new Date() },
    });
    if (updated.count !== 1) throw new Error("บิลนี้ชำระแล้ว");
    return { ok: true as const, reference };
  }).catch((e: Error) => ({ ok: false as const, error: e.message }));

  // ไม่เรียก revalidatePath ที่นี่ เพราะจะทำให้หน้ารีเฟรชทันทีและ modal ปิดก่อนแสดงผลสำเร็จ
  // modal จะเรียก router.refresh() เองตอนผู้ใช้กด "เสร็จสิ้น" (หน้าอื่นเป็น dynamic อยู่แล้ว)
  return result;
}
