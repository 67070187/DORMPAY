const jwt = require("jsonwebtoken");
const HttpError = require("../utils/httpError");

const COOKIE_NAME = "token";

/** อ่าน JWT จาก cookie "token" หรือ header "Authorization: Bearer <token>" */
function readToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

/** Middleware: ต้องล็อกอินก่อน ถ้าผ่านจะได้ req.user = { id, role, name } */
function requireAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next(new HttpError(401, "กรุณาเข้าสู่ระบบ"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: Number(payload.sub), role: payload.role, name: payload.name };
    next();
  } catch {
    next(new HttpError(401, "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่"));
  }
}

/** Middleware: จำกัดสิทธิ์ตามบทบาท เช่น requireRole("ADMIN") */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "กรุณาเข้าสู่ระบบ"));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "ไม่มีสิทธิ์เข้าถึง"));
    next();
  };
}

function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

module.exports = { COOKIE_NAME, requireAuth, requireRole, signToken, readToken };
