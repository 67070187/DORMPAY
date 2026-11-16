const HttpError = require("../utils/httpError");

function notFound(req, _res, next) {
  next(new HttpError(404, `ไม่พบ ${req.method} ${req.originalUrl}`));
}

/** Middleware จัดการ error ทุกตัว ตอบกลับเป็น JSON { error } */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || "เกิดข้อผิดพลาด";

  if (err instanceof RangeError) status = 400; // validation จาก utils
  if (err.code === "ER_DUP_ENTRY") {
    status = 409;
    message = "ข้อมูลซ้ำกับที่มีอยู่แล้ว";
  }
  if (err.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
    status = 400;
    message = "ข้อมูลไม่ผ่านเงื่อนไขของฐานข้อมูล";
  }
  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "รูปแบบ JSON ไม่ถูกต้อง";
  }
  if (status >= 500) {
    console.error(err);
    if (!(err instanceof HttpError)) message = "เกิดข้อผิดพลาดภายในระบบ";
  }
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
