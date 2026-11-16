const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "dormpay",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "UTF8MB4_UNICODE_CI",
});

/** รันหลายคำสั่งใน transaction เดียว ถ้า error จะ rollback ทั้งหมด */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction };
