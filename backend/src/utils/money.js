// เงินในระบบเก็บเป็นสตางค์ (จำนวนเต็ม) ฟังก์ชันพวกนี้แปลงไป-กลับ

/** 3500.5 -> 350050 */
function toSatang(baht) {
  const n = Number(baht);
  if (baht === "" || baht === null || !Number.isFinite(n) || n < 0) {
    throw new RangeError("จำนวนเงินไม่ถูกต้อง");
  }
  return Math.round(n * 100);
}

/** 350050 -> "3,500.50" */
function formatBaht(satang) {
  return (satang / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = { toSatang, formatBaht };
