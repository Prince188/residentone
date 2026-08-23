const express = require("express");
const unitController = require("./unit.controller");
const { authenticate, requireRole, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const {
  checkOwnerSchema,
  assignOwnerSchema,
  inviteSubmitSchema,
} = require("./unit.validation");

const router = express.Router();

// Public: owner self-registration via share link
router.get("/invite/:token", (req, res, next) =>
  unitController.getInvitePreview(req, res, next)
);
router.post(
  "/invite/:token",
  validate(inviteSubmitSchema),
  (req, res, next) => unitController.submitInvite(req, res, next)
);

// Society admin only
router.use(authenticate, resolveSocietyContext, requireSociety);

router.get(
  "/",
  requireRole("super_admin", "society_admin"),
  (req, res, next) => unitController.list(req, res, next)
);
router.get(
  "/:unitId",
  requireRole("super_admin", "society_admin"),
  (req, res, next) => unitController.getById(req, res, next)
);
router.post(
  "/:unitId/check-owner",
  requireRole("super_admin", "society_admin"),
  validate(checkOwnerSchema),
  (req, res, next) => unitController.checkOwner(req, res, next)
);
router.post(
  "/:unitId/assign-owner",
  requireRole("super_admin", "society_admin"),
  validate(assignOwnerSchema),
  (req, res, next) => unitController.assignOwner(req, res, next)
);
router.post(
  "/:unitId/unassign-owner",
  requireRole("super_admin", "society_admin"),
  (req, res, next) => unitController.unassignOwner(req, res, next)
);
router.post(
  "/:unitId/invite-link",
  requireRole("super_admin", "society_admin"),
  (req, res, next) => unitController.createInviteLink(req, res, next)
);

module.exports = router;
