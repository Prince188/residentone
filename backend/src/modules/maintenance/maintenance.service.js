const { MaintenanceCycle, MaintenancePayment } = require("./maintenance.model");
const { Unit } = require("../unit/unit.model");
const { AppError } = require("../../shared/utils/errors");

class MaintenanceService {
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
    return MaintenanceCycle.create({
      societyId,
      createdBy: userId,
      month: data.month,
      year: data.year,
      amount: data.amount,
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
  async getCycleUnits(societyId, cycle) {
    const units = await Unit.find({ societyId, isActive: true })
      .populate("ownerId", "name phone")
      .sort({ label: 1 })
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
      return {
        unitId: unit._id,
        label: unit.label,
        ownerName: unit.ownerId?.name || null,
        ownerPhone: unit.ownerId?.phone || null,
        isOccupied: Boolean(unit.ownerId),
        status: this.statusFor(payment, cycle),
        paidOn: payment?.paidOn || null,
        method: payment?.method || null,
        receiptNo: payment?.receiptNo || null,
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
      .lean();
    if (!unit) throw new AppError("House not found", 404);

    const payment = await MaintenancePayment.findOne({
      societyId,
      cycleId: cycle._id,
      unitId,
      isActive: true,
    }).lean();

    const record = {
      unitId: unit._id,
      label: unit.label,
      block: unit.block,
      floor: unit.floor,
      doorNo: unit.doorNo,
      ownerName: unit.ownerId?.name || null,
      ownerPhone: unit.ownerId?.phone || null,
      isOwner:
        unit.ownerId && String(unit.ownerId) === String(membership.userId),
      status: this.statusFor(payment, cycle),
      paidOn: payment?.paidOn || null,
      method: payment?.method || null,
      receiptNo: payment?.receiptNo || null,
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
      return {
        cycleId: cycle._id,
        month: cycle.month,
        year: cycle.year,
        amount: cycle.amount,
        dueDate: cycle.dueDate,
        status: this.statusFor(payment, cycle),
        paidOn: payment?.paidOn || null,
        method: payment?.method || null,
        receiptNo: payment?.receiptNo || null,
      };
    });
  }

  // Admin records/updates a payment for a unit in a cycle
  async recordPayment(societyId, cycle, unitId, userId, data) {
    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true });
    if (!unit) throw new AppError("House not found", 404);

    const paidOn = data.paidOn || new Date();
    const receiptNo = `RCPT-${cycle.year}${String(cycle.month).padStart(2, "0")}-${String(unitId).slice(-4).toUpperCase()}`;

    return MaintenancePayment.findOneAndUpdate(
      { societyId, cycleId: cycle._id, unitId },
      {
        societyId,
        cycleId: cycle._id,
        unitId,
        paidOn,
        method: data.method || "UPI",
        receiptNo,
        recordedBy: userId,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
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
}

module.exports = new MaintenanceService();
