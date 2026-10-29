const crypto = require("crypto");
const { config } = require("../../config");
const logger = require("../../config/logger");

function calculateFee(amount) {
  const feePercent = config.cashfree.feePercent || 2;
  const gst = config.cashfree.gstOnFeePercent || 18;
  const rawFee = amount * (feePercent / 100);
  const feeWithGst = rawFee * (1 + gst / 100);
  return Math.ceil(feeWithGst);
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-version": config.cashfree.apiVersion || "2023-08-01",
    "x-client-id": config.cashfree.appId,
    "x-client-secret": config.cashfree.secretKey,
  };
}

function isCashfreeConfigured() {
  return Boolean(config.cashfree.appId && config.cashfree.secretKey);
}

/**
 * Register or update a Society as an Easy Split Vendor on Cashfree
 */
async function createOrUpdateVendor(society) {
  if (!isCashfreeConfigured()) {
    logger.warn("Cashfree not configured, skipping vendor sync");
    return null;
  }

  const vendorId = society.cashfreeVendorId || `soc_${society._id.toString()}`;
  const bank = society.bankDetails || {};

  if (!bank.accountNumber || !bank.ifsc) {
    logger.warn(`Society ${society.name} does not have complete bank details, skipping vendor creation`);
    return null;
  }

  // Clean phone to 10 digits
  let phone = (society.contactPhone || "9999999999").replace(/\D/g, "");
  if (phone.length < 10) phone = "9999999999";
  if (phone.length > 10) phone = phone.slice(-10);

  const payload = {
    vendor_id: vendorId,
    status: "ACTIVE",
    name: society.name.slice(0, 50),
    email: society.contactEmail || "admin@residentone.com",
    phone: phone,
    verify_account: false, // Set to true in production if penny drop verification is required
    bank: {
      account_number: String(bank.accountNumber).trim(),
      account_holder: bank.accountHolderName || society.name.slice(0, 50),
      ifsc: String(bank.ifsc).trim().toUpperCase(),
    },
    kyc_details: {
      account_type: "Trust",
      business_type: "Society/Trust/Club/Association",
      pan: (bank.pan || "AAATG1234F").trim().toUpperCase(),
    },
  };

  try {
    const res = await fetch(`${config.cashfree.baseUrl}/easy-split/vendors`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      // If vendor already exists, that is fine - return existing vendor_id
      if (data.code === "vendor_already_exists" || (data.message && data.message.includes("already exists"))) {
        logger.info(`Cashfree vendor ${vendorId} already exists`);
        return vendorId;
      }
      logger.error(`Cashfree vendor creation failed: ${JSON.stringify(data)}`);
      return null;
    }

    logger.info(`Cashfree vendor created successfully: ${data.vendor_id}`);
    return data.vendor_id;
  } catch (err) {
    logger.error("Error creating Cashfree vendor:", err);
    return null;
  }
}

/**
 * Create a Cashfree Order with optional Easy Split
 */
async function createOrder({
  amount,
  receipt,
  customer = {},
  splitVendorId = null,
  splitAmount = null,
  orderNote = "ResidentOne Payment",
  returnUrl = null,
}) {
  const fee = calculateFee(amount);
  const total = amount + fee;
  const orderId = receipt || `cf_ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Mock Mode when keys not present
  if (!isCashfreeConfigured()) {
    const mockId = `cf_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    logger.info(`Cashfree mock order: amount=${amount} fee=${fee} total=${total}`);
    return {
      id: mockId,
      cfOrderId: `cf_mock_${Date.now()}`,
      paymentSessionId: `session_mock_${Date.now()}`,
      orderAmount: total,
      currency: "INR",
      receipt,
      fee,
      total,
      baseAmount: amount,
      isMock: true,
      env: "sandbox",
    };
  }

  // Sanitize customer details
  let phone = (customer.phone || "9999999999").replace(/\D/g, "");
  if (phone.length < 10) phone = "9999999999";
  if (phone.length > 10) phone = phone.slice(-10);

  const payload = {
    order_id: orderId,
    order_amount: total,
    order_currency: "INR",
    customer_details: {
      customer_id: String(customer.id || customer._id || "cust_resident").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50),
      customer_name: customer.name || "Resident",
      customer_email: customer.email || "resident@residentone.com",
      customer_phone: phone,
    },
    order_meta: {
      return_url: returnUrl || null,
    },
    order_note: orderNote,
  };

  // If society vendor ID provided, split base maintenance directly to society
  if (splitVendorId && (splitAmount || amount) > 0) {
    payload.order_splits = [
      {
        vendor_id: splitVendorId,
        amount: splitAmount || amount,
      },
    ];
  }

  try {
    const res = await fetch(`${config.cashfree.baseUrl}/orders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      logger.error(`Cashfree createOrder API error: ${JSON.stringify(data)}`);
      throw new Error(data.message || "Failed to create Cashfree order");
    }

    return {
      id: data.order_id,
      cfOrderId: data.cf_order_id,
      paymentSessionId: data.payment_session_id,
      orderAmount: data.order_amount,
      currency: data.order_currency,
      receipt,
      fee,
      total,
      baseAmount: amount,
      isMock: false,
      env: config.cashfree.env,
    };
  } catch (err) {
    logger.error("Error creating Cashfree order, falling back to mock:", err);
    const mockId = `cf_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      id: mockId,
      cfOrderId: `cf_mock_${Date.now()}`,
      paymentSessionId: `session_mock_${Date.now()}`,
      orderAmount: total,
      currency: "INR",
      receipt,
      fee,
      total,
      baseAmount: amount,
      isMock: true,
      mockReason: err.message,
      env: config.cashfree.env,
    };
  }
}

/**
 * Fetch Order details from Cashfree
 */
async function getOrder(orderId) {
  if (!isCashfreeConfigured()) return null;

  try {
    const res = await fetch(`${config.cashfree.baseUrl}/orders/${orderId}`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    logger.error(`Error fetching Cashfree order ${orderId}:`, err);
    return null;
  }
}

/**
 * Verify Webhook Signature (HMAC-SHA256)
 */
function verifyWebhookSignature(req) {
  if (!isCashfreeConfigured()) return true;

  const signatureHeader = req.headers["x-webhook-signature"];
  const timestampHeader = req.headers["x-webhook-timestamp"];
  const rawBody = req.rawBody;

  if (!signatureHeader || !timestampHeader || !rawBody) {
    logger.warn("Cashfree webhook missing signature, timestamp, or raw body");
    return false;
  }

  const dataToSign = timestampHeader + rawBody;
  const computedSignature = crypto
    .createHmac("sha256", config.cashfree.secretKey)
    .update(dataToSign)
    .digest("base64");

  try {
    const signatureBuffer = Buffer.from(signatureHeader, "base64");
    const computedBuffer = Buffer.from(computedSignature, "base64");

    if (signatureBuffer.length !== computedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(signatureBuffer, computedBuffer);
  } catch (err) {
    logger.error("Error comparing Cashfree webhook signatures:", err);
    return false;
  }
}

module.exports = {
  calculateFee,
  createOrUpdateVendor,
  createOrder,
  getOrder,
  verifyWebhookSignature,
  isCashfreeConfigured,
};
