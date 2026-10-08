const express = require("express");
const router = express.Router();
const appConfigController = require("./app-config.controller");
const { authenticate, requirePlatformAdmin } = require("../../middlewares/auth.middleware");

// Mobile public / app startup sync endpoint
router.get("/mobile", appConfigController.getMobileConfig);

// Super Admin endpoints (Web Dashboard only)
router.get("/admin", authenticate, requirePlatformAdmin, appConfigController.getAdminConfig);
router.patch("/launcher-icon", authenticate, requirePlatformAdmin, appConfigController.updateLauncherIcon);

module.exports = router;
