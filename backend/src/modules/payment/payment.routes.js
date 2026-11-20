const express = require("express");
const router = express.Router();
const paymentController = require("./payment.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

// Cashfree Webhook endpoint (public with cryptographic signature verification)
router.all("/cashfree-webhook", (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") {
    return res.status(200).json({ status: "alive", endpoint: "cashfree-webhook" });
  }
  return paymentController.handleCashfreeWebhook(req, res, next);
});

// Render Cashfree checkout for mobile in-app browsers
router.get("/cashfree-checkout", (req, res, next) =>
  paymentController.renderCashfreeCheckout(req, res, next)
);

// Check order status
router.get("/orders/:orderId/status", authenticate, (req, res, next) =>
  paymentController.checkOrderStatus(req, res, next)
);

module.exports = router;
