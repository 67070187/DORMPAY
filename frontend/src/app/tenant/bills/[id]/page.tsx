import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/billing";
import BillDetail from "@/components/BillDetail";
import PayBill from "@/components/PayBill";

export default async function TenantBillPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("TENANT");
  const { id } = await params;

  const [bill, settings] = await Promise.all([
    prisma.bill.findUnique({
      where: { id: Number(id) || 0 },
      include: { room: true, tenant: true, payments: { orderBy: { paidAt: "desc" } } },
    }),
    getSettings(),
  ]);
  if (!bill || bill.tenantId !== session.userId) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/tenant" className="text-sm text-indigo-600 hover:underline">← กลับไปหน้าบิลของฉัน</Link>
      <BillDetail bill={bill} />
      {bill.status === "UNPAID" && (
        <div className="flex items-center gap-3">
          <PayBill bill={bill} settings={settings} label="ชำระเงินด้วย PromptPay" />
          <span className="text-xs text-slate-500">สแกน QR พร้อมเพย์ (โหมดสาธิต)</span>
        </div>
      )}
    </div>
  );
}
