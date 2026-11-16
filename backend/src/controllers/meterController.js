const meterModel = require("../models/meterModel");
const billModel = require("../models/billModel");
const roomModel = require("../models/roomModel");
const settingModel = require("../models/settingModel");
const { withTransaction } = require("../config/db");
const HttpError = require("../utils/httpError");
const { isValidMonth, currentMonth, calculateBill, dueDateFor } = require("../utils/billing");

// GET /api/meters?month=YYYY-MM
async function list(req, res) {
  const month = req.query.month || currentMonth();
  if (!isValidMonth(month)) throw new HttpError(400, "เดือนต้องอยู่ในรูปแบบ YYYY-MM");
  const rows = await meterModel.listForMonth(month);
  res.json({
    month,
    settings: await settingModel.get(),
    rooms: rows.map((r) => ({
      ...r,
      // เลข "ครั้งก่อน" = เลขที่บันทึกไว้เดือนนี้ หรือเลขล่าสุดของเดือนก่อนๆ
      waterPrev: r.waterPrev ?? r.lastWater ?? 0,
      elecPrev: r.elecPrev ?? r.lastElec ?? 0,
      prevKnown: r.waterPrev !== null || r.lastWater !== null,
    })),
  });
}

/**
 * POST /api/meters
 * body: { month, readings: [{ roomId, waterPrev, waterCurr, elecPrev, elecCurr }] }
 * บันทึกเลขมิเตอร์ + ออกบิล (หรือแก้บิลที่ยังไม่จ่าย) ทีละห้อง ห้องที่ error จะรายงานกลับใน errors
 */
async function save(req, res) {
  const { month, readings } = req.body ?? {};
  if (!isValidMonth(month)) throw new HttpError(400, "เดือนต้องอยู่ในรูปแบบ YYYY-MM");
  if (!Array.isArray(readings) || readings.length === 0) throw new HttpError(400, "ไม่มีข้อมูลมิเตอร์");

  const settings = await settingModel.get();
  const saved = [];
  const errors = [];

  for (const input of readings) {
    const reading = {
      roomId: Number(input.roomId),
      month,
      waterPrev: Number(input.waterPrev),
      waterCurr: Number(input.waterCurr),
      elecPrev: Number(input.elecPrev),
      elecCurr: Number(input.elecCurr),
    };
    try {
      const bill = await withTransaction(async (conn) => {
        const room = await roomModel.findById(reading.roomId, conn);
        if (!room) throw new HttpError(404, "ไม่พบห้อง");
        if (!room.tenantId) throw new HttpError(409, `ห้อง ${room.number}: ไม่มีผู้เช่า`);

        const existing = await billModel.findByRoomMonth(conn, room.id, month);
        if (existing?.status === "PAID") throw new HttpError(409, `ห้อง ${room.number}: บิลชำระแล้ว แก้ไขไม่ได้`);

        let calc;
        try {
          calc = calculateBill({ rent: room.rent, ...reading, waterRate: settings.waterRate, elecRate: settings.elecRate });
        } catch (e) {
          throw new HttpError(400, `ห้อง ${room.number}: ${e.message}`);
        }

        await meterModel.upsert(conn, reading);
        await billModel.upsert(conn, {
          roomId: room.id,
          tenantId: room.tenantId,
          month,
          rent: room.rent,
          waterRate: settings.waterRate,
          elecRate: settings.elecRate,
          dueDate: dueDateFor(month, settings.dueDay),
          ...calc,
        });
        return { roomId: room.id, roomNumber: room.number, total: calc.total };
      });
      saved.push(bill);
    } catch (e) {
      if (!(e instanceof HttpError)) throw e;
      errors.push({ roomId: reading.roomId, error: e.message });
    }
  }

  res.status(saved.length ? 201 : 400).json({ saved, errors });
}

module.exports = { list, save };
