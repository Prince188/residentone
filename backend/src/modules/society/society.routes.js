const express = require("express");
const societyController = require("./society.controller");
const {
  authenticate,
  requirePlatformAdmin,
  requireRole,
} = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const {
  publicRegistrationSchema,
  manualCreateSchema,
  updateSocietySchema,
  rejectSocietySchema,
  updatePermissionsSchema,
} = require("./society.validation");

const router = express.Router();

router.get(
  "/permissions",
  authenticate,
  resolveSocietyContext,
  requireRole("super_admin", "society_admin", "manager", "treasurer", "accountant", "helpdesk_manager", "auditor", "committee_member", "owner", "tenant"),
  (req, res, next) => societyController.getPermissions(req, res, next)
);
router.get(
  "/me",
  authenticate,
  resolveSocietyContext,
  (req, res, next) => societyController.getMySociety(req, res, next)
);
router.patch(
  "/me",
  authenticate,
  resolveSocietyContext,
  (req, res, next) => societyController.updateMySociety(req, res, next)
);

router.put(
  "/permissions",
  authenticate,
  resolveSocietyContext,
  requireRole("super_admin", "society_admin"),
  validate(updatePermissionsSchema),
  (req, res, next) => societyController.updatePermissions(req, res, next)
);

router.post(
  "/register",
  validate(publicRegistrationSchema),
  (req, res, next) => societyController.registerPublic(req, res, next)
);

router.get("/", authenticate, requirePlatformAdmin, (req, res, next) =>
  societyController.list(req, res, next)
);
router.get("/stats", authenticate, requirePlatformAdmin, (req, res, next) =>
  societyController.stats(req, res, next)
);
router.post(
  "/",
  authenticate,
  requirePlatformAdmin,
  validate(manualCreateSchema),
  (req, res, next) => societyController.adminCreate(req, res, next)
);

router.patch(
  "/:id/approve",
  authenticate,
  requirePlatformAdmin,
  (req, res, next) => societyController.approve(req, res, next)
);
router.patch(
  "/:id/reject",
  authenticate,
  requirePlatformAdmin,
  validate(rejectSocietySchema),
  (req, res, next) => societyController.reject(req, res, next)
);
router.patch(
  "/:id/suspend",
  authenticate,
  requirePlatformAdmin,
  (req, res, next) => societyController.suspend(req, res, next)
);
router.patch(
  "/:id/activate",
  authenticate,
  requirePlatformAdmin,
  (req, res, next) => societyController.activate(req, res, next)
);
router.patch(
  "/:id/archive",
  authenticate,
  requirePlatformAdmin,
  (req, res, next) => societyController.archive(req, res, next)
);
router.patch(
  "/:id/unarchive",
  authenticate,
  requirePlatformAdmin,
  (req, res, next) => societyController.unarchive(req, res, next)
);

router.get("/:id", authenticate, (req, res, next) =>
  societyController.getById(req, res, next)
);
router.patch(
  "/:id",
  authenticate,
  requirePlatformAdmin,
  validate(updateSocietySchema),
  (req, res, next) => societyController.update(req, res, next)
);
router.delete("/:id/permanent", authenticate, requirePlatformAdmin, (req, res, next) =>
  societyController.permanentDelete(req, res, next)
);
router.delete("/:id", authenticate, requirePlatformAdmin, (req, res, next) =>
  societyController.archive(req, res, next)
);

module.exports = router;
