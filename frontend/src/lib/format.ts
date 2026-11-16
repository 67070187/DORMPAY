// เงินในระบบเก็บเป็นสตางค์ ฟังก์ชันพวกนี้ใช้แปลงไป-กลับ

export function baht(satang: number): string {
  return (satang / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toSatang(value: FormDataEntryValue | null): number {
  const n = Number(value);
  if (value === null || value === "" || !Number.isFinite(n) || n < 0) throw new RangeError("จำนวนเงินไม่ถูกต้อง");
  return Math.round(n * 100);
}

const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** "2026-11" -> "พฤศจิกายน 2569" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${TH_MONTHS[m - 1]} ${y + 543}`;
}

export function shortMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${TH_MONTHS[m - 1].slice(0, 3)} ${String(y + 543).slice(2)}`;
}

export function currentMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return currentMonth(d);
}

export function thaiDate(d: Date): string {
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}
