const router = require("express").Router();
const rooms = require("../controllers/roomController");

// ทุก route ในไฟล์นี้ถูกครอบด้วย requireAuth + requireRole("ADMIN") ใน routes/index.js
router.get("/", rooms.list);
router.get("/:id", rooms.get);
router.post("/", rooms.create);
router.put("/:id", rooms.update);
router.delete("/:id", rooms.remove);

module.exports = router;
