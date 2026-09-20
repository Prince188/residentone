const express = require("express");
const router = express.Router();
const transferFeeController = require("./transferFee.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { requirePermission } = require("../../middlewares/permission.middleware");

router.use(authenticate, resolveSocietyContext, requireSociety);

// My transfer fees — any society member can view own house transfer fees
router.get("/my", (req, res, next) => transferFeeController.listMy(req, res, next));

// Export Excel report
router.get("/export", (req, res, next) => transferFeeController.exportExcel(req, res, next));

// Receipt
router.get("/:id/receipt", (req, res, next) => transferFeeController.getReceipt(req, res, next));

// Admin list — list all transfer fee records in society
router.get("/", (req, res, next) => transferFeeController.list(req, res, next));

// Create transfer fee record
router.post("/", (req, res, next) => transferFeeController.create(req, res, next));

module.exports = router;
