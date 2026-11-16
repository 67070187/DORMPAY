import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import BillDetail from "@/components/BillDetail";
import { deleteBill } from "../../actions";

export default async function AdminBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bill = await prisma.bill.findUnique({
    where: { id: Number(id) || 0 },
    include: { room: true, tenant: true, payments: { orderBy: { paidAt: "desc" } } },
  });
  if (!bill) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/admin/bills" className="text-sm text-indigo-600 hover:underline">← กลับไปหน้าบิล</Link>
      <BillDetail bill={bill} />
      {bill.payments.length > 0 && (
        <div className="card text-sm">
          <h3 className="mb-2 font-semibold">ข้อมูลการชำระ</h3>
          {bill.payments.map((p) => (
            <p key={p.id} className="break-all text-slate-600">
              เลขอ้างอิง <span className="font-mono">{p.reference}</span> · {p.method} ·{" "}
              {p.paidAt.toLocaleString("th-TH")}
            </p>
          ))}
        </div>
      )}
      {bill.status === "UNPAID" && (
        <form action={deleteBill} className="flex items-center gap-3">
          <input type="hidden" name="id" value={bill.id} />
          <button className="btn-danger">ลบบิลนี้</button>
          <span className="text-xs text-slate-400">เลขมิเตอร์ของเดือนนี้จะถูกลบด้วย ให้จดใหม่ได้</span>
        </form>
      )}
    </div>
  );
}
