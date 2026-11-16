const router = require("express").Router();
const bills = require("../controllers/billController");
const { requireRole } = require("../middleware/auth");

// ทั้ง admin และผู้เช่าเรียกได้ (controller กรองให้ผู้เช่าเห็นแค่บิลตัวเอง)
router.get("/", bills.list);
router.get("/months", requireRole("ADMIN"), bills.months);
router.get("/:id", bills.get);
router.get("/:id/promptpay", requireRole("TENANT"), bills.promptPay);
router.post("/:id/pay", requireRole("TENANT"), bills.pay);
router.delete("/:id", requireRole("ADMIN"), bills.remove);

module.exports = router;
