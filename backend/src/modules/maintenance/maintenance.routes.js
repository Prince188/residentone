const express = require("express");
const maintenanceController = require("./maintenance.controller");
const { authenticate, requireRole, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createCycleSchema, paySchema } = require("./maintenance.validation");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// Latest cycle + my units (dashboard alert / resident view) — all members
router.get("/cycles/latest", (req, res, next) =>
  maintenanceController.getLatestCycle(req, res, next)
);

// All cycles — all members
router.get("/cycles", (req, res, next) =>
  maintenanceController.listCycles(req, res, next)
);

// Unit payment history across cycles — admin or assigned member
router.get("/units/:unitId/history", (req, res, next) =>
  maintenanceController.getUnitHistory(req, res, next)
);

// Society admin only
router.post(
  "/cycles",
  requireRole("super_admin", "society_admin"),
  validate(createCycleSchema),
  (req, res, next) => maintenanceController.createCycle(req, res, next)
);
router.get(
  "/cycles/:cycleId/units",
  requireRole("super_admin", "society_admin"),
  (req, res, next) => maintenanceController.getCycleUnits(req, res, next)
);
router.post(
  "/cycles/:cycleId/units/:unitId/pay",
  requireRole("super_admin", "society_admin"),
  validate(paySchema),
  (req, res, next) => maintenanceController.recordPayment(req, res, next)
);
router.post(
  "/cycles/:cycleId/units/:unitId/unpay",
  requireRole("super_admin", "society_admin"),
  (req, res, next) => maintenanceController.removePayment(req, res, next)
);

// Razorpay online payment (resident or admin) - both can pay
router.post("/cycles/:cycleId/units/:unitId/create-order", (req, res, next) =>
  maintenanceController.createRazorpayOrder(req, res, next)
);
router.post("/cycles/:cycleId/units/:unitId/verify", (req, res, next) =>
  maintenanceController.verifyRazorpayPayment(req, res, next)
);
router.get("/cycles/:cycleId/units/:unitId/receipt", (req, res, next) =>
  maintenanceController.getReceipt(req, res, next)
);

// Unit record within a cycle — admin or assigned member
router.get("/cycles/:cycleId/units/:unitId", (req, res, next) =>
  maintenanceController.getCycleUnitDetail(req, res, next)
);

module.exports = router;
