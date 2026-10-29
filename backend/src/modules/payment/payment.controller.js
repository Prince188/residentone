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
}

module.exports = new PaymentController();
