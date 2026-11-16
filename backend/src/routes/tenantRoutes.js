const router = require("express").Router();
const tenants = require("../controllers/tenantController");

router.get("/", tenants.list);
router.get("/:id", tenants.get);
router.post("/", tenants.create);
router.put("/:id", tenants.update);
router.put("/:id/room", tenants.assignRoom);
router.put("/:id/password", tenants.resetPassword);
router.delete("/:id", tenants.remove);

module.exports = router;
