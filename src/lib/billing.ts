import { prisma } from "@/lib/db";

/** วันครบกำหนด = วันที่ dueDay ของเดือนถัดจากเดือนบิล */
export function dueDateFor(month: string, dueDay: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, dueDay, 23, 59, 59);
}

export async function getSettings() {
  return prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/** เลขอ้างอิงการชำระ เช่น DP20261116-000097-4821 */
export function paymentReference(billId: number, now = new Date()) {
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DP${ymd}-${String(billId).padStart(6, "0")}-${rand}`;
}
