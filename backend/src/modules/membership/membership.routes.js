const express = require("express");
const membershipController = require("./membership.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { addMemberSchema, updateRoleSchema } = require("./membership.validation");
const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router({ mergeParams: true });

router.get("/my-societies", authenticate, (req, res, next) =>
  membershipController.mySocieties(req, res, next)
);

router.get(
  "/directory",
  authenticate,
  resolveSocietyContext,
  requireSociety,
  (req, res, next) => membershipController.directory(req, res, next)
);

router.get(
  "/",
  authenticate,
  resolveSocietyContext,
  requireSociety,
  requirePermission("manage_committee"),
  (req, res, next) => membershipController.list(req, res, next)
);
router.post(
  "/",
  authenticate,
  resolveSocietyContext,
  requireSociety,
  requirePermission("manage_committee"),
  validate(addMemberSchema),
  (req, res, next) => membershipController.addMember(req, res, next)
);
router.patch(
  "/:memberId",
  authenticate,
  resolveSocietyContext,
  requireSociety,
  requirePermission("manage_committee"),
  validate(updateRoleSchema),
  (req, res, next) => membershipController.updateRole(req, res, next)
);
router.delete(
  "/:memberId",
  authenticate,
  resolveSocietyContext,
  requireSociety,
  requirePermission("manage_committee"),
  (req, res, next) => membershipController.removeMember(req, res, next)
);

module.exports = router;
