"use server";

import { api, errorMessage } from "@/lib/api";

export type PayResult = { ok: true; reference: string } | { ok: false; error: string };

/**
 * โหมดสาธิต: กด "โอนเงินเสร็จสิ้น" -> POST /api/bills/:id/pay
 * (ระบบจริงต้องตรวจสอบยอดเงินเข้าจากธนาคาร/payment gateway ก่อน)
 */
export async function confirmDemoPayment(billId: number): Promise<PayResult> {
  try {
    const res = await api<{ reference: string }>(`/bills/${billId}/pay`, { method: "POST" });
    return { ok: true, reference: res.reference };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
