import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { baht, monthLabel, thaiDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string }>;
}) {
  const { month, status } = await searchParams;
  const months = await prisma.bill.findMany({ distinct: ["month"], select: { month: true }, orderBy: { month: "desc" } });

  const where: Prisma.BillWhereInput = {};
  if (month) where.month = month;
  if (status === "PAID" || status === "UNPAID") where.status = status;
  if (status === "OVERDUE") Object.assign(where, { status: "UNPAID", dueDate: { lt: new Date() } });

  const bills = await prisma.bill.findMany({
    where,
    include: { room: true, tenant: true },
    orderBy: [{ month: "desc" }, { room: { number: "asc" } }],
    take: 300,
  });
  const sum = bills.reduce((s, b) => s + b.total, 0);
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-lg font-semibold">บิลทั้งหมด</h1>
        <form className="flex flex-wrap items-center gap-2">
          <select name="month" defaultValue={month ?? ""} className="input !w-44" aria-label="เดือน">
            <option value="">ทุกเดือน</option>
            {months.map((m) => (
              <option key={m.month} value={m.month}>{monthLabel(m.month)}</option>
            ))}
          </select>
          <select name="status" defaultValue={status ?? ""} className="input !w-36" aria-label="สถานะ">
            <option value="">ทุกสถานะ</option>
            <option value="UNPAID">รอชำระ</option>
            <option value="OVERDUE">เกินกำหนด</option>
            <option value="PAID">ชำระแล้ว</option>
          </select>
          <button className="btn-secondary">กรอง</button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>เดือน</th>
              <th>ห้อง</th>
              <th>ผู้เช่า</th>
              <th className="text-right">ยอด (บาท)</th>
              <th>ครบกำหนด</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id}>
                <td>{monthLabel(b.month)}</td>
                <td className="font-medium">{b.room.number}</td>
                <td>{b.tenant.name}</td>
                <td className="text-right">{baht(b.total)}</td>
                <td className="text-slate-500">{thaiDate(b.dueDate)}</td>
                <td>
                  <StatusBadge status={b.status} overdue={b.dueDate < now} />
                </td>
                <td className="text-right">
                  <Link href={`/admin/bills/${b.id}`} className="text-indigo-600 hover:underline">
                    ดูรายละเอียด
                  </Link>
                </td>
              </tr>
            ))}
            {!bills.length && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">ไม่พบบิล</td>
              </tr>
            )}
          </tbody>
          {!!bills.length && (
            <tfoot>
              <tr>
                <td colSpan={3} className="px-3 py-2 font-medium">รวม {bills.length} บิล</td>
                <td className="px-3 py-2 text-right font-semibold">{baht(sum)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
