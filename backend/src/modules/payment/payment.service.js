const { MaintenancePayment, MaintenanceCycle } = require("../maintenance/maintenance.model");
const { CollectionUnitPayment, Collection } = require("../collections/collection.model");
const { Society } = require("../society/society.model");
const logger = require("../../config/logger");
const socketHelper = require("../../socket");

class PaymentService {
  /**
   * Process a verified Cashfree Webhook event
   */
  async processCashfreeWebhook(eventData) {
    const { type, data } = eventData || {};
    logger.info(`Received Cashfree webhook: type=${type}`);

    if (type !== "PAYMENT_SUCCESS_WEBHOOK" && type !== "ORDER_PAID") {
      logger.info(`Ignoring non-success Cashfree event: ${type}`);
      return { handled: false, reason: "event_ignored" };
    }

    const order = data?.order;
    const payment = data?.payment;
    const orderId = order?.order_id;
    const cfPaymentId = payment?.cf_payment_id ? String(payment.cf_payment_id) : null;

    if (!orderId) {
      logger.warn("Cashfree webhook missing order_id");
      return { handled: false, reason: "missing_order_id" };
    }

    // 1. Check if order matches a Maintenance payment
    const maintPayment = await MaintenancePayment.findOne({
      $or: [
        { cfOrderId: orderId },
        { razorpayOrderId: orderId },
      ],
    });

    if (maintPayment) {
      if (maintPayment.gatewayStatus === "paid") {
        logger.info(`Maintenance payment already marked paid for order ${orderId}`);
        return { handled: true, type: "maintenance", alreadyPaid: true };
      }

      const cycle = await MaintenanceCycle.findById(maintPayment.cycleId).lean();
      const year = cycle?.year || new Date().getFullYear();
      const month = String(cycle?.month || new Date().getMonth() + 1).padStart(2, "0");
      const unitSuffix = String(maintPayment.unitId).slice(-4).toUpperCase();
      const receiptNo = `RCPT-${year}${month}-${unitSuffix}`;

      maintPayment.gatewayStatus = "paid";
      maintPayment.paymentGateway = "cashfree";
      maintPayment.cashfreePaymentId = cfPaymentId;
      maintPayment.method = "Cashfree (Online)";
      maintPayment.paidOn = payment?.payment_time ? new Date(payment.payment_time) : new Date();
      maintPayment.receiptNo = maintPayment.receiptNo || receiptNo;
      maintPayment.isActive = true;
      await maintPayment.save();

      logger.info(`Maintenance payment marked paid via Cashfree webhook: ${maintPayment._id}`);

      // Realtime notification
      try {
        socketHelper.emitToSociety(String(maintPayment.societyId), "maintenance:payment_success", {
          paymentId: maintPayment._id,
          unitId: maintPayment.unitId,
          cycleId: maintPayment.cycleId,
          amount: maintPayment.totalAmount,
        });
      } catch (_) {}

      return { handled: true, type: "maintenance", paymentId: maintPayment._id };
    }

    // 2. Check if order matches a Collection unit payment
    const colPayment = await CollectionUnitPayment.findOne({
      $or: [
        { cfOrderId: orderId },
        { razorpayOrderId: orderId },
      ],
    });

    if (colPayment) {
      if (colPayment.gatewayStatus === "paid") {
        return { handled: true, type: "collection", alreadyPaid: true };
      }

      colPayment.gatewayStatus = "paid";
      colPayment.paymentGateway = "cashfree";
      colPayment.cashfreePaymentId = cfPaymentId;
      colPayment.method = "Cashfree (Online)";
      colPayment.paidOn = payment?.payment_time ? new Date(payment.payment_time) : new Date();
      colPayment.receiptNo = colPayment.receiptNo || `COL-${String(colPayment.unitId).slice(-4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      await colPayment.save();

      logger.info(`Collection payment marked paid via Cashfree webhook: ${colPayment._id}`);

      return { handled: true, type: "collection", paymentId: colPayment._id };
    }

    logger.warn(`No pending payment found matching Cashfree orderId ${orderId}`);
    return { handled: false, reason: "order_not_found" };
  }
}

module.exports = new PaymentService();
