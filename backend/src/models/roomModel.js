const { pool } = require("../config/db");

const SELECT_ROOM = `
  SELECT r.id, r.number, r.floor, r.rent, r.tenant_id AS tenantId, u.name AS tenantName
  FROM rooms r
  LEFT JOIN users u ON u.id = r.tenant_id`;

async function findAll({ vacant } = {}) {
  let sql = `${SELECT_ROOM} WHERE r.deleted_at IS NULL`;
  if (vacant === true) sql += " AND r.tenant_id IS NULL";
  const [rows] = await pool.query(`${sql} ORDER BY r.number`);
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(`${SELECT_ROOM} WHERE r.id = ? AND r.deleted_at IS NULL`, [id]);
  return rows[0] ?? null;
}

async function create({ number, floor, rent }) {
  const [r] = await pool.query("INSERT INTO rooms (number, floor, rent) VALUES (?, ?, ?)", [number, floor, rent]);
  return r.insertId;
}

async function update(id, { number, floor, rent }) {
  const [r] = await pool.query(
    "UPDATE rooms SET number = ?, floor = ?, rent = ? WHERE id = ? AND deleted_at IS NULL",
    [number, floor, rent, id],
  );
  return r.affectedRows > 0;
}

/** Soft delete เฉพาะห้องว่าง */
async function softDelete(id) {
  const [r] = await pool.query(
    "UPDATE rooms SET deleted_at = NOW() WHERE id = ? AND tenant_id IS NULL AND deleted_at IS NULL",
    [id],
  );
  return r.affectedRows > 0;
}

/** ให้ผู้เช่าออกจากห้องที่อยู่ (ถ้ามี) */
async function vacateByTenant(conn, tenantId) {
  await conn.query("UPDATE rooms SET tenant_id = NULL WHERE tenant_id = ?", [tenantId]);
}

/** ใส่ผู้เช่าเข้าห้อง (สำเร็จเฉพาะห้องที่ว่างอยู่) */
async function assignTenant(conn, roomId, tenantId) {
  const [r] = await conn.query(
    "UPDATE rooms SET tenant_id = ? WHERE id = ? AND tenant_id IS NULL AND deleted_at IS NULL",
    [tenantId, roomId],
  );
  return r.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, softDelete, vacateByTenant, assignTenant };
