const express = require("express");
const router = express.Router();
const couponController = require("./coupon.controller");
const { authenticate, requirePlatformAdmin } = require("../../middlewares/auth.middleware");

// Public validation endpoint for society checkout
router.post("/validate", couponController.validate);

// Super Admin management endpoints
router.get("/admin", authenticate, requirePlatformAdmin, couponController.listAll);
router.post("/admin", authenticate, requirePlatformAdmin, couponController.create);
router.patch("/admin/:id", authenticate, requirePlatformAdmin, couponController.update);
router.delete("/admin/:id", authenticate, requirePlatformAdmin, couponController.remove);

module.exports = router;
