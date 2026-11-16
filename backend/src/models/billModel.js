const { pool } = require("../config/db");

const SELECT_BILL = `
  SELECT id, room_id AS roomId, tenant_id AS tenantId, month, rent,
         water_units AS waterUnits, water_rate AS waterRate, water_amount AS waterAmount,
         elec_units AS elecUnits, elec_rate AS elecRate, elec_amount AS elecAmount,
         total, due_date AS dueDate, status, paid_at AS paidAt,
         room_number AS roomNumber, tenant_name AS tenantName, display_status AS displayStatus
  FROM v_bill_details`;

/** ค้นหาบิลจาก VIEW v_bill_details ตามเงื่อนไข (ใช้ทั้ง admin และผู้เช่า) */
async function findAll({ month, status, tenantId, limit = 500 } = {}) {
  const where = [];
  const params = [];
  if (month) {
    where.push("month = ?");
    params.push(month);
  }
  if (status === "PAID" || status === "UNPAID") {
    where.push("status = ?");
    params.push(status);
  }
  if (status === "OVERDUE") where.push("display_status = 'OVERDUE'");
  if (tenantId) {
    where.push("tenant_id = ?");
    params.push(tenantId);
  }
  const sql = `${SELECT_BILL} ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY month DESC, room_number ASC LIMIT ?`;
  const [rows] = await pool.query(sql, [...params, limit]);
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(`${SELECT_BILL} WHERE id = ?`, [id]);
  return rows[0] ?? null;
}

async function findByRoomMonth(conn, roomId, month) {
  const [rows] = await conn.query("SELECT id, status FROM bills WHERE room_id = ? AND month = ? FOR UPDATE", [roomId, month]);
  return rows[0] ?? null;
}

async function months() {
  const [rows] = await pool.query("SELECT DISTINCT month FROM bills ORDER BY month DESC");
  return rows.map((r) => r.month);
}

async function upsert(conn, b) {
  await conn.query(
    `INSERT INTO bills (room_id, tenant_id, month, rent, water_units, water_rate, water_amount,
                        elec_units, elec_rate, elec_amount, total, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE tenant_id = VALUES(tenant_id), rent = VALUES(rent),
       water_units = VALUES(water_units), water_rate = VALUES(water_rate), water_amount = VALUES(water_amount),
       elec_units = VALUES(elec_units), elec_rate = VALUES(elec_rate), elec_amount = VALUES(elec_amount),
       total = VALUES(total), due_date = VALUES(due_date)`,
    [b.roomId, b.tenantId, b.month, b.rent, b.waterUnits, b.waterRate, b.waterAmount,
     b.elecUnits, b.elecRate, b.elecAmount, b.total, b.dueDate],
  );
}

/** ล็อกแถวบิลไว้ระหว่าง transaction กันจ่ายซ้ำพร้อมกัน */
async function lockForPayment(conn, id) {
  const [rows] = await conn.query("SELECT id, tenant_id AS tenantId, total, status FROM bills WHERE id = ? FOR UPDATE", [id]);
  return rows[0] ?? null;
}

async function markPaid(conn, id) {
  const [r] = await conn.query("UPDATE bills SET status = 'PAID', paid_at = NOW() WHERE id = ? AND status = 'UNPAID'", [id]);
  return r.affectedRows === 1;
}

async function remove(conn, id) {
  const [r] = await conn.query("DELETE FROM bills WHERE id = ? AND status = 'UNPAID'", [id]);
  return r.affectedRows === 1;
}

module.exports = { findAll, findById, findByRoomMonth, months, upsert, lockForPayment, markPaid, remove };
