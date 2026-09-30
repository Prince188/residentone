const express = require("express");
const userController = require("./user.controller");
const { authenticate, requirePlatformAdmin } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { updateProfileSchema, changePasswordSchema } = require("./user.validation");

const multer = require("multer");
const { AppError } = require("../../shared/utils/errors");

const router = express.Router();

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new AppError("Only image files are allowed", 400), false);
    }
  },
});

router.get("/profile", authenticate, (req, res, next) => userController.getProfile(req, res, next));
router.patch(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  (req, res, next) => userController.updateProfile(req, res, next)
);
router.post(
  "/avatar",
  authenticate,
  memoryUpload.single("image"),
  (req, res, next) => userController.uploadAvatar(req, res, next)
);
router.post(
  "/upload-avatar",
  authenticate,
  memoryUpload.single("image"),
  (req, res, next) => userController.uploadAvatar(req, res, next)
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
router.delete("/delete-account", authenticate, (req, res, next) =>
  userController.deleteOwnAccount(req, res, next)
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
