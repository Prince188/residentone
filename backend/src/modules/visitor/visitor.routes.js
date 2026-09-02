const express = require("express");
const visitorController = require("./visitor.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const {
  resolveSocietyContext,
} = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const {
  preApproveVisitorSchema,
  walkInVisitorSchema,
  verifyPasscodeSchema,
  respondApprovalSchema,
  checkOutSchema,
  queryVisitorsSchema,
  logParcelSchema,
  verifyPickupSchema,
} = require("./visitor.validation");

const router = express.Router();

// Public route for digital visitor pass preview (e.g. from WhatsApp link)
router.get("/pass/:id/public", (req, res, next) =>
  visitorController.getPublicPass(req, res, next)
);

// Protected Society Routes
router.use(authenticate, resolveSocietyContext, requireSociety);

router.get("/", validate(queryVisitorsSchema, "query"), (req, res, next) =>
  visitorController.list(req, res, next)
);

router.get("/stats", (req, res, next) =>
  visitorController.getStats(req, res, next)
);

// Parcel Hub Routes
router.get("/parcels", (req, res, next) =>
  visitorController.listParcels(req, res, next)
);

router.post("/parcels/log", validate(logParcelSchema), (req, res, next) =>
  visitorController.logParcel(req, res, next)
);

router.post("/parcels/verify-pickup", validate(verifyPickupSchema), (req, res, next) =>
  visitorController.verifyParcelPickup(req, res, next)
);

router.post("/parcels/:id/collect", (req, res, next) =>
  visitorController.collectParcel(req, res, next)
);

router.post("/pre-approve", validate(preApproveVisitorSchema), (req, res, next) =>
  visitorController.createPreApproval(req, res, next)
);

router.post("/walk-in", validate(walkInVisitorSchema), (req, res, next) =>
  visitorController.createWalkIn(req, res, next)
);

router.post("/verify-code", validate(verifyPasscodeSchema), (req, res, next) =>
  visitorController.verifyPasscode(req, res, next)
);

router.post("/:id/check-in", (req, res, next) =>
  visitorController.checkIn(req, res, next)
);

router.post("/:id/check-out", validate(checkOutSchema), (req, res, next) =>
  visitorController.checkOut(req, res, next)
);

router.post("/:id/respond", validate(respondApprovalSchema), (req, res, next) =>
  visitorController.respondApproval(req, res, next)
);

router.delete("/:id", (req, res, next) =>
  visitorController.cancelPass(req, res, next)
);

module.exports = router;
