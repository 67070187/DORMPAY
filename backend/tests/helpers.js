const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/config/db");
const { initDatabase } = require("../db/init");

/** รีเซ็ตฐานข้อมูลทดสอบให้กลับเป็นข้อมูลตัวอย่าง */
function resetDb() {
  return initDatabase({ database: "dormpay_test", withSeed: true });
}

/** ล็อกอินแล้วได้ agent ที่ถือ cookie ไว้ให้ใช้ต่อ */
async function loginAs(username, password) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ username, password });
  if (res.status !== 200) throw new Error(`login ${username} failed: ${res.status}`);
  return agent;
}

const asAdmin = () => loginAs("admin", "admin1234");
const asTenant = (n) => loginAs(`tenant${n}`, "tenant1234");

module.exports = { app, request, pool, resetDb, asAdmin, asTenant };
