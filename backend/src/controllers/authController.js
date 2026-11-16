const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const HttpError = require("../utils/httpError");
const { COOKIE_NAME, signToken } = require("../middleware/auth");

const COOKIE_OPTIONS = {
  httpOnly: true, // JavaScript ฝั่งเบราว์เซอร์อ่าน cookie นี้ไม่ได้ (กัน XSS ขโมย token)
  sameSite: "lax",
  secure: process.env.COOKIE_SECURE === "true", // ตั้งเป็น true เมื่อใช้ HTTPS
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /api/auth/login
async function login(req, res) {
  const { username, password } = req.body ?? {};
  if (!username || !password) throw new HttpError(400, "กรอกชื่อผู้ใช้และรหัสผ่าน");

  const user = await userModel.findByUsername(String(username).trim());
  if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
    throw new HttpError(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
}

// POST /api/auth/logout
function logout(_req, res) {
  res.clearCookie(COOKIE_NAME);
  res.json({ message: "ออกจากระบบแล้ว" });
}

// GET /api/auth/me
async function me(req, res) {
  const user = await userModel.findById(req.user.id);
  if (!user) throw new HttpError(401, "ไม่พบผู้ใช้");
  res.json({ user });
}

module.exports = { login, logout, me };
