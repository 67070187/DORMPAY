import type Stripe from "stripe";
import { prisma } from "@/lib/db";

/** วันครบกำหนด = วันที่ dueDay ของเดือนถัดจากเดือนบิล */
export function dueDateFor(month: string, dueDay: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, dueDay, 23, 59, 59);
}

export async function getSettings() {
  return prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/**
 * บันทึกการชำระเงินจาก Stripe Checkout Session
 * เรียกได้ทั้งจาก webhook และตอนผู้เช่ากลับมาที่หน้าเว็บ (เรียกซ้ำได้ ไม่บันทึกซ้ำ)
 */
export async function recordStripePayment(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return false;
  const billId = Number(session.metadata?.billId);
  if (!billId) return false;

  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { stripeSessionId: session.id } });
    if (existing) return;
    await tx.payment.create({
      data: {
        billId,
        amount: session.amount_total ?? 0,
        stripeSessionId: session.id,
        stripePaymentId: paymentIntent ?? null,
        method: session.payment_method_types?.join(", ") ?? null,
      },
    });
    await tx.bill.update({ where: { id: billId }, data: { status: "PAID", paidAt: new Date() } });
  });
  return true;
}
