const express = require("express");
const router = express.Router();
const paymentController = require("./payment.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

// Cashfree Webhook endpoint (public with cryptographic signature verification)
router.post("/cashfree-webhook", (req, res, next) =>
  paymentController.handleCashfreeWebhook(req, res, next)
);

// Check order status
router.get("/orders/:orderId/status", authenticate, (req, res, next) =>
  paymentController.checkOrderStatus(req, res, next)
);

module.exports = router;
