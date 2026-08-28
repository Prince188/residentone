const express = require("express");
const pollController = require("./poll.controller");
const { authenticate, requireRole, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createPollSchema, votePollSchema } = require("./poll.validation");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// All members can list and view polls
router.get("/", (req, res, next) => pollController.list(req, res, next));
router.get("/:id", (req, res, next) => pollController.getById(req, res, next));

// Vote - all members
router.post("/:id/vote", validate(votePollSchema), (req, res, next) => pollController.vote(req, res, next));

// Admin only - create / close / delete
router.post(
  "/",
  requireRole("super_admin", "society_admin", "committee_member", "manager"),
  validate(createPollSchema),
  (req, res, next) => pollController.create(req, res, next)
);

router.post(
  "/:id/close",
  requireRole("super_admin", "society_admin", "committee_member", "manager"),
  (req, res, next) => pollController.close(req, res, next)
);

router.delete(
  "/:id",
  requireRole("super_admin", "society_admin"),
  (req, res, next) => pollController.remove(req, res, next)
);

module.exports = router;
