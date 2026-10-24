const express = require("express");
const sosController = require("./sos.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { triggerSOSSchema, resolveSOSSchema } = require("./sos.validation");

const router = express.Router();

// All SOS endpoints require valid user session & society context
router.use(authenticate, resolveSocietyContext, requireSociety);

// Trigger a new emergency alert
router.post("/trigger", validate(triggerSOSSchema), (req, res, next) =>
  sosController.trigger(req, res, next)
);

// Get current active SOS incident for logged-in resident
router.get("/my-active", (req, res, next) =>
  sosController.getMyActive(req, res, next)
);

// Get all active SOS alerts in society (for guards, admins, society members)
router.get("/active", (req, res, next) =>
  sosController.getActive(req, res, next)
);

// Acknowledge responding to an alert (Guard / Admin)
router.post("/:id/acknowledge", (req, res, next) =>
  sosController.acknowledge(req, res, next)
);

// Resolve an alert or mark as false alarm
router.post("/:id/resolve", validate(resolveSOSSchema), (req, res, next) =>
  sosController.resolve(req, res, next)
);

// History log for audits
router.get("/history", (req, res, next) =>
  sosController.getHistory(req, res, next)
);

module.exports = router;
