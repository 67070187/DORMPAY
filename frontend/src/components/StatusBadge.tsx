import type { Bill } from "@/lib/types";

export default function StatusBadge({ status }: { status: Bill["displayStatus"] }) {
  if (status === "PAID")
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">ชำระแล้ว</span>;
  if (status === "OVERDUE")
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">เกินกำหนด</span>;
  return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">รอชำระ</span>;
}
