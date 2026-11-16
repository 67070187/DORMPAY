import Link from "next/link";
import { prisma } from "@/lib/db";
import { baht, currentMonth, monthLabel, prevMonth, shortMonthLabel, thaiDate } from "@/lib/format";
import RevenueChart, { type RevenuePoint } from "@/components/RevenueChart";

export default async function AdminDashboard() {
  const now = new Date();
  const thisMonth = currentMonth(now);
  const months: string[] = [];
  for (let m = thisMonth, i = 0; i < 12; i++, m = prevMonth(m)) months.unshift(m);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [rooms, bills, collectedThisMonth, overdue] = await Promise.all([
    prisma.room.findMany({ select: { tenantId: true } }),
    prisma.bill.groupBy({
      by: ["month", "status"],
      where: { month: { in: months } },
      _sum: { total: true },
    }),
    prisma.payment.aggregate({ where: { paidAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
    prisma.bill.findMany({
      where: { status: "UNPAID" },
      include: { room: true, tenant: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const occupied = rooms.filter((r) => r.tenantId).length;
  const outstanding = overdue.reduce((s, b) => s + b.total, 0);
  const overdueCount = overdue.filter((b) => b.dueDate < now).length;

  const chart: RevenuePoint[] = months.map((m) => {
    const get = (status: string) =>
      (bills.find((b) => b.month === m && b.status === status)?._sum.total ?? 0) / 100;
    return { label: shortMonthLabel(m), paid: get("PAID"), unpaid: get("UNPAID") };
  });
  const firstWithData = chart.findIndex((p) => p.paid || p.unpaid);
  const chartData = firstWithData === -1 ? chart.slice(-6) : chart.slice(Math.min(firstWithData, 6));

  const stats = [
    { label: "รับชำระเดือนนี้", value: `${baht(collectedThisMonth._sum.amount ?? 0)} ฿`, sub: `${collectedThisMonth._count} รายการ` },
    { label: "ยอดค้างชำระทั้งหมด", value: `${baht(outstanding)} ฿`, sub: `${overdue.length} บิล · เกินกำหนด ${overdueCount}`, warn: outstanding > 0 },
    { label: "ห้องที่มีผู้เช่า", value: `${occupied}/${rooms.length}`, sub: `อัตราเข้าพัก ${rooms.length ? Math.round((occupied / rooms.length) * 100) : 0}%` },
    { label: "ห้องว่าง", value: String(rooms.length - occupied), sub: "ห้อง" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-lg font-semibold">ภาพรวม · {monthLabel(thisMonth)}</h1>
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
        <RevenueChart data={chartData} />
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
            {overdue.slice(0, 10).map((b) => (
              <tr key={b.id}>
                <td className="font-medium">
                  <Link href={`/admin/bills/${b.id}`} className="hover:underline">{b.room.number}</Link>
                </td>
                <td>{b.tenant.name}</td>
                <td>{monthLabel(b.month)}</td>
                <td className="text-right">{baht(b.total)}</td>
                <td className={b.dueDate < now ? "font-medium text-red-600" : "text-slate-500"}>{thaiDate(b.dueDate)}</td>
              </tr>
            ))}
            {!overdue.length && (
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
