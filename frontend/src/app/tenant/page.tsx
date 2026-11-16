import Link from "next/link";
import { api } from "@/lib/api";
import { baht, monthLabel, thaiDate } from "@/lib/format";
import type { MeSummary } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import PayBill from "@/components/PayBill";

export default async function TenantHome() {
  const me = await api<MeSummary>("/me");
  const unpaid = me.bills.filter((b) => b.status === "UNPAID");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">ห้องของฉัน</p>
          <p className="text-2xl font-bold">{me.tenant.roomNumber ?? "-"}</p>
          {me.tenant.roomRent != null && <p className="text-sm text-slate-500">ค่าเช่า {baht(me.tenant.roomRent)} บาท/เดือน</p>}
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">ยอดค้างชำระ</p>
          <p className={`text-2xl font-bold ${me.owed ? "text-red-600" : "text-emerald-600"}`}>{baht(me.owed)} บาท</p>
          <p className="text-sm text-slate-500">{me.unpaidCount} บิล</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">ชำระแล้วทั้งหมด</p>
          <p className="text-2xl font-bold">{me.paidCount} บิล</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">บิลที่ต้องชำระ</h2>
        {unpaid.map((b) => (
          <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">
                {monthLabel(b.month)} <StatusBadge status={b.displayStatus} />
              </p>
              <p className="text-sm text-slate-500">
                ค่าเช่า {baht(b.rent)} · น้ำ {baht(b.waterAmount)} · ไฟ {baht(b.elecAmount)} · ครบกำหนด{" "}
                {thaiDate(new Date(b.dueDate))}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">{baht(b.total)} บาท</span>
              <Link href={`/tenant/bills/${b.id}`} className="btn-secondary">รายละเอียด</Link>
              <PayBill bill={b} />
            </div>
          </div>
        ))}
        {!unpaid.length && <p className="card text-center text-slate-500">ไม่มีบิลค้างชำระ 🎉</p>}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 text-lg font-semibold">ประวัติบิล</h2>
        <table className="table">
          <thead>
            <tr>
              <th>เดือน</th>
              <th>ห้อง</th>
              <th className="text-right">ยอด (บาท)</th>
              <th>สถานะ</th>
              <th>วันที่ชำระ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {me.bills.map((b) => (
              <tr key={b.id}>
                <td>{monthLabel(b.month)}</td>
                <td>{b.roomNumber}</td>
                <td className="text-right">{baht(b.total)}</td>
                <td><StatusBadge status={b.displayStatus} /></td>
                <td className="text-slate-500">{b.paidAt ? thaiDate(new Date(b.paidAt)) : "-"}</td>
                <td className="text-right">
                  <Link href={`/tenant/bills/${b.id}`} className="text-indigo-600 hover:underline">ดู</Link>
                </td>
              </tr>
            ))}
            {!me.bills.length && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">ยังไม่มีบิล</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
