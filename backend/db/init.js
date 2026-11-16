/**
 * สร้างตารางจาก schema.sql (และใส่ข้อมูลตัวอย่างถ้าใส่ --seed)
 *   node db/init.js            สร้างตารางใหม่ (ลบของเดิม)
 *   node db/init.js --seed     สร้างตาราง + ข้อมูลตัวอย่าง
 *   node db/init.js --seed --if-empty   ทำเฉพาะตอนยังไม่มีตาราง (ใช้ตอนรันใน Docker)
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });
const { seed } = require("./seed");

async function initDatabase({ database = process.env.DB_NAME || "dormpay", withSeed = false, ifEmpty = false } = {}) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
    charset: "UTF8MB4_UNICODE_CI",
  });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`ALTER DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${database}\``);

    if (ifEmpty) {
      const [rows] = await conn.query("SHOW TABLES LIKE 'users'");
      if (rows.length) return "skipped";
    }

    await conn.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
    if (withSeed) await seed(conn);
    return withSeed ? "seeded" : "created";
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  initDatabase({ withSeed: args.includes("--seed"), ifEmpty: args.includes("--if-empty") })
    .then((r) => {
      const msg = { skipped: "มีตารางอยู่แล้ว ข้าม", created: "สร้างตารางแล้ว", seeded: "สร้างตาราง + ข้อมูลตัวอย่างแล้ว: admin/admin1234, tenant1..tenant7 / tenant1234" };
      console.log(msg[r]);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { initDatabase };
