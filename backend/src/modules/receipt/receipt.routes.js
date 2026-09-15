const express = require("express");
const receiptController = require("./receipt.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

const router = express.Router();

// Global receipt verification — requires auth but NO society context (allows super_admin global verify)
// Frontend will call with x-society-id for society_admin, and without for super_admin retry
router.get("/verify", authenticate, (req, res, next) => receiptController.verify(req, res, next));

module.exports = router;
