const express = require("express");
const noticeController = require("./notice.controller");
const { authenticate, requireRole, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createNoticeSchema } = require("./notice.validation");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// All society members can read notices
router.get("/", (req, res, next) => noticeController.list(req, res, next));

// Society admin only
router.post(
  "/",
  requireRole("super_admin", "society_admin"),
  validate(createNoticeSchema),
  (req, res, next) => noticeController.create(req, res, next)
);

module.exports = router;
