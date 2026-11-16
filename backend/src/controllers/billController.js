const billModel = require("../models/billModel");
const paymentModel = require("../models/paymentModel");
const settingModel = require("../models/settingModel");
const meterModel = require("../models/meterModel");
const { withTransaction } = require("../config/db");
const HttpError = require("../utils/httpError");
const { idParam } = require("../utils/validate");
const { isValidMonth, paymentReference } = require("../utils/billing");
const { promptPayPayload, maskPromptPayId } = require("../utils/promptpay");

/** ผู้เช่าเห็นได้เฉพาะบิลของตัวเอง admin เห็นทุกบิล */
async function loadBill(req) {
  const bill = await billModel.findById(idParam(req));
  if (!bill || (req.user.role === "TENANT" && bill.tenantId !== req.user.id)) {
    throw new HttpError(404, "ไม่พบบิล");
  }
  return bill;
}

// GET /api/bills?month=&status=PAID|UNPAID|OVERDUE
async function list(req, res) {
  const { month, status } = req.query;
  if (month && !isValidMonth(month)) throw new HttpError(400, "เดือนต้องอยู่ในรูปแบบ YYYY-MM");
  const tenantId = req.user.role === "TENANT" ? req.user.id : undefined;
  res.json(await billModel.findAll({ month, status, tenantId }));
}

// GET /api/bills/months
async function months(_req, res) {
  res.json(await billModel.months());
}

// GET /api/bills/:id
async function get(req, res) {
  const bill = await loadBill(req);
  res.json({ ...bill, payments: await paymentModel.findByBill(bill.id) });
}

// GET /api/bills/:id/promptpay  → ข้อมูลสำหรับสร้าง QR
async function promptPay(req, res) {
  const bill = await loadBill(req);
  if (bill.status === "PAID") throw new HttpError(409, "บิลนี้ชำระแล้ว");
  const s = await settingModel.get();
  res.json({
    billId: bill.id,
    amount: bill.total,
    payload: promptPayPayload(s.promptPayId, bill.total),
    accountName: s.promptPayName,
    accountId: maskPromptPayId(s.promptPayId),
  });
}

/**
 * POST /api/bills/:id/pay  (ผู้เช่า, โหมดสาธิต)
 * กด "โอนเงินเสร็จสิ้น" แล้วถือว่าจ่ายแล้ว — ระบบจริงต้องตรวจยอดเงินเข้าก่อน
 */
async function pay(req, res) {
  const billId = idParam(req);
  const result = await withTransaction(async (conn) => {
    const bill = await billModel.lockForPayment(conn, billId); // SELECT ... FOR UPDATE
    if (!bill || bill.tenantId !== req.user.id) throw new HttpError(404, "ไม่พบบิล");
    if (bill.status === "PAID") throw new HttpError(409, "บิลนี้ชำระแล้ว");

    const reference = paymentReference(bill.id);
    await paymentModel.create(conn, { billId: bill.id, amount: bill.total, reference });
    await billModel.markPaid(conn, bill.id);
    return { billId: bill.id, amount: bill.total, reference };
  });
  res.status(201).json(result);
}

// DELETE /api/bills/:id  (admin, เฉพาะบิลที่ยังไม่จ่าย — ลบเลขมิเตอร์เดือนนั้นด้วย)
async function remove(req, res) {
  const bill = await loadBill(req);
  if (bill.status === "PAID") throw new HttpError(409, "บิลที่ชำระแล้วลบไม่ได้");
  await withTransaction(async (conn) => {
    await billModel.remove(conn, bill.id);
    await meterModel.remove(conn, bill.roomId, bill.month);
  });
  res.status(204).end();
}

module.exports = { list, months, get, promptPay, pay, remove };
