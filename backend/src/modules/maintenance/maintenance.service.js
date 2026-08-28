const { MaintenanceCycle, MaintenancePayment } = require("./maintenance.model");
const { Unit } = require("../unit/unit.model");
const { AppError } = require("../../shared/utils/errors");

class MaintenanceService {
  // helper: get amount for a specific unit - renter priority if renter lives there
  getAmountForUnit(cycle, unit) {
    const hasTenant = unit && (unit.tenantId || unit.tenant);
    const hasOwner = unit && (unit.ownerId || unit.owner);
    // If renter exists (currently lives), use renter amount - priority
    if (hasTenant) {
      return cycle.renterAmount != null ? cycle.renterAmount : cycle.amount;
    }
    if (hasOwner) {
      return cycle.ownerAmount != null ? cycle.ownerAmount : cycle.amount;
    }
    return cycle.amount;
  }

  async createCycle(societyId, userId, data) {
    const existing = await MaintenanceCycle.findOne({
      societyId,
      month: data.month,
      year: data.year,
    });
    if (existing) {
      throw new AppError(
        `Maintenance for this period already exists. Use a different month/year.`,
        409
      );
    }
    // Support both old single amount and new split: if owner/renter provided use them, else fallback to amount
    const amount = data.amount;
    let ownerAmount = data.ownerAmount;
    let renterAmount = data.renterAmount;
    if (ownerAmount == null && renterAmount == null && amount != null) {
      ownerAmount = amount;
      renterAmount = amount;
    }
    // Ensure at least one is set
    const finalAmount = amount != null ? amount : ownerAmount;
    const finalOwner = ownerAmount != null ? ownerAmount : finalAmount;
    const finalRenter = renterAmount != null ? renterAmount : finalAmount;

    return MaintenanceCycle.create({
      societyId,
      createdBy: userId,
      month: data.month,
      year: data.year,
      amount: finalAmount,
      ownerAmount: finalOwner,
      renterAmount: finalRenter,
      dueDate: data.dueDate,
    });
  }

  async listCycles(societyId) {
    return MaintenanceCycle.find({ societyId, isActive: true })
      .sort({ year: -1, month: -1 })
      .limit(36)
      .lean();
  }

  async getLatestCycle(societyId) {
    return MaintenanceCycle.findOne({ societyId, isActive: true })
      .sort({ year: -1, month: -1 })
      .lean();
  }

  async getCycle(societyId, cycleId) {
    const cycle = await MaintenanceCycle.findOne({
      _id: cycleId,
      societyId,
      isActive: true,
    }).lean();
    if (!cycle) throw new AppError("Maintenance cycle not found", 404);
    return cycle;
  }

  mapCycle(cycle) {
    return {
      id: cycle._id,
      month: cycle.month,
      year: cycle.year,
      amount: cycle.amount,
      ownerAmount: cycle.ownerAmount != null ? cycle.ownerAmount : cycle.amount,
      renterAmount: cycle.renterAmount != null ? cycle.renterAmount : cycle.amount,
      dueDate: cycle.dueDate,
      createdAt: cycle.createdAt,
    };
  }

  statusFor(payment, cycle) {
    if (!payment) {
      return new Date(cycle.dueDate) < new Date() ? "overdue" : "pending";
    }
    return new Date(payment.paidOn) <= new Date(cycle.dueDate)
      ? "paid"
      : "late_paid";
  }

  // All units of the society with their payment state for a cycle (admin view)
  // FIX: populate both owner/tenant and expose IDs so isOwner comes from DB (ownerId == userId), not hardcoded
  async getCycleUnits(societyId, cycle) {
    const units = await Unit.find({ societyId, isActive: true })
      .populate("ownerId", "name phone")
      .populate("tenantId", "name phone")
      .sort({ unitNumber: 1, label: 1 })
      .lean();

    const payments = await MaintenancePayment.find({
      societyId,
      cycleId: cycle._id,
      isActive: true,
    }).lean();

    const paymentByUnit = new Map(
      payments.map((p) => [String(p.unitId), p])
    );

    return units.map((unit) => {
      const payment = paymentByUnit.get(String(unit._id));
      const ownerIdStr = unit.ownerId ? String(unit.ownerId._id || unit.ownerId) : null;
      const tenantIdStr = unit.tenantId ? String(unit.tenantId._id || unit.tenantId) : null;
      const unitAmount = this.getAmountForUnit(cycle, unit);
      // Renter priority for display
      const displayName = unit.tenantId?.name || unit.ownerId?.name || null;
      const displayPhone = unit.tenantId?.phone || unit.ownerId?.phone || null;
      return {
        unitId: unit._id,
        label: unit.label,
        ownerName: displayName,
        ownerPhone: displayPhone,
        ownerId: ownerIdStr,
        tenantId: tenantIdStr,
        isOccupied: Boolean(unit.ownerId || unit.tenantId),
        isRenterOccupied: Boolean(unit.tenantId),
        amount: unitAmount,
        status: this.statusFor(payment, cycle),
        paidOn: payment?.paidOn || null,
        method: payment?.method || null,
        receiptNo: payment?.receiptNo || null,
        cycleOwnerAmount: cycle.ownerAmount,
        cycleRenterAmount: cycle.renterAmount,
      };
    });
  }

  mapUnitRecord(record, cycle, membershipRole) {
    return {
      unitId: record.unitId,
      label: record.label,
      ownerName: record.ownerName,
      ownerPhone: record.ownerPhone,
      isOwner: record.isOwner ?? false,
      role: membershipRole,
      cycle: this.mapCycle(cycle),
      status: record.status,
      paidOn: record.paidOn,
      method: record.method,
      receiptNo: record.receiptNo,
      amount: record.amount || cycle.amount,
      fee: record.fee || 0,
      totalAmount: record.totalAmount || record.amount || cycle.amount,
      gatewayStatus: record.gatewayStatus || "cash",
    };
  }

  // Single unit's record within a cycle — allowed for admin or the assigned member
  async getCycleUnitDetail(societyId, cycle, unitId, membership) {
    const isAdmin = ["super_admin", "society_admin"].includes(membership.role);
    const myUnitIds = (membership.units || []).map((id) => String(id));
    const isMyUnit = myUnitIds.includes(String(unitId));

    if (!isAdmin && !isMyUnit) {
      throw new AppError("This house is not assigned to you", 403);
    }

    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true })
      .populate("ownerId", "name phone")
      .populate("tenantId", "name phone")
      .lean();
    if (!unit) throw new AppError("House not found", 404);

    const payment = await MaintenancePayment.findOne({
      societyId,
      cycleId: cycle._id,
      unitId,
      isActive: true,
    }).lean();

    // FIX: handle populated ownerId object vs raw ObjectId, and also check tenant
    const ownerIdStr = unit.ownerId ? String(unit.ownerId._id || unit.ownerId) : null;
    const tenantIdStr = unit.tenantId ? String(unit.tenantId._id || unit.tenantId) : null;
    const userIdStr = String(membership.userId);
    const isOwnerFlag = ownerIdStr ? ownerIdStr === userIdStr : false;
    const isTenantFlag = tenantIdStr ? tenantIdStr === userIdStr : false;

    const unitAmount = this.getAmountForUnit(cycle, unit);
    const record = {
      unitId: unit._id,
      label: unit.label,
      block: unit.block,
      floor: unit.floor,
      doorNo: unit.doorNo,
      // Renter priority for display
      ownerName: unit.tenantId?.name || unit.ownerId?.name || null,
      ownerPhone: unit.tenantId?.phone || unit.ownerId?.phone || null,
      isOwner: isOwnerFlag,
      isTenant: isTenantFlag,
      houseRole: isTenantFlag ? "tenant" : isOwnerFlag ? "owner" : membership.role,
      amount: unitAmount,
      dueAmount: unitAmount,
      status: this.statusFor(payment, cycle),
      paidOn: payment?.paidOn || null,
      method: payment?.method || null,
      receiptNo: payment?.receiptNo || null,
      fee: payment?.fee || 0,
      totalAmount: payment?.totalAmount || payment?.amount || unitAmount,
      gatewayStatus: payment?.gatewayStatus || "cash",
    };

    return this.mapUnitRecord(record, cycle, membership.role);
  }

  // Payment history of one unit across all cycles
  async getUnitHistory(societyId, unitId, membership) {
    const isAdmin = ["super_admin", "society_admin"].includes(membership.role);
    const myUnitIds = (membership.units || []).map((id) => String(id));
    if (!isAdmin && !myUnitIds.includes(String(unitId))) {
      throw new AppError("This house is not assigned to you", 403);
    }

    const unit = await Unit.findById(unitId).lean();
    const cycles = await MaintenanceCycle.find({
      societyId,
      isActive: true,
    })
      .sort({ year: -1, month: -1 })
      .lean();

    const payments = await MaintenancePayment.find({
      societyId,
      unitId,
      isActive: true,
    }).lean();

    const paymentByCycle = new Map(
      payments.map((p) => [String(p.cycleId), p])
    );

    return cycles.map((cycle) => {
      const payment = paymentByCycle.get(String(cycle._id));
      const unitAmount = unit ? this.getAmountForUnit(cycle, unit) : cycle.amount;
      return {
        cycleId: cycle._id,
        month: cycle.month,
        year: cycle.year,
        amount: unitAmount,
        ownerAmount: cycle.ownerAmount,
        renterAmount: cycle.renterAmount,
        dueDate: cycle.dueDate,
        status: this.statusFor(payment, cycle),
        paidOn: payment?.paidOn || null,
        method: payment?.method || null,
        receiptNo: payment?.receiptNo || null,
        fee: payment?.fee || 0,
        totalAmount: payment?.totalAmount || payment?.amount || unitAmount,
      };
    });
  }

  // Admin records/updates a payment for a unit in a cycle (cash/manual)
  async recordPayment(societyId, cycle, unitId, userId, data) {
    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true });
    if (!unit) throw new AppError("House not found", 404);

    const paidOn = data.paidOn || new Date();
    const receiptNo = `RCPT-${cycle.year}${String(cycle.month).padStart(2, "0")}-${String(unitId).slice(-4).toUpperCase()}`;
    const unitAmount = this.getAmountForUnit(cycle, unit);

    return MaintenancePayment.findOneAndUpdate(
      { societyId, cycleId: cycle._id, unitId },
      {
        societyId,
        cycleId: cycle._id,
        unitId,
        paidOn,
        method: data.method || "Cash",
        amount: unitAmount,
        fee: 0,
        totalAmount: unitAmount,
        gatewayStatus: "cash",
        razorpayOrderId: null,
        razorpayPaymentId: null,
        receiptNo,
        recordedBy: userId,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }

  // Razorpay: create order for online payment (fee passed to resident)
  async createRazorpayOrder(societyId, cycle, unitId, userId) {
    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true });
    if (!unit) throw new AppError("House not found", 404);

    const existing = await MaintenancePayment.findOne({
      societyId,
      cycleId: cycle._id,
      unitId,
      isActive: true,
      gatewayStatus: "paid",
    }).lean();
    if (existing) throw new AppError("Payment already recorded for this house", 409);

    const { createOrder } = require("../../shared/services/razorpay.service");
    const receipt = `rcpt_${cycle.year}${String(cycle.month).padStart(2, "0")}_${String(unitId).slice(-6)}`;
    const unitAmount = this.getAmountForUnit(cycle, unit);
    const order = await createOrder({ amount: unitAmount, receipt });

    // Create pending payment record with order id
    await MaintenancePayment.findOneAndUpdate(
      { societyId, cycleId: cycle._id, unitId },
      {
        societyId,
        cycleId: cycle._id,
        unitId,
        paidOn: new Date(),
        method: "Razorpay",
        amount: order.baseAmount,
        fee: order.fee,
        totalAmount: order.total,
        razorpayOrderId: order.id,
        gatewayStatus: "created",
        recordedBy: userId,
        isActive: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return order;
  }

  async verifyRazorpayPayment(societyId, cycle, unitId, userId, data) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError("Missing Razorpay payment details", 400);
    }

    const { verifySignature } = require("../../shared/services/razorpay.service");
    const isValid = verifySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });
    if (!isValid) throw new AppError("Invalid Razorpay signature", 400);

    const pending = await MaintenancePayment.findOne({
      societyId,
      cycleId: cycle._id,
      unitId,
      razorpayOrderId,
    });
    if (!pending) throw new AppError("Order not found. Create order first.", 404);

    const receiptNo = `RCPT-${cycle.year}${String(cycle.month).padStart(2, "0")}-${String(unitId).slice(-4).toUpperCase()}`;

    const updated = await MaintenancePayment.findOneAndUpdate(
      { societyId, cycleId: cycle._id, unitId },
      {
        societyId,
        cycleId: cycle._id,
        unitId,
        paidOn: new Date(),
        method: "Razorpay",
        razorpayPaymentId,
        razorpaySignature,
        gatewayStatus: "paid",
        receiptNo,
        recordedBy: userId,
        isActive: true,
      },
      { new: true }
    ).lean();

    if (!updated) throw new AppError("Failed to record payment", 500);
    return updated;
  }

  async removePayment(societyId, cycle, unitId) {
    const result = await MaintenancePayment.findOneAndUpdate(
      { societyId, cycleId: cycle._id, unitId, isActive: true },
      { isActive: false },
      { new: true }
    ).lean();
    if (!result) throw new AppError("No recorded payment found", 404);
    return result;
  }

  async getReceipt(societyId, cycle, unitId, membership) {
    const isAdmin = ["super_admin", "society_admin"].includes(membership.role);
    const myUnitIds = (membership.units || []).map((id) => String(id));
    if (!isAdmin && !myUnitIds.includes(String(unitId))) {
      throw new AppError("This house is not assigned to you", 403);
    }

    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true })
      .populate("ownerId", "name phone email")
      .lean();
    if (!unit) throw new AppError("House not found", 404);

    const payment = await MaintenancePayment.findOne({
      societyId,
      cycleId: cycle._id,
      unitId,
      isActive: true,
    }).lean();
    if (!payment) throw new AppError("No payment found for this house", 404);

    // Only allow receipt if paid
    const status = this.statusFor(payment, cycle);
    if (!["paid", "late_paid"].includes(status)) {
      throw new AppError("Payment not completed yet", 400);
    }

    // Fetch society for receipt header
    const { Society } = require("../society/society.model");
    const society = await Society.findById(societyId).lean();

    return {
      receiptNo: payment.receiptNo,
      society: {
        name: society?.name || "Society",
        address: society ? `${society.address}, ${society.city}, ${society.state} - ${society.pincode}` : "",
      },
      unit: {
        id: unit._id,
        label: unit.label,
        block: unit.block,
        floor: unit.floor,
        doorNo: unit.doorNo,
        ownerName: unit.ownerId?.name || membership?.userId || "Resident",
        ownerPhone: unit.ownerId?.phone || "",
      },
      cycle: this.mapCycle(cycle),
      payment: {
        amount: payment.amount || cycle.amount,
        fee: payment.fee || 0,
        totalAmount: payment.totalAmount || payment.amount || cycle.amount,
        method: payment.method,
        paidOn: payment.paidOn,
        receiptNo: payment.receiptNo,
        razorpayPaymentId: payment.razorpayPaymentId || null,
        razorpayOrderId: payment.razorpayOrderId || null,
      },
      status,
    };
  }
}

module.exports = new MaintenanceService();
