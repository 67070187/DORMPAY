import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { baht, monthLabel, thaiDate } from "@/lib/format";
import { stripeConfigured } from "@/lib/stripe";
import StatusBadge from "@/components/StatusBadge";
import PayButton from "@/components/PayButton";
import { payBill } from "./actions";

export default async function TenantHome() {
  const session = await requireRole("TENANT");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    include: { room: true, bills: { include: { room: true }, orderBy: { month: "desc" } } },
  });
  const unpaid = user.bills.filter((b) => b.status === "UNPAID");
  const owed = unpaid.reduce((s, b) => s + b.total, 0);
  const now = new Date();
  const canPay = stripeConfigured();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">ห้องของฉัน</p>
          <p className="text-2xl font-bold">{user.room?.number ?? "-"}</p>
          {user.room && <p className="text-sm text-slate-500">ค่าเช่า {baht(user.room.rent)} บาท/เดือน</p>}
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">ยอดค้างชำระ</p>
          <p className={`text-2xl font-bold ${owed ? "text-red-600" : "text-emerald-600"}`}>{baht(owed)} บาท</p>
          <p className="text-sm text-slate-500">{unpaid.length} บิล</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">ชำระแล้วทั้งหมด</p>
          <p className="text-2xl font-bold">{user.bills.length - unpaid.length} บิล</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">บิลที่ต้องชำระ</h2>
        {!canPay && unpaid.length > 0 && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            ระบบยังไม่ได้เชื่อมต่อ Stripe จึงยังชำระออนไลน์ไม่ได้ กรุณาติดต่อเจ้าของหอ
          </p>
        )}
        {unpaid.map((b) => (
          <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">
                {monthLabel(b.month)} <StatusBadge status={b.status} overdue={b.dueDate < now} />
              </p>
              <p className="text-sm text-slate-500">
                ค่าเช่า {baht(b.rent)} · น้ำ {baht(b.waterAmount)} · ไฟ {baht(b.elecAmount)} · ครบกำหนด{" "}
                {thaiDate(b.dueDate)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">{baht(b.total)} บาท</span>
              <Link href={`/tenant/bills/${b.id}`} className="btn-secondary">รายละเอียด</Link>
              {canPay && (
                <form action={payBill}>
                  <input type="hidden" name="billId" value={b.id} />
                  <PayButton label="ชำระเงิน" />
                </form>
              )}
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
            {user.bills.map((b) => (
              <tr key={b.id}>
                <td>{monthLabel(b.month)}</td>
                <td>{b.room.number}</td>
                <td className="text-right">{baht(b.total)}</td>
                <td><StatusBadge status={b.status} overdue={b.dueDate < now} /></td>
                <td className="text-slate-500">{b.paidAt ? thaiDate(b.paidAt) : "-"}</td>
                <td className="text-right">
                  <Link href={`/tenant/bills/${b.id}`} className="text-indigo-600 hover:underline">ดู</Link>
                </td>
              </tr>
            ))}
            {!user.bills.length && (
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
