const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function isValidMonth(month) {
  return typeof month === "string" && MONTH_RE.test(month);
}

/** วันนี้ -> "2026-11" */
function currentMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-01" -> "2025-12" */
function prevMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return currentMonth(new Date(y, m - 2, 1));
}

/** วันครบกำหนด = วันที่ dueDay ของเดือนถัดจากเดือนบิล เวลา 23:59:59 */
function dueDateFor(month, dueDay) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, dueDay, 23, 59, 59);
}

function assertMeter(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${label}ต้องเป็นจำนวนเต็มไม่ติดลบ`);
}

/**
 * คำนวณบิลจากเลขมิเตอร์
 * @returns {{waterUnits, waterAmount, elecUnits, elecAmount, total}} หน่วยเงินเป็นสตางค์
 */
function calculateBill({ rent, waterPrev, waterCurr, elecPrev, elecCurr, waterRate, elecRate }) {
  assertMeter(waterPrev, "เลขมิเตอร์น้ำครั้งก่อน");
  assertMeter(waterCurr, "เลขมิเตอร์น้ำครั้งนี้");
  assertMeter(elecPrev, "เลขมิเตอร์ไฟครั้งก่อน");
  assertMeter(elecCurr, "เลขมิเตอร์ไฟครั้งนี้");
  if (waterCurr < waterPrev) throw new RangeError("เลขมิเตอร์น้ำครั้งนี้ต้องไม่น้อยกว่าครั้งก่อน");
  if (elecCurr < elecPrev) throw new RangeError("เลขมิเตอร์ไฟครั้งนี้ต้องไม่น้อยกว่าครั้งก่อน");

  const waterUnits = waterCurr - waterPrev;
  const elecUnits = elecCurr - elecPrev;
  const waterAmount = waterUnits * waterRate;
  const elecAmount = elecUnits * elecRate;
  return { waterUnits, waterAmount, elecUnits, elecAmount, total: rent + waterAmount + elecAmount };
}

/** เลขอ้างอิงการชำระ เช่น DP20261116-000097-4821 */
function paymentReference(billId, now = new Date(), random = Math.random) {
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + random() * 9000);
  return `DP${ymd}-${String(billId).padStart(6, "0")}-${rand}`;
}

module.exports = { isValidMonth, currentMonth, prevMonth, dueDateFor, calculateBill, paymentReference };
