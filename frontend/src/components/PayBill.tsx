import { api } from "@/lib/api";
import { baht, monthLabel } from "@/lib/format";
import type { Bill, PromptPayInfo } from "@/lib/types";
import PromptPayModal from "./PromptPayModal";

/** ปุ่มชำระเงิน: ขอข้อมูล QR จาก GET /api/bills/:id/promptpay แล้วส่งให้ modal */
export default async function PayBill({ bill, label }: { bill: Bill; label?: string }) {
  const pp = await api<PromptPayInfo>(`/bills/${bill.id}/promptpay`);
  return (
    <PromptPayModal
      billId={bill.id}
      amount={baht(pp.amount)}
      title={`ห้อง ${bill.roomNumber} · ${monthLabel(bill.month)}`}
      payload={pp.payload}
      accountName={pp.accountName}
      accountId={pp.accountId}
      buttonLabel={label}
    />
  );
}
