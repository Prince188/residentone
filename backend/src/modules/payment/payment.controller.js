const paymentService = require("./payment.service");
const cashfreeService = require("../../shared/services/cashfree.service");
const logger = require("../../config/logger");

class PaymentController {
  /**
   * Cashfree Webhook Handler
   */
  async handleCashfreeWebhook(req, res, next) {
    try {
      // Allow Cashfree dashboard test pings (which lack live production signatures) to succeed with 200 OK
      const isTestPing =
        !req.headers["x-webhook-signature"] ||
        req.body?.type === "TEST_WEBHOOK" ||
        req.body?.event === "TEST" ||
        req.body?.data?.test;

      if (isTestPing) {
        return res.status(200).json({ success: true, message: "Cashfree test webhook verified" });
      }

      // 1. Verify HMAC-SHA256 signature
      const isValid = cashfreeService.verifyWebhookSignature(req);
      if (!isValid) {
        logger.warn("Rejected unauthorized Cashfree webhook signature");
        return res.status(401).json({ success: false, message: "Invalid signature" });
      }

      // 2. Process event
      const result = await paymentService.processCashfreeWebhook(req.body);
      return res.status(200).json({ success: true, result });
    } catch (error) {
      logger.error("Error processing Cashfree webhook:", error);
      // Return 200 to acknowledge webhook so Cashfree does not repeatedly retry on application error
      return res.status(200).json({ success: false, error: error.message });
    }
  }

  /**
   * Check order status from Cashfree
   */
  async checkOrderStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const order = await cashfreeService.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found on Cashfree" });
      }
      return res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Render HTML form redirect for Mobile in-app browser checkout (v3 API)
   */
  renderCashfreeCheckout(req, res) {
    const sessionId = req.query.sessionId || req.query.session_id;
    const env = req.query.env || "sandbox";

    if (!sessionId) {
      return res.status(400).send("<h3>Missing payment session ID</h3>");
    }

    const targetUrl =
      env === "production"
        ? "https://api.cashfree.com/pg/view/sessions/checkout"
        : "https://sandbox.cashfree.com/pg/view/sessions/checkout";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ResidentOne - Secure Checkout</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .card {
      text-align: center;
      padding: 32px 24px;
      max-width: 380px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3.5px solid #e2e8f0;
      border-top-color: #006948;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 18px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .title {
      color: #0f172a;
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .desc {
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
    }
  </style>
</head>
<body onload="document.getElementById('cf_form').submit()">
  <form id="cf_form" method="POST" action="${targetUrl}">
    <input type="hidden" name="payment_session_id" value="${sessionId}">
  </form>
  <div class="card">
    <div class="spinner"></div>
    <div class="title">Securing Payment Gateway...</div>
    <div class="desc">Connecting you to Cashfree checkout. Please wait a moment.</div>
  </div>
</body>
</html>`;

    res.removeHeader("Content-Security-Policy");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  }
}

module.exports = new PaymentController();
