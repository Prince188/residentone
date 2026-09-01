const express = require("express");
const noticeController = require("./notice.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createNoticeSchema, updateNoticeSchema } = require("./notice.validation");
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

router.patch(
  "/:id",
  requirePermission("create_notice"),
  validate(updateNoticeSchema),
  (req, res, next) => noticeController.update(req, res, next)
);

router.delete(
  "/:id",
  requirePermission("create_notice"),
  (req, res, next) => noticeController.remove(req, res, next)
);

module.exports = router;
