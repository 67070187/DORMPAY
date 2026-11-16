const { pool } = require("../config/db");

// Model = ส่วนที่คุยกับฐานข้อมูล (SQL ทั้งหมดของตาราง users อยู่ที่นี่)

async function findByUsername(username) {
  const [rows] = await pool.query(
    "SELECT id, username, password_hash AS passwordHash, name, role FROM users WHERE username = ? AND deleted_at IS NULL",
    [username],
  );
  return rows[0] ?? null;
}

async function findById(id) {
  const [rows] = await pool.query(
    "SELECT id, username, name, phone, role, created_at AS createdAt FROM users WHERE id = ? AND deleted_at IS NULL",
    [id],
  );
  return rows[0] ?? null;
}

/** ผู้เช่าทั้งหมด + ห้อง + ยอดค้างชำระ (LEFT JOIN + SUM/CASE + GROUP BY) */
async function findTenants() {
  const [rows] = await pool.query(`
    SELECT u.id, u.username, u.name, u.phone, u.created_at AS createdAt,
           r.id AS roomId, r.number AS roomNumber,
           COALESCE(SUM(CASE WHEN b.status = 'UNPAID' THEN b.total ELSE 0 END), 0) AS owed,
           COUNT(CASE WHEN b.status = 'UNPAID' THEN 1 END) AS unpaidCount
    FROM users u
    LEFT JOIN rooms r ON r.tenant_id = u.id AND r.deleted_at IS NULL
    LEFT JOIN bills b ON b.tenant_id = u.id
    WHERE u.role = 'TENANT' AND u.deleted_at IS NULL
    GROUP BY u.id, r.id
    ORDER BY u.id`);
  return rows.map((r) => ({ ...r, owed: Number(r.owed) }));
}

async function findTenantById(id) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.name, u.phone, r.id AS roomId, r.number AS roomNumber, r.rent AS roomRent
     FROM users u LEFT JOIN rooms r ON r.tenant_id = u.id AND r.deleted_at IS NULL
     WHERE u.id = ? AND u.role = 'TENANT' AND u.deleted_at IS NULL`,
    [id],
  );
  return rows[0] ?? null;
}

async function createTenant(conn, { username, passwordHash, name, phone }) {
  const [r] = await conn.query(
    "INSERT INTO users (username, password_hash, name, phone, role) VALUES (?, ?, ?, ?, 'TENANT')",
    [username, passwordHash, name, phone ?? null],
  );
  return r.insertId;
}

async function updateTenant(id, { name, phone }) {
  const [r] = await pool.query(
    "UPDATE users SET name = ?, phone = ? WHERE id = ? AND role = 'TENANT' AND deleted_at IS NULL",
    [name, phone ?? null, id],
  );
  return r.affectedRows > 0;
}

async function updatePassword(id, passwordHash) {
  const [r] = await pool.query("UPDATE users SET password_hash = ? WHERE id = ? AND deleted_at IS NULL", [passwordHash, id]);
  return r.affectedRows > 0;
}

/** Soft delete: ไม่ลบแถวจริง แค่ใส่เวลาใน deleted_at (บิลเก่ายังอ้างอิงได้) */
async function softDelete(conn, id) {
  const [r] = await conn.query(
    "UPDATE users SET deleted_at = NOW() WHERE id = ? AND role = 'TENANT' AND deleted_at IS NULL",
    [id],
  );
  return r.affectedRows > 0;
}

module.exports = { findByUsername, findById, findTenants, findTenantById, createTenant, updateTenant, updatePassword, softDelete };
