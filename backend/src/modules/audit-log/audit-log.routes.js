const express = require("express");
const auditLogController = require("./audit-log.controller");
const { authenticate, requireSociety, requireRole } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// Only admins and committee members can view the society audit trail
router.get(
  "/",
  requireRole("super_admin", "society_admin", "committee_member", "president", "treasurer", "secretary"),
  (req, res, next) => auditLogController.list(req, res, next)
);

module.exports = router;
