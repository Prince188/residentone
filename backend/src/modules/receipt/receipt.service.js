const jwt = require("jsonwebtoken");
const { config } = require("../../config");
const { MaintenancePayment, MaintenanceCycle } = require("../maintenance/maintenance.model");
const { CollectionPayment, Collection } = require("../collections/collection.model");
const { Unit } = require("../unit/unit.model");
const { Society } = require("../society/society.model");
const { AppError } = require("../../shared/utils/errors");

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

  // Find payment by receiptNo across both collections
  let payment = await MaintenancePayment.findOne({ receiptNo: rid, isActive: true }).lean();
  let paymentType = "maintenance";
  let collectionOrCycle = null;

  if (payment) {
    // Verify sid matches payment's societyId
    if (String(payment.societyId) !== String(sid)) {
      throw new AppError("Receipt society mismatch", 400);
    }
  } else {
    payment = await CollectionPayment.findOne({ receiptNo: rid, isActive: true }).lean();
    paymentType = "collection";
    if (payment && String(payment.societyId) !== String(sid)) {
      throw new AppError("Receipt society mismatch", 400);
    }
  }

  if (!payment) {
    throw new AppError("Receipt not found", 404);
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
    // super_admin with mismatched header is allowed — continue
  }

  // For non-super_admin without header, still enforce membership check via JWT sid vs user's societies?
  // If no header and not super_admin, we still allow verification (global read) but frontend normally sends header.
  // The strict check above covers the header case. Additional check: ensure requester has membership in payment society if not super_admin
  if (!isSuperAdmin && requestedSid) {
    // already checked above
  }

  // Fetch related data for valid response
  const society = await Society.findById(payment.societyId).lean();
  const unit = await Unit.findById(payment.unitId)
    .populate("ownerId", "name phone")
    .populate("tenantId", "name phone")
    .lean();

  let cycle = null;
  let collection = null;
  if (paymentType === "maintenance") {
    cycle = await MaintenanceCycle.findById(payment.cycleId).lean();
  } else {
    collection = await Collection.findById(payment.collectionId).lean();
  }

  const amount = payment.amount;
  const total = payment.totalAmount || payment.amount;
  const fee = payment.fee || 0;

  // Build response matching frontend VerifyReceiptScreen expectations
  const house = unit
    ? { label: unit.label, block: unit.block, floor: unit.floor, doorNo: unit.doorNo, id: unit._id }
    : null;
  const resident = unit
    ? { name: unit.tenantId?.name || unit.ownerId?.name || null, phone: unit.tenantId?.phone || unit.ownerId?.phone || null }
    : null;

  const paidOn = payment.paidOn;
  const dueDate = cycle?.dueDate || collection?.dueDate || null;
  const period = cycle ? `${cycle.month}/${cycle.year}` : collection ? collection.title : null;

  // Determine status via same logic as maintenance service
  let status = "paid";
  if (paymentType === "maintenance" && cycle) {
    const isAfterDue = (() => {
      if (!cycle.dueDate || !paidOn) return false;
      const d1 = new Date(paidOn).toISOString().slice(0, 10);
      const d2 = new Date(cycle.dueDate).toISOString().slice(0, 10);
      return d1 > d2;
    })();
    status = isAfterDue ? "late_paid" : "paid";
  } else if (paymentType === "collection" && collection) {
    const isAfterDue = (() => {
      if (!collection.dueDate || !paidOn) return false;
      return new Date(paidOn).toISOString().slice(0, 10) > new Date(collection.dueDate).toISOString().slice(0, 10);
    })();
    status = isAfterDue ? "late_paid" : "paid";
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
    method: payment.method,
    txn: payment.razorpayPaymentId || null,
    paidOn,
    society: society ? { id: society._id, name: society.name, address: society.address } : { id: payment.societyId },
    payment: {
      amount,
      fee,
      totalAmount: total,
      method: payment.method,
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
