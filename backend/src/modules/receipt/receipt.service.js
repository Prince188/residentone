const jwt = require("jsonwebtoken");
const { config } = require("../../config");
const { MaintenancePayment, MaintenanceCycle } = require("../maintenance/maintenance.model");
const { CollectionPayment, Collection } = require("../collections/collection.model");
const { TransferFee } = require("../transfer-fees/transferFee.model");
const { Donation } = require("../donations/donation.model");
const { Unit } = require("../unit/unit.model");
const { Society } = require("../society/society.model");
const { AppError } = require("../../shared/utils/errors");

const FEE_TYPE_LABELS = {
  ownership_transfer: "Ownership Transfer Fee",
  tenant_move_in: "Tenant Move-In Fee",
  noc_fee: "NOC & Share Certificate Fee",
  parking_transfer: "Parking Transfer Fee",
  other: "Transfer & Move-In Fee",
};

function getReceiptSecret() {
  return config.jwt.receiptSecret || config.jwt.accessSecret;
}

function generateReceiptToken({ rid, sid, a, t, ts, pid, type }) {
  const payload = { rid, sid: String(sid), a, t, ts, pid: String(pid), type };
  return jwt.sign(payload, getReceiptSecret(), { expiresIn: "10y" });
}

function verifyReceiptToken(token) {
  return jwt.verify(token, getReceiptSecret());
}

async function verifyReceipt(token, requester) {
  if (!token) throw new AppError("Missing verification token", 400);

  let payload;
  try {
    payload = verifyReceiptToken(token);
  } catch (e) {
    throw new AppError("Invalid or tampered receipt", 400);
  }

  const { rid, sid, pid, type } = payload;
  if (!rid || !sid) throw new AppError("Invalid receipt payload", 400);

  // Find payment by receiptNo across supported collections
  let payment = null;
  let paymentType = type || "maintenance";

  if (type === "transfer_fee" || rid.startsWith("TF-")) {
    payment = await TransferFee.findOne({ receiptNo: rid, isActive: true }).lean();
    paymentType = "transfer_fee";
  } else if (type === "donation" || rid.startsWith("DN-")) {
    payment = await Donation.findOne({ receiptNo: rid, isActive: true }).lean();
    paymentType = "donation";
  } else if (type === "collection") {
    payment = await CollectionPayment.findOne({ receiptNo: rid, isActive: true }).lean();
    paymentType = "collection";
  } else {
    // Search across models in fallback order
    payment = await MaintenancePayment.findOne({ receiptNo: rid, isActive: true }).lean();
    if (payment) {
      paymentType = "maintenance";
    } else {
      payment = await CollectionPayment.findOne({ receiptNo: rid, isActive: true }).lean();
      if (payment) {
        paymentType = "collection";
      } else {
        payment = await TransferFee.findOne({ receiptNo: rid, isActive: true }).lean();
        if (payment) {
          paymentType = "transfer_fee";
        } else {
          payment = await Donation.findOne({ receiptNo: rid, isActive: true }).lean();
          if (payment) {
            paymentType = "donation";
          }
        }
      }
    }
  }

  if (!payment) {
    throw new AppError("Receipt not found", 404);
  }

  // Verify sid matches payment's societyId
  if (String(payment.societyId) !== String(sid)) {
    throw new AppError("Receipt society mismatch", 400);
  }

  // Society binding check via x-society-id header (if provided) — super_admin bypass
  const requestedSid = requester.requestedSocietyId;
  const isSuperAdmin = requester.isSuperAdmin;
  if (requestedSid && String(requestedSid) !== String(payment.societyId)) {
    if (!isSuperAdmin) {
      const err = new AppError("This receipt does not belong to your society", 403);
      err.code = "WRONG_SOCIETY";
      throw err;
    }
  }

  // Fetch related data for valid response
  const society = await Society.findById(payment.societyId).lean();
  const unit = await Unit.findById(payment.unitId)
    .populate("ownerId", "name phone")
    .populate("tenantId", "name phone")
    .lean();

  let cycle = null;
  let collection = null;
  let amount = payment.amount;
  let total = payment.totalAmount || payment.amount;
  let fee = payment.fee || 0;
  let paidOn = payment.paidOn || payment.collectedAt;
  let dueDate = null;
  let period = null;
  let status = "paid";

  const house = unit
    ? { label: unit.label, block: unit.block, floor: unit.floor, doorNo: unit.doorNo, id: unit._id }
    : null;

  let resident = null;
  if (paymentType === "transfer_fee") {
    resident = {
      name: payment.payerName || unit?.tenantId?.name || unit?.ownerId?.name || null,
      phone: payment.payerPhone || unit?.tenantId?.phone || unit?.ownerId?.phone || null,
    };
    period = FEE_TYPE_LABELS[payment.feeType] || "Transfer Fee";
    dueDate = payment.collectedAt;
    status = "paid";
  } else if (paymentType === "donation") {
    resident = unit
      ? { name: unit.tenantId?.name || unit.ownerId?.name || null, phone: unit.tenantId?.phone || unit.ownerId?.phone || null }
      : null;
    period = payment.purpose + (payment.event ? ` (${payment.event})` : "");
    dueDate = payment.collectedAt;
    status = "paid";
  } else if (paymentType === "maintenance") {
    resident = unit
      ? { name: unit.tenantId?.name || unit.ownerId?.name || null, phone: unit.tenantId?.phone || unit.ownerId?.phone || null }
      : null;
    cycle = await MaintenanceCycle.findById(payment.cycleId).lean();
    dueDate = cycle?.dueDate || null;
    period = cycle ? `${cycle.month}/${cycle.year}` : null;
    if (cycle && cycle.dueDate && paidOn) {
      const isAfterDue = new Date(paidOn).toISOString().slice(0, 10) > new Date(cycle.dueDate).toISOString().slice(0, 10);
      status = isAfterDue ? "late_paid" : "paid";
    }
  } else if (paymentType === "collection") {
    resident = unit
      ? { name: unit.tenantId?.name || unit.ownerId?.name || null, phone: unit.tenantId?.phone || unit.ownerId?.phone || null }
      : null;
    collection = await Collection.findById(payment.collectionId).lean();
    dueDate = collection?.dueDate || null;
    period = collection ? collection.title : null;
    if (collection && collection.dueDate && paidOn) {
      const isAfterDue = new Date(paidOn).toISOString().slice(0, 10) > new Date(collection.dueDate).toISOString().slice(0, 10);
      status = isAfterDue ? "late_paid" : "paid";
    }
  }

  return {
    valid: true,
    status,
    receiptNo: payment.receiptNo,
    house,
    resident,
    unit,
    cycle: cycle ? { month: cycle.month, year: cycle.year, dueDate: cycle.dueDate, amount: cycle.amount } : null,
    collection: collection ? { title: collection.title, amount: collection.amount } : null,
    period,
    dueDate,
    amount,
    fee,
    total,
    method: payment.method || "Cash",
    txn: payment.razorpayPaymentId || null,
    paidOn,
    society: society ? { id: society._id, name: society.name, address: society.address } : { id: payment.societyId },
    payment: {
      amount,
      fee,
      totalAmount: total,
      method: payment.method || "Cash",
      paidOn,
      receiptNo: payment.receiptNo,
      razorpayPaymentId: payment.razorpayPaymentId || null,
      razorpayOrderId: payment.razorpayOrderId || null,
    },
    societyId: String(payment.societyId),
    type: paymentType,
    source: "server",
  };
}

module.exports = { generateReceiptToken, verifyReceiptToken, verifyReceipt };
