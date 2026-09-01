const express = require("express");
const collectionController = require("./collection.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createCollectionSchema, payCollectionSchema } = require("./collection.validation");
const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// All members can list and view collections
router.get("/", (req, res, next) => collectionController.list(req, res, next));
router.get("/:id/export", requirePermission("manage_collections"), (req, res, next) => collectionController.exportExcel(req, res, next));
router.get("/:id", (req, res, next) => collectionController.getById(req, res, next));

// Admin view: all units for a collection
router.get("/:id/units", requirePermission("manage_collections"), (req, res, next) => collectionController.getUnits(req, res, next));

// Unit detail (admin or assigned member)
router.get("/:collectionId/units/:unitId", (req, res, next) => collectionController.getUnitDetail(req, res, next));

// Create collection - permission based (manage_collections) or fallback manage_maintenance for treasurer
router.post("/", requirePermission("manage_collections"), validate(createCollectionSchema), (req, res, next) => collectionController.create(req, res, next));

// Update / close / delete
router.patch("/:id", requirePermission("manage_collections"), (req, res, next) => collectionController.update(req, res, next));
router.post("/:id/close", requirePermission("manage_collections"), (req, res, next) => collectionController.close(req, res, next));
router.delete("/:id", requirePermission("manage_collections"), (req, res, next) => collectionController.remove(req, res, next));

// Payments: admin cash record / remove
router.post("/:collectionId/units/:unitId/pay", requirePermission("manage_collections"), validate(payCollectionSchema), (req, res, next) => collectionController.recordPayment(req, res, next));
router.post("/:collectionId/units/:unitId/unpay", requirePermission("manage_collections"), (req, res, next) => collectionController.removePayment(req, res, next));

// Razorpay for resident (any member can pay own unit; check inside service)
router.post("/:collectionId/units/:unitId/create-order", (req, res, next) => collectionController.createOrder(req, res, next));
router.post("/:collectionId/units/:unitId/verify", (req, res, next) => collectionController.verifyPayment(req, res, next));

module.exports = router;
