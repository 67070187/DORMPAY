const { pool } = require("../config/db");

async function create(conn, { billId, amount, reference, method = "promptpay" }) {
  const [r] = await conn.query("INSERT INTO payments (bill_id, amount, reference, method) VALUES (?, ?, ?, ?)", [
    billId,
    amount,
    reference,
    method,
  ]);
  return r.insertId;
}

async function findByBill(billId) {
  const [rows] = await pool.query(
    "SELECT id, amount, reference, method, paid_at AS paidAt FROM payments WHERE bill_id = ? ORDER BY paid_at DESC",
    [billId],
  );
  return rows;
}

module.exports = { create, findByBill };
