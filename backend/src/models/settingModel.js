const { pool } = require("../config/db");

async function get(conn = pool) {
  const [rows] = await conn.query(`
    SELECT water_rate AS waterRate, elec_rate AS elecRate, due_day AS dueDay,
           promptpay_id AS promptPayId, promptpay_name AS promptPayName
    FROM settings WHERE id = 1`);
  return rows[0];
}

async function update({ waterRate, elecRate, dueDay, promptPayId, promptPayName }) {
  await pool.query(
    `UPDATE settings SET water_rate = ?, elec_rate = ?, due_day = ?, promptpay_id = ?, promptpay_name = ?
     WHERE id = 1`,
    [waterRate, elecRate, dueDay, promptPayId, promptPayName],
  );
  return get();
}

module.exports = { get, update };
