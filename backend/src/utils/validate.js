const HttpError = require("./httpError");

function requireString(value, label, { min = 1, max = 255 } = {}) {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length < min || s.length > max) throw new HttpError(400, `${label}ต้องยาว ${min}-${max} ตัวอักษร`);
  return s;
}

function requireInt(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(value);
  if (value === "" || value === null || value === undefined || !Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `${label}ต้องเป็นจำนวนเต็ม ${min}-${max}`);
  }
  return n;
}

function optionalString(value, max = 255) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (s.length > max) throw new HttpError(400, `ข้อความยาวเกิน ${max} ตัวอักษร`);
  return s || null;
}

function idParam(req) {
  return requireInt(req.params.id, "id", { min: 1 });
}

module.exports = { requireString, requireInt, optionalString, idParam };
