const { pool } = require("../config/db");

async function roomStats() {
  const [[row]] = await pool.query(`
    SELECT COUNT(*) AS total, COUNT(tenant_id) AS occupied
    FROM rooms WHERE deleted_at IS NULL`);
  return { total: row.total, occupied: row.occupied, vacant: row.total - row.occupied };
}

/** ยอดรับชำระตั้งแต่วันที่ 1 ของเดือนนี้ */
async function collectedSince(date) {
  const [[row]] = await pool.query(
    "SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count FROM payments WHERE paid_at >= ?",
    [date],
  );
  return { amount: Number(row.amount), count: row.count };
}

/** ยอดค้างชำระทั้งหมด และจำนวนที่เกินกำหนด (จาก VIEW) */
async function outstanding() {
  const [[row]] = await pool.query(`
    SELECT COALESCE(SUM(total), 0) AS amount, COUNT(*) AS count,
           SUM(display_status = 'OVERDUE') AS overdue
    FROM v_bill_details WHERE status = 'UNPAID'`);
  return { amount: Number(row.amount), count: row.count, overdue: Number(row.overdue ?? 0) };
}

/** รายรับรายเดือนจาก VIEW v_monthly_revenue */
async function monthlyRevenue(months) {
  const [rows] = await pool.query(
    `SELECT month, bill_count AS billCount, paid_total AS paid, unpaid_total AS unpaid
     FROM v_monthly_revenue WHERE month IN (?) ORDER BY month`,
    [months],
  );
  return rows.map((r) => ({ ...r, paid: Number(r.paid), unpaid: Number(r.unpaid) }));
}

module.exports = { roomStats, collectedSince, outstanding, monthlyRevenue };
