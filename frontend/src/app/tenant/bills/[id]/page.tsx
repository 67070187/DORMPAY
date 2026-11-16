import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { BillWithPayments } from "@/lib/types";
import BillDetail from "@/components/BillDetail";
import PayBill from "@/components/PayBill";

export default async function TenantBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bill = await api<BillWithPayments>(`/bills/${Number(id) || 0}`).catch((e) => {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/tenant" className="text-sm text-indigo-600 hover:underline">← กลับไปหน้าบิลของฉัน</Link>
      <BillDetail bill={bill} />
      {bill.status === "UNPAID" && (
        <div className="flex items-center gap-3">
          <PayBill bill={bill} label="ชำระเงินด้วย PromptPay" />
          <span className="text-xs text-slate-500">สแกน QR พร้อมเพย์ (โหมดสาธิต)</span>
        </div>
      )}
    </div>
  );
}
