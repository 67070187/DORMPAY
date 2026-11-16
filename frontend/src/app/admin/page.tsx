import Link from "next/link";
import { api } from "@/lib/api";
import { baht, monthLabel, shortMonthLabel, thaiDate } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import RevenueChart from "@/components/RevenueChart";

export default async function AdminDashboard() {
  const d = await api<Dashboard>("/dashboard");
  const chart = d.revenue.map((r) => ({ label: shortMonthLabel(r.month), paid: r.paid / 100, unpaid: r.unpaid / 100 }));

  const stats = [
    { label: "รับชำระเดือนนี้", value: `${baht(d.collected.amount)} ฿`, sub: `${d.collected.count} รายการ` },
    {
      label: "ยอดค้างชำระทั้งหมด",
      value: `${baht(d.outstanding.amount)} ฿`,
      sub: `${d.outstanding.count} บิล · เกินกำหนด ${d.outstanding.overdue}`,
      warn: d.outstanding.amount > 0,
    },
    {
      label: "ห้องที่มีผู้เช่า",
      value: `${d.rooms.occupied}/${d.rooms.total}`,
      sub: `อัตราเข้าพัก ${d.rooms.total ? Math.round((d.rooms.occupied / d.rooms.total) * 100) : 0}%`,
    },
    { label: "ห้องว่าง", value: String(d.rooms.vacant), sub: "ห้อง" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-lg font-semibold">ภาพรวม · {monthLabel(d.month)}</h1>
        <Link href="/admin/meters" className="btn">จดมิเตอร์เดือนนี้</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.warn ? "text-red-600" : ""}`}>{s.value}</p>
            <p className="text-xs text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <section className="card">
        <h2 className="mb-2 font-semibold">รายรับตามเดือนของบิล (บาท)</h2>
        <RevenueChart data={chart} />
      </section>

      <section className="card overflow-x-auto">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">บิลค้างชำระ</h2>
          <Link href="/admin/bills?status=UNPAID" className="text-sm text-indigo-600 hover:underline">ดูทั้งหมด</Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ห้อง</th>
              <th>ผู้เช่า</th>
              <th>เดือน</th>
              <th className="text-right">ยอด (บาท)</th>
              <th>ครบกำหนด</th>
            </tr>
          </thead>
          <tbody>
            {d.unpaidBills.map((b) => (
              <tr key={b.id}>
                <td className="font-medium">
                  <Link href={`/admin/bills/${b.id}`} className="hover:underline">{b.roomNumber}</Link>
                </td>
                <td>{b.tenantName}</td>
                <td>{monthLabel(b.month)}</td>
                <td className="text-right">{baht(b.total)}</td>
                <td className={b.displayStatus === "OVERDUE" ? "font-medium text-red-600" : "text-slate-500"}>
                  {thaiDate(new Date(b.dueDate))}
                </td>
              </tr>
            ))}
            {!d.unpaidBills.length && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">ไม่มีบิลค้างชำระ</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
