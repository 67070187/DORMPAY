const router = require("express").Router();
const meters = require("../controllers/meterController");

router.get("/", meters.list);
router.post("/", meters.save);

module.exports = router;
