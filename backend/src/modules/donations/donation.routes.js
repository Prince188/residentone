const express = require("express");
const donationController = require("./donation.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createDonationSchema } = require("./donation.validation");
const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// My donations — any society member can view own house donations
router.get("/my", (req, res, next) => donationController.listMy(req, res, next));

// Admin list — requires collect_donations (or society_admin)
router.get("/", requirePermission("collect_donations"), (req, res, next) => donationController.list(req, res, next));

// Receipt — owner of house or admin can view
router.get("/:id/receipt", (req, res, next) => donationController.getReceipt(req, res, next));

// Create — requires collect_donations
router.post("/", requirePermission("collect_donations"), validate(createDonationSchema), (req, res, next) => donationController.create(req, res, next));

module.exports = router;
