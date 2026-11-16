const settingModel = require("../models/settingModel");
const HttpError = require("../utils/httpError");
const { requireInt, requireString } = require("../utils/validate");
const { isValidPromptPayId } = require("../utils/promptpay");

// GET /api/settings
async function get(_req, res) {
  res.json(await settingModel.get());
}

// PUT /api/settings
async function update(req, res) {
  const body = req.body ?? {};
  const promptPayId = String(body.promptPayId ?? "").replace(/\D/g, "");
  if (!isValidPromptPayId(promptPayId)) {
    throw new HttpError(400, "หมายเลขพร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก");
  }
  res.json(
    await settingModel.update({
      waterRate: requireInt(body.waterRate, "ค่าน้ำ (สตางค์/หน่วย)", { min: 0, max: 100000 }),
      elecRate: requireInt(body.elecRate, "ค่าไฟ (สตางค์/หน่วย)", { min: 0, max: 100000 }),
      dueDay: requireInt(body.dueDay, "วันครบกำหนด", { min: 1, max: 28 }),
      promptPayId,
      promptPayName: requireString(body.promptPayName, "ชื่อบัญชี", { max: 60 }),
    }),
  );
}

module.exports = { get, update };
