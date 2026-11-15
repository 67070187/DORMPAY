import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { recordStripePayment } from "@/lib/billing";
import BillDetail from "@/components/BillDetail";
import PayButton from "@/components/PayButton";
import { payBill } from "../../actions";

export default async function TenantBillPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string; canceled?: string }>;
}) {
  const session = await requireRole("TENANT");
  const { id } = await params;
  const { session_id, canceled } = await searchParams;
  const billId = Number(id) || 0;

  // กลับมาจาก Stripe: ถามสถานะกับ Stripe โดยตรง แล้วบันทึกว่าจ่ายแล้ว (ไม่ต้องรอ webhook)
  let notice: { type: "ok" | "warn"; text: string } | null = null;
  if (session_id && stripeConfigured()) {
    // PromptPay ยืนยันแบบ async บางครั้งกลับมาถึงก่อน Stripe อัปเดตสถานะ จึงลองซ้ำสูงสุด 3 ครั้ง
    let paid = false;
    for (let attempt = 1; attempt <= 3 && !paid; attempt++) {
      try {
        const checkout = await stripe().checkout.sessions.retrieve(session_id);
        if (checkout.metadata?.billId !== String(billId)) break;
        paid = await recordStripePayment(checkout);
      } catch (e) {
        console.error(`[stripe] verify checkout session failed (attempt ${attempt}):`, e);
      }
      if (!paid && attempt < 3) await new Promise((r) => setTimeout(r, 1500));
    }
    notice = paid
      ? { type: "ok", text: "ชำระเงินสำเร็จ ขอบคุณครับ" }
      : { type: "warn", text: "ยังไม่ได้รับยืนยันการชำระเงินจาก Stripe กรุณารีเฟรชหน้านี้อีกครั้งในอีกสักครู่" };
  } else if (canceled) {
    notice = { type: "warn", text: "ยกเลิกการชำระเงินแล้ว" };
  }

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { room: true, tenant: true, payments: { orderBy: { paidAt: "desc" } } },
  });
  if (!bill || bill.tenantId !== session.userId) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/tenant" className="text-sm text-indigo-600 hover:underline">← กลับไปหน้าบิลของฉัน</Link>
      {notice && (
        <p
          className={`rounded-lg p-3 text-sm ${
            notice.type === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
          }`}
        >
          {notice.text}
        </p>
      )}
      <BillDetail bill={bill} />
      {bill.status === "UNPAID" && stripeConfigured() && (
        <form action={payBill} className="flex items-center gap-3">
          <input type="hidden" name="billId" value={bill.id} />
          <PayButton label="ชำระเงินออนไลน์" />
          <span className="text-xs text-slate-500">บัตรเครดิต/เดบิต หรือ PromptPay ผ่าน Stripe</span>
        </form>
      )}
    </div>
  );
}
