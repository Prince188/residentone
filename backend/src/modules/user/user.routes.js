const express = require("express");
const userController = require("./user.controller");
const { authenticate, requirePlatformAdmin } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { updateProfileSchema, changePasswordSchema } = require("./user.validation");

const router = express.Router();

router.get("/profile", authenticate, (req, res, next) => userController.getProfile(req, res, next));
router.patch(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  (req, res, next) => userController.updateProfile(req, res, next)
);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  (req, res, next) => userController.changePassword(req, res, next)
);
router.post(
  "/push-token",
  authenticate,
  (req, res, next) => userController.updatePushToken(req, res, next)
);

// Super Admin User Management Routes
router.get("/admin/all", authenticate, requirePlatformAdmin, (req, res, next) =>
  userController.adminListUsers(req, res, next)
);
router.patch("/admin/:id", authenticate, requirePlatformAdmin, (req, res, next) =>
  userController.adminUpdateUser(req, res, next)
);
router.patch("/admin/:id/freeze", authenticate, requirePlatformAdmin, (req, res, next) =>
  userController.adminFreezeUser(req, res, next)
);
router.delete("/admin/:id", authenticate, requirePlatformAdmin, (req, res, next) =>
  userController.adminDeleteUser(req, res, next)
);

module.exports = router;
