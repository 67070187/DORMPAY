const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const roomModel = require("../models/roomModel");
const { withTransaction } = require("../config/db");
const HttpError = require("../utils/httpError");
const { requireString, requireInt, optionalString, idParam } = require("../utils/validate");

function parsePassword(value) {
  return requireString(value, "รหัสผ่าน", { min: 6, max: 72 });
}

// GET /api/tenants
async function list(_req, res) {
  res.json(await userModel.findTenants());
}

// GET /api/tenants/:id
async function get(req, res) {
  const tenant = await userModel.findTenantById(idParam(req));
  if (!tenant) throw new HttpError(404, "ไม่พบผู้เช่า");
  res.json(tenant);
}

// POST /api/tenants
async function create(req, res) {
  const body = req.body ?? {};
  const username = requireString(body.username, "ชื่อผู้ใช้", { min: 3, max: 30 });
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) throw new HttpError(400, "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, _ และ .");
  const data = {
    username,
    passwordHash: await bcrypt.hash(parsePassword(body.password), 10),
    name: requireString(body.name, "ชื่อ", { max: 100 }),
    phone: optionalString(body.phone, 20),
  };
  const roomId = body.roomId ? requireInt(body.roomId, "roomId", { min: 1 }) : null;

  const id = await withTransaction(async (conn) => {
    const tenantId = await userModel.createTenant(conn, data);
    if (roomId && !(await roomModel.assignTenant(conn, roomId, tenantId))) {
      throw new HttpError(409, "ห้องนี้ไม่ว่าง หรือไม่มีอยู่");
    }
    return tenantId;
  });
  res.status(201).json(await userModel.findTenantById(id));
}

// PUT /api/tenants/:id
async function update(req, res) {
  const id = idParam(req);
  const ok = await userModel.updateTenant(id, {
    name: requireString(req.body?.name, "ชื่อ", { max: 100 }),
    phone: optionalString(req.body?.phone, 20),
  });
  if (!ok) throw new HttpError(404, "ไม่พบผู้เช่า");
  res.json(await userModel.findTenantById(id));
}

// PUT /api/tenants/:id/room  { roomId: number | null }  (null = ย้ายออก)
async function assignRoom(req, res) {
  const id = idParam(req);
  if (!(await userModel.findTenantById(id))) throw new HttpError(404, "ไม่พบผู้เช่า");
  const roomId = req.body?.roomId ? requireInt(req.body.roomId, "roomId", { min: 1 }) : null;

  await withTransaction(async (conn) => {
    await roomModel.vacateByTenant(conn, id);
    if (roomId && !(await roomModel.assignTenant(conn, roomId, id))) {
      throw new HttpError(409, "ห้องนี้ไม่ว่าง หรือไม่มีอยู่");
    }
  });
  res.json(await userModel.findTenantById(id));
}

// PUT /api/tenants/:id/password
async function resetPassword(req, res) {
  const id = idParam(req);
  if (!(await userModel.findTenantById(id))) throw new HttpError(404, "ไม่พบผู้เช่า");
  await userModel.updatePassword(id, await bcrypt.hash(parsePassword(req.body?.password), 10));
  res.json({ message: "เปลี่ยนรหัสผ่านแล้ว" });
}

// DELETE /api/tenants/:id  (soft delete + ย้ายออกจากห้อง)
async function remove(req, res) {
  const id = idParam(req);
  const deleted = await withTransaction(async (conn) => {
    await roomModel.vacateByTenant(conn, id);
    return userModel.softDelete(conn, id);
  });
  if (!deleted) throw new HttpError(404, "ไม่พบผู้เช่า");
  res.status(204).end();
}

module.exports = { list, get, create, update, assignRoom, resetPassword, remove };
