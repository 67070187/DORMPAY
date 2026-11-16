import type { Bill, Room, Setting } from "@prisma/client";
import { baht, monthLabel } from "@/lib/format";
import { maskPromptPayId, promptPayPayload } from "@/lib/promptpay";
import PromptPayModal from "./PromptPayModal";

/** ปุ่มชำระเงินของบิล (สร้าง QR PromptPay ฝั่งเซิร์ฟเวอร์แล้วส่งให้ modal) */
export default function PayBill({
  bill,
  settings,
  label,
}: {
  bill: Bill & { room: Room };
  settings: Setting;
  label?: string;
}) {
  return (
    <PromptPayModal
      billId={bill.id}
      amount={baht(bill.total)}
      title={`ห้อง ${bill.room.number} · ${monthLabel(bill.month)}`}
      payload={promptPayPayload(settings.promptPayId, bill.total)}
      accountName={settings.promptPayName}
      accountId={maskPromptPayId(settings.promptPayId)}
      buttonLabel={label}
    />
  );
}
