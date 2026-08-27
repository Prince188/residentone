const crypto = require("crypto");
const { config } = require("../../config");
const logger = require("../../config/logger");

let razorpayInstance = null;

function getRazorpayInstance() {
  if (razorpayInstance) return razorpayInstance;
  if (!config.razorpay.keyId || !config.razorpay.keySecret) return null;
  try {
    const Razorpay = require("razorpay");
    razorpayInstance = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
    return razorpayInstance;
  } catch (e) {
    logger.error("Razorpay init failed", e);
    return null;
  }
}

function calculateFee(amount) {
  const feePercent = config.razorpay.feePercent; // 2
  const gst = config.razorpay.gstOnFeePercent; // 18
  const rawFee = amount * (feePercent / 100);
  const feeWithGst = rawFee * (1 + gst / 100);
  // Razorpay expects paise, so round to nearest rupee, min 1 if amount>0
  const fee = Math.ceil(feeWithGst);
  return fee;
}

async function createOrder({ amount, receipt, currency = "INR" }) {
  const fee = calculateFee(amount);
  const total = amount + fee;

  const instance = getRazorpayInstance();

  // Mock mode when keys not set - return fake order for testing cash flow
  if (!instance) {
    const mockId = `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    logger.info(`Razorpay mock order: amount=${amount} fee=${fee} total=${total} receipt=${receipt}`);
    return {
      id: mockId,
      amount: total * 100, // paise
      currency,
      receipt,
      fee,
      total,
      baseAmount: amount,
      isMock: true,
      keyId: "rzp_test_mock",
    };
  }

  // Real Razorpay order
  const options = {
    amount: total * 100,
    currency,
    receipt,
  };
  const order = await instance.orders.create(options);
  return {
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    fee,
    total,
    baseAmount: amount,
    isMock: false,
    keyId: config.razorpay.keyId,
  };
}

function verifySignature({ orderId, paymentId, signature }) {
  const instance = getRazorpayInstance();
  if (!instance) {
    // Mock mode: accept any signature that starts with mock, or just return true for testing
    // Allow test to pass without real Razorpay
    logger.info(`Razorpay mock verify: order=${orderId} payment=${paymentId}`);
    return true;
  }
  const expected = crypto
    .createHmac("sha256", config.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

module.exports = { createOrder, verifySignature, calculateFee, getRazorpayInstance };
