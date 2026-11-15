import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { recordStripePayment } from "@/lib/billing";

// Stripe เรียก URL นี้เมื่อมีการชำระเงิน (ใช้ร่วมกับ `stripe listen` ตอนพัฒนา หรือ webhook จริงตอน deploy)
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not set" }, { status: 500 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe().webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await recordStripePayment(event.data.object as Stripe.Checkout.Session);
  }
  return NextResponse.json({ received: true });
}
