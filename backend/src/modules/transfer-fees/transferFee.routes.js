const express = require("express");
const router = express.Router();
const transferFeeController = require("./transferFee.controller");
const { protect } = require("../../middlewares/auth.middleware");
const { tenantMiddleware } = require("../../middlewares/tenant.middleware");

router.use(protect, tenantMiddleware);

router.post("/", (req, res, next) => transferFeeController.create(req, res, next));
router.get("/", (req, res, next) => transferFeeController.list(req, res, next));
router.get("/my", (req, res, next) => transferFeeController.listMy(req, res, next));
router.get("/export", (req, res, next) => transferFeeController.exportExcel(req, res, next));
router.get("/:id/receipt", (req, res, next) => transferFeeController.getReceipt(req, res, next));

module.exports = router;
