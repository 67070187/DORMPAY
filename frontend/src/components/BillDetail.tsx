import type { BillWithPayments } from "@/lib/types";
import { baht, monthLabel, thaiDate } from "@/lib/format";
import StatusBadge from "./StatusBadge";

const METHOD_LABEL: Record<string, string> = { promptpay: "PromptPay", card: "บัตรเครดิต/เดบิต", cash: "เงินสด" };

export default function BillDetail({ bill }: { bill: BillWithPayments }) {
  const lines = [
    { label: "ค่าเช่าห้อง", detail: "", amount: bill.rent },
    { label: "ค่าน้ำ", detail: `${bill.waterUnits} หน่วย × ${baht(bill.waterRate)}`, amount: bill.waterAmount },
    { label: "ค่าไฟ", detail: `${bill.elecUnits} หน่วย × ${baht(bill.elecRate)}`, amount: bill.elecAmount },
  ];
  const payment = bill.payments[0];

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">ใบแจ้งหนี้ #{String(bill.id).padStart(5, "0")}</p>
          <h2 className="text-xl font-semibold">
            ห้อง {bill.roomNumber} · {monthLabel(bill.month)}
          </h2>
          <p className="text-sm text-slate-500">ผู้เช่า: {bill.tenantName}</p>
        </div>
        <StatusBadge status={bill.displayStatus} />
      </div>

      <table className="table">
        <tbody>
          {lines.map((l) => (
            <tr key={l.label}>
              <td>{l.label}</td>
              <td className="text-slate-500">{l.detail}</td>
              <td className="text-right">{baht(l.amount)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} className="font-semibold">รวมทั้งสิ้น</td>
            <td className="text-right text-lg font-bold">{baht(bill.total)} บาท</td>
          </tr>
        </tbody>
      </table>

      <div className="text-sm text-slate-600">
        {bill.status === "PAID" ? (
          <p>
            ชำระเมื่อ {bill.paidAt ? thaiDate(new Date(bill.paidAt)) : "-"}
            {payment && ` · ช่องทาง ${METHOD_LABEL[payment.method] ?? payment.method} · เลขอ้างอิง ${payment.reference}`}
          </p>
        ) : (
          <p className={bill.displayStatus === "OVERDUE" ? "text-red-600" : ""}>
            ครบกำหนดชำระ {thaiDate(new Date(bill.dueDate))}
          </p>
        )}
      </div>
    </div>
  );
}
