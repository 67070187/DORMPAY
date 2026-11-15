"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { monthLabel } from "@/lib/format";

/** สร้าง Stripe Checkout Session แล้วพาผู้เช่าไปหน้าจ่ายเงินของ Stripe */
export async function payBill(fd: FormData) {
  const session = await requireRole("TENANT");
  const bill = await prisma.bill.findUnique({
    where: { id: Number(fd.get("billId")) || 0 },
    include: { room: true },
  });
  if (!bill || bill.tenantId !== session.userId) redirect("/tenant");
  if (bill.status === "PAID") redirect(`/tenant/bills/${bill.id}`);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    currency: "thb",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "thb",
          unit_amount: bill.total, // สตางค์
          product_data: {
            name: `ค่าหอพัก ห้อง ${bill.room.number} - ${monthLabel(bill.month)}`,
            description: "ค่าเช่า + ค่าน้ำ + ค่าไฟ",
          },
        },
      },
    ],
    metadata: { billId: String(bill.id) },
    payment_intent_data: { metadata: { billId: String(bill.id) } },
    success_url: `${appUrl}/tenant/bills/${bill.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/tenant/bills/${bill.id}?canceled=1`,
  });

  redirect(checkout.url!);
}
