const userModel = require("../models/userModel");
const billModel = require("../models/billModel");
const HttpError = require("../utils/httpError");

// GET /api/me  (ผู้เช่า) ข้อมูลตัวเอง ห้อง และบิลทั้งหมด
async function summary(req, res) {
  const tenant = await userModel.findTenantById(req.user.id);
  if (!tenant) throw new HttpError(404, "ไม่พบผู้เช่า");
  const bills = await billModel.findAll({ tenantId: req.user.id });
  const unpaid = bills.filter((b) => b.status === "UNPAID");
  res.json({
    tenant,
    owed: unpaid.reduce((s, b) => s + b.total, 0),
    unpaidCount: unpaid.length,
    paidCount: bills.length - unpaid.length,
    bills,
  });
}

module.exports = { summary };
