const { pool } = require("../config/db");

/**
 * ห้องที่ต้องจดมิเตอร์ในเดือนนี้ + เลขเดือนนี้ (ถ้าจดแล้ว) + เลขครั้งก่อน (subquery) + บิลเดือนนี้
 */
async function listForMonth(month) {
  const [rows] = await pool.query(
    `SELECT r.id AS roomId, r.number AS roomNumber, u.name AS tenantName,
            m.water_prev AS waterPrev, m.water_curr AS waterCurr,
            m.elec_prev AS elecPrev, m.elec_curr AS elecCurr,
            (SELECT p.water_curr FROM meter_readings p
              WHERE p.room_id = r.id AND p.month < ? ORDER BY p.month DESC LIMIT 1) AS lastWater,
            (SELECT p.elec_curr FROM meter_readings p
              WHERE p.room_id = r.id AND p.month < ? ORDER BY p.month DESC LIMIT 1) AS lastElec,
            b.id AS billId, b.total AS billTotal, b.status AS billStatus
     FROM rooms r
     LEFT JOIN users u ON u.id = r.tenant_id
     LEFT JOIN meter_readings m ON m.room_id = r.id AND m.month = ?
     LEFT JOIN bills b ON b.room_id = r.id AND b.month = ?
     WHERE r.deleted_at IS NULL AND (r.tenant_id IS NOT NULL OR m.id IS NOT NULL)
     ORDER BY r.number`,
    [month, month, month, month],
  );
  return rows;
}

async function upsert(conn, { roomId, month, waterPrev, waterCurr, elecPrev, elecCurr }) {
  await conn.query(
    `INSERT INTO meter_readings (room_id, month, water_prev, water_curr, elec_prev, elec_curr)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE water_prev = VALUES(water_prev), water_curr = VALUES(water_curr),
                             elec_prev = VALUES(elec_prev), elec_curr = VALUES(elec_curr)`,
    [roomId, month, waterPrev, waterCurr, elecPrev, elecCurr],
  );
}

async function remove(conn, roomId, month) {
  await conn.query("DELETE FROM meter_readings WHERE room_id = ? AND month = ?", [roomId, month]);
}

module.exports = { listForMonth, upsert, remove };
