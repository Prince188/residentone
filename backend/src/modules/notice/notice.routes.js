const express = require("express");
const noticeController = require("./notice.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createNoticeSchema } = require("./notice.validation");
const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// All society members can read notices
router.get("/", (req, res, next) => noticeController.list(req, res, next));

// Permission-based: society_admin always allowed, others per rolePermissions
router.post(
  "/",
  requirePermission("create_notice"),
  validate(createNoticeSchema),
  (req, res, next) => noticeController.create(req, res, next)
);

module.exports = router;
