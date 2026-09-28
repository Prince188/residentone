const express = require("express");
const router = express.Router();
const referralController = require("./referral.controller");
const { authenticate, requirePlatformAdmin } = require("../../middlewares/auth.middleware");

// Public / User route: Validate code
router.post("/validate", (req, res, next) => {
  // Optional auth: if token provided, attach user
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authenticate(req, res, () => {
      req.user = { _id: req.userId };
      referralController.validateCode(req, res, next);
    });
  }
  referralController.validateCode(req, res, next);
});

// Authenticated user: Get my referral code and referral stats
router.get("/my-code", authenticate, (req, res, next) => {
  req.user = { _id: req.userId };
  referralController.getMyReferrals(req, res, next);
});

// Super Admin routes
router.get("/admin/all", authenticate, requirePlatformAdmin, referralController.getAllReferralsAdmin);
router.patch("/admin/:id/dispatch-gift", authenticate, requirePlatformAdmin, referralController.dispatchGiftAdmin);
router.get("/admin/settings", authenticate, requirePlatformAdmin, referralController.getSettings);
router.put("/admin/settings", authenticate, requirePlatformAdmin, referralController.updateSettings);

module.exports = router;
