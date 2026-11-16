const router = require("express").Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const dashboard = require("../controllers/dashboardController");
const settings = require("../controllers/settingController");
const me = require("../controllers/meController");

const adminOnly = [requireAuth, requireRole("ADMIN")];

router.get("/health", (_req, res) => res.json({ status: "ok" }));

router.use("/auth", require("./authRoutes"));
router.use("/rooms", adminOnly, require("./roomRoutes"));
router.use("/tenants", adminOnly, require("./tenantRoutes"));
router.use("/meters", adminOnly, require("./meterRoutes"));
router.use("/bills", requireAuth, require("./billRoutes"));

router.get("/dashboard", adminOnly, dashboard.summary);
router.get("/settings", adminOnly, settings.get);
router.put("/settings", adminOnly, settings.update);
router.get("/me", requireAuth, requireRole("TENANT"), me.summary);

module.exports = router;
