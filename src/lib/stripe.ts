import Stripe from "stripe";

export function stripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY;
  return !!key && key.startsWith("sk_") && key !== "sk_test_...";
}

let client: Stripe | null = null;
export function stripe() {
  if (!stripeConfigured()) throw new Error("ยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY ในไฟล์ .env");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}
