const roomModel = require("../models/roomModel");
const HttpError = require("../utils/httpError");
const { requireString, requireInt, idParam } = require("../utils/validate");

function parseRoom(body = {}) {
  return {
    number: requireString(body.number, "เลขห้อง", { max: 10 }),
    floor: requireInt(body.floor, "ชั้น", { min: 1, max: 200 }),
    rent: requireInt(body.rent, "ค่าเช่า (สตางค์)", { min: 0, max: 100_000_00 }),
  };
}

// GET /api/rooms?vacant=true
async function list(req, res) {
  res.json(await roomModel.findAll({ vacant: req.query.vacant === "true" }));
}

// GET /api/rooms/:id
async function get(req, res) {
  const room = await roomModel.findById(idParam(req));
  if (!room) throw new HttpError(404, "ไม่พบห้อง");
  res.json(room);
}

function duplicateRoom(e, number) {
  return e.code === "ER_DUP_ENTRY" ? new HttpError(409, `มีห้อง ${number} อยู่แล้ว`) : e;
}

// POST /api/rooms
async function create(req, res) {
  const room = parseRoom(req.body);
  const id = await roomModel.create(room).catch((e) => {
    throw duplicateRoom(e, room.number);
  });
  res.status(201).json(await roomModel.findById(id));
}

// PUT /api/rooms/:id
async function update(req, res) {
  const id = idParam(req);
  const room = parseRoom(req.body);
  const ok = await roomModel.update(id, room).catch((e) => {
    throw duplicateRoom(e, room.number);
  });
  if (!ok) throw new HttpError(404, "ไม่พบห้อง");
  res.json(await roomModel.findById(id));
}

// DELETE /api/rooms/:id  (soft delete ได้เฉพาะห้องว่าง)
async function remove(req, res) {
  const id = idParam(req);
  const room = await roomModel.findById(id);
  if (!room) throw new HttpError(404, "ไม่พบห้อง");
  if (room.tenantId) throw new HttpError(409, "ห้องนี้มีผู้เช่าอยู่ ลบไม่ได้");
  await roomModel.softDelete(id);
  res.status(204).end();
}

module.exports = { list, get, create, update, remove };
