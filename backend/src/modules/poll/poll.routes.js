const express = require("express");
const pollController = require("./poll.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createPollSchema, votePollSchema } = require("./poll.validation");
const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// All members can list and view polls
router.get("/", (req, res, next) => pollController.list(req, res, next));
router.get("/:id", (req, res, next) => pollController.getById(req, res, next));

// Vote - all members
router.post("/:id/vote", validate(votePollSchema), (req, res, next) => pollController.vote(req, res, next));

// Permission-based
router.post(
  "/",
  requirePermission("create_poll"),
  validate(createPollSchema),
  (req, res, next) => pollController.create(req, res, next)
);

router.post(
  "/:id/close",
  requirePermission("create_poll"),
  (req, res, next) => pollController.close(req, res, next)
);

router.delete(
  "/:id",
  requirePermission("create_poll"),
  (req, res, next) => pollController.remove(req, res, next)
);

module.exports = router;
