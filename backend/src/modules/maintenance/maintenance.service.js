const { MaintenanceCycle, MaintenancePayment } = require("./maintenance.model");
const { Unit } = require("../unit/unit.model");
const { AppError } = require("../../shared/utils/errors");
const { Society } = require("../society/society.model");
const { hasPermission } = require("../../shared/permissions");
const ExcelJS = require("exceljs");

async function hasMaintenancePermission(societyId, role) {
  if (["super_admin", "society_admin"].includes(role)) return true;
  try {
    const society = await Society.findById(societyId).select("rolePermissions").lean();
    return hasPermission(role, "manage_maintenance", society?.rolePermissions);
  } catch {
    return false;
  }
}

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

    const created = await MaintenanceCycle.create({
      societyId,
      createdBy: userId,
      month: data.month,
      year: data.year,
      amount: finalAmount,
      ownerAmount: finalOwner,
      renterAmount: finalRenter,
      dueDate: data.dueDate,
      durationMonths: data.durationMonths || 1,
      lateCharge: data.lateCharge || 0,
    });

    // Auto-apply existing advances to this new cycle (for future cycles not yet existed at payment time)
    try {
      const advances = await MaintenancePayment.find({
        societyId,
        isActive: true,
        isAdvance: true,
        advanceMonths: { $gt: 1 },
        gatewayStatus: "paid",
      }).lean();
      for (const adv of advances) {
        // Find the cycle that this advance was originally for
        const advCycle = await MaintenanceCycle.findById(adv.cycleId).lean();
        if (!advCycle) continue;
        // Calculate month distance between advCycle and newly created cycle
        const advIndex = advCycle.year * 12 + advCycle.month;
        const newIndex = created.year * 12 + created.month;
        const diff = newIndex - advIndex;
        if (diff > 0 && diff < adv.advanceMonths) {
          // Within advance window: auto-create payment for new cycle for same unit
          const exists = await MaintenancePayment.findOne({
            societyId,
            cycleId: created._id,
            unitId: adv.unitId,
            isActive: true,
          }).lean();
          if (exists) continue;
          const unit = await Unit.findById(adv.unitId).lean();
          const amt = unit ? this.getAmountForUnit(created, unit) : created.amount;
          await MaintenancePayment.create({
            societyId,
            cycleId: created._id,
            unitId: adv.unitId,
            paidOn: new Date(),
            method: adv.method || "Razorpay",
            amount: amt,
            fee: 0,
            totalAmount: amt,
            razorpayOrderId: adv.razorpayOrderId,
            razorpayPaymentId: adv.razorpayPaymentId ? `${adv.razorpayPaymentId}-auto${diff}` : null,
            gatewayStatus: "paid",
            receiptNo: `RCPT-${created.year}${String(created.month).padStart(2, "0")}-${String(adv.unitId).slice(-4).toUpperCase()}-ADV`,
            recordedBy: adv.recordedBy,
            isActive: true,
            advanceMonths: 1,
            isAdvance: true,
          });
        }
      }
    } catch (e) {
      console.error("Auto-apply advance on createCycle failed", e?.message);
    }

    return created;
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
      durationMonths: cycle.durationMonths || 1,
      lateCharge: cycle.lateCharge || 0,
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
      const status = this.statusFor(payment, cycle);
      const isLate = ["overdue", "late_paid"].includes(status);
      const appliedLateCharge = isLate ? (cycle.lateCharge || 0) : 0;
      const finalAmount = payment ? (payment.amount || unitAmount) : (unitAmount + appliedLateCharge);
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
        amount: finalAmount,
        status: status,
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
      isTenant: record.isTenant ?? false,
      houseRole: record.houseRole || membershipRole,
      isRenterOccupied: record.isRenterOccupied ?? false,
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

  // Single unit's record within a cycle — allowed for admin/permission or the assigned member
  async getCycleUnitDetail(societyId, cycle, unitId, membership) {
    const isAdmin = await hasMaintenancePermission(societyId, membership.role);
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
    const status = this.statusFor(payment, cycle);
    const isLate = ["overdue", "late_paid"].includes(status);
    const appliedLateCharge = isLate ? (cycle.lateCharge || 0) : 0;
    const finalAmount = payment ? (payment.amount || unitAmount) : (unitAmount + appliedLateCharge);

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
      isRenterOccupied: Boolean(unit.tenantId),
      amount: finalAmount,
      dueAmount: finalAmount,
      status: status,
      paidOn: payment?.paidOn || null,
      method: payment?.method || null,
      receiptNo: payment?.receiptNo || null,
      fee: payment?.fee || 0,
      totalAmount: payment?.totalAmount || payment?.amount || finalAmount,
      gatewayStatus: payment?.gatewayStatus || "cash",
    };

    return this.mapUnitRecord(record, cycle, membership.role);
  }

  // Payment history of one unit across all cycles
  async getUnitHistory(societyId, unitId, membership) {
    const isAdmin = await hasMaintenancePermission(societyId, membership.role);
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
        durationMonths: cycle.durationMonths || 1,
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
    const baseAmount = this.getAmountForUnit(cycle, unit);
    const isLate = new Date(paidOn) > new Date(cycle.dueDate);
    const appliedLateCharge = isLate ? (cycle.lateCharge || 0) : 0;
    const finalAmount = baseAmount + appliedLateCharge;

    return MaintenancePayment.findOneAndUpdate(
      { societyId, cycleId: cycle._id, unitId },
      {
        societyId,
        cycleId: cycle._id,
        unitId,
        paidOn,
        method: data.method || "Cash",
        amount: finalAmount,
        fee: 0,
        totalAmount: finalAmount,
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

  // Razorpay: create order for online payment (fee passed to resident) - supports advance months
  async createRazorpayOrder(societyId, cycle, unitId, userId, months = 1) {
    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true });
    if (!unit) throw new AppError("House not found", 404);

    const advanceMonths = Math.max(1, Math.min(12, Number(months) || 1));

    const existing = await MaintenancePayment.findOne({
      societyId,
      cycleId: cycle._id,
      unitId,
      isActive: true,
      gatewayStatus: "paid",
    }).lean();
    if (existing) throw new AppError("Payment already recorded for this house", 409);

    const { createOrder } = require("../../shared/services/razorpay.service");
    const receipt = `rcpt_${cycle.year}${String(cycle.month).padStart(2, "0")}_${String(unitId).slice(-6)}${advanceMonths > 1 ? `_adv${advanceMonths}` : ""}`;
    const baseAmount = this.getAmountForUnit(cycle, unit);
    const isLate = new Date() > new Date(cycle.dueDate);
    const appliedLateCharge = isLate ? (cycle.lateCharge || 0) : 0;
    const singleFinal = baseAmount + appliedLateCharge;
    // For advance, calculate total for N months (without late for future months)
    let finalAmount = singleFinal;
    if (advanceMonths > 1) {
      // Find next cycles to calculate proper total
      const allCycles = await MaintenanceCycle.find({ societyId, isActive: true }).sort({ year: 1, month: 1 }).lean();
      const idx = allCycles.findIndex((c) => String(c._id) === String(cycle._id));
      let total = 0;
      for (let i = 0; i < advanceMonths; i++) {
        const c = allCycles[idx + i];
        if (c) {
          const amt = this.getAmountForUnit(c, unit);
          const late = i === 0 && new Date() > new Date(c.dueDate) ? (c.lateCharge || 0) : 0;
          total += amt + late;
        } else {
          // Future cycle not yet created: use current base
          total += baseAmount;
        }
      }
      finalAmount = total;
    }
    const order = await createOrder({ amount: finalAmount, receipt });

    // Create pending payment record with order id (for current cycle)
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
        advanceMonths: advanceMonths,
        isAdvance: advanceMonths > 1,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Attach advanceMonths to order for frontend
    order.advanceMonths = advanceMonths;
    order.months = advanceMonths;
    return order;
  }

  async verifyRazorpayPayment(societyId, cycle, unitId, userId, data) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, months } = data;
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

    const advanceMonths = Math.max(1, Math.min(12, Number(months) || Number(pending.advanceMonths) || 1));
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
        advanceMonths: advanceMonths,
        isAdvance: advanceMonths > 1,
      },
      { new: true }
    ).lean();

    if (!updated) throw new AppError("Failed to record payment", 500);

    // If advance >1, create payments for next N-1 cycles that already exist
    if (advanceMonths > 1) {
      try {
        const allCycles = await MaintenanceCycle.find({ societyId, isActive: true }).sort({ year: 1, month: 1 }).lean();
        const idx = allCycles.findIndex((c) => String(c._id) === String(cycle._id));
        const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true }).lean();
        for (let i = 1; i < advanceMonths; i++) {
          const nextCycle = allCycles[idx + i];
          if (!nextCycle) break;
          const exists = await MaintenancePayment.findOne({ societyId, cycleId: nextCycle._id, unitId, isActive: true, gatewayStatus: "paid" }).lean();
          if (exists) continue;
          const amt = unit ? this.getAmountForUnit(nextCycle, unit) : nextCycle.amount;
          const nextReceipt = `RCPT-${nextCycle.year}${String(nextCycle.month).padStart(2, "0")}-${String(unitId).slice(-4).toUpperCase()}-ADV`;
          await MaintenancePayment.findOneAndUpdate(
            { societyId, cycleId: nextCycle._id, unitId },
            {
              societyId,
              cycleId: nextCycle._id,
              unitId,
              paidOn: new Date(),
              method: "Razorpay",
              amount: amt,
              fee: 0,
              totalAmount: amt,
              razorpayOrderId,
              razorpayPaymentId: `${razorpayPaymentId}-adv${i}`,
              razorpaySignature: `${razorpaySignature}-adv${i}`,
              gatewayStatus: "paid",
              receiptNo: nextReceipt,
              recordedBy: userId,
              isActive: true,
              advanceMonths: 1,
              isAdvance: true,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      } catch (e) {
        // Non-critical: log but don't fail main payment
        console.error("Advance auto-apply failed", e?.message);
      }
    }

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
    const isAdmin = await hasMaintenancePermission(societyId, membership.role);
    const myUnitIds = (membership.units || []).map((id) => String(id));
    if (!isAdmin && !myUnitIds.includes(String(unitId))) {
      throw new AppError("This house is not assigned to you", 403);
    }

    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true })
      .populate("ownerId", "name phone email")
      .populate("tenantId", "name phone email")
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
        ownerName: unit.tenantId?.name || unit.ownerId?.name || membership?.userId || "Resident",
        ownerPhone: unit.tenantId?.phone || unit.ownerId?.phone || "",
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

  // Excel export for a cycle - same shape as collections
  async generateExcelBuffer(societyId, cycle) {
    const units = await this.getCycleUnits(societyId, cycle);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ResidentOne";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Maintenance", {
      properties: { tabColor: { argb: "FF6750A4" } },
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const totalCols = 8;
    const widths = [8, 16, 14, 26, 14, 14, 18, 20];
    widths.forEach((w, idx) => {
      sheet.getColumn(idx + 1).width = w;
    });

    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    function periodLabel(month, year, durationMonths = 1) {
      if (!month || !year) return "—";
      if (durationMonths <= 1) return `${MONTHS[month - 1] || month} ${year}`;
      const endMonthIndex = (month - 1 + durationMonths - 1) % 12;
      const endYear = year + Math.floor((month - 1 + durationMonths - 1) / 12);
      return `${MONTHS[month - 1]} ${year} - ${MONTHS[endMonthIndex]} ${endYear}`;
    }

    const period = periodLabel(cycle.month, cycle.year, cycle.durationMonths || 1);
    const title = `${period} Maintenance`;

    // Title row
    sheet.mergeCells(1, 1, 1, totalCols);
    const titleCell = sheet.getCell("A1");
    titleCell.value = title;
    titleCell.font = { size: 16, bold: true, color: { argb: "FF21005D" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F0FF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    titleCell.border = {
      top: { style: "thin", color: { argb: "FFEADDFF" } },
      left: { style: "thin", color: { argb: "FFEADDFF" } },
      bottom: { style: "thin", color: { argb: "FFEADDFF" } },
      right: { style: "thin", color: { argb: "FFEADDFF" } },
    };
    sheet.getRow(1).height = 30;

    // Subtitle
    sheet.mergeCells(2, 1, 2, totalCols);
    const subCell = sheet.getCell("A2");
    const dueStr = cycle.dueDate ? new Date(cycle.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
    const ownerStr = `Owner ₹${Number(cycle.ownerAmount || cycle.amount || 0).toLocaleString("en-IN")}`;
    const renterStr = `Renter ₹${Number(cycle.renterAmount || cycle.amount || 0).toLocaleString("en-IN")}`;
    subCell.value = `${period}  •  ${ownerStr} / ${renterStr}  •  Due ${dueStr}`;
    subCell.font = { size: 10, italic: true, color: { argb: "FF49454F" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 20;

    sheet.mergeCells(3, 1, 3, totalCols);
    sheet.getCell("A3").value = "";
    sheet.getRow(3).height = 8;

    // Header
    const headers = ["Sr No", "House Number", "Owner / Renter", "Name", "Amount", "Status", "Paid Date", "Receipt No"];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6750A4" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCAC4D0" } },
        left: { style: "thin", color: { argb: "FFCAC4D0" } },
        bottom: { style: "thin", color: { argb: "FFCAC4D0" } },
        right: { style: "thin", color: { argb: "FFCAC4D0" } },
      };
    });
    sheet.views = [{ state: "frozen", ySplit: 4 }];
    sheet.autoFilter = { from: "A4", to: `H4` };

    const statusMap = {
      paid: { label: "Paid", color: "FF0B6A2B" },
      pending: { label: "Pending", color: "FF7A4A00" },
      overdue: { label: "Overdue", color: "FFBA1A1A" },
      late_paid: { label: "Late Paid", color: "FF4F378B" },
    };

    units.forEach((unit, idx) => {
      const residentType = unit.tenantId ? "Renter" : unit.ownerId ? "Owner" : "Vacant";
      const name = unit.ownerName || "-";
      const paidDate = unit.paidOn ? new Date(unit.paidOn).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
      const receiptNo = unit.receiptNo || "-";
      const amount = `₹${Number(unit.amount || 0).toLocaleString("en-IN")}`;
      const st = statusMap[unit.status] || { label: unit.status || "Pending", color: "FF1D1B20" };
      const row = sheet.addRow([idx + 1, unit.label || "-", residentType, name, amount, st.label, paidDate, receiptNo]);
      row.height = 18;
      row.font = { size: 10, color: { argb: "FF1D1B20" } };
      row.alignment = { vertical: "middle", wrapText: true };
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(6).font = { size: 10, bold: true, color: { argb: st.color } };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
      const isEven = idx % 2 === 0;
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE7E0EC" } },
          left: { style: "thin", color: { argb: "FFE7E0EC" } },
          bottom: { style: "thin", color: { argb: "FFE7E0EC" } },
          right: { style: "thin", color: { argb: "FFE7E0EC" } },
        };
        if (isEven) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBFE" } };
        else cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F0FF" } };
      });
    });

    if (units.length > 0) {
      sheet.addRow([]);
      const paidCount = units.filter((u) => ["paid", "late_paid"].includes(u.status)).length;
      const pendingCount = units.length - paidCount;
      const lastRowNum = sheet.lastRow ? sheet.lastRow.number + 1 : 6;
      sheet.mergeCells(lastRowNum, 1, lastRowNum, totalCols);
      const summaryCell = sheet.getCell(`A${lastRowNum}`);
      summaryCell.value = `Total Houses: ${units.length}   •   Paid: ${paidCount}   •   Pending/Overdue: ${pendingCount}   •   Generated on ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
      summaryCell.font = { size: 9, italic: true, color: { argb: "FF49454F" } };
      summaryCell.alignment = { horizontal: "center", vertical: "middle" };
      summaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBFE" } };
      summaryCell.border = {
        top: { style: "thin", color: { argb: "FFE7E0EC" } },
        left: { style: "thin", color: { argb: "FFE7E0EC" } },
        bottom: { style: "thin", color: { argb: "FFE7E0EC" } },
        right: { style: "thin", color: { argb: "FFE7E0EC" } },
      };
      sheet.getRow(lastRowNum).height = 18;
    } else {
      const row = sheet.addRow(["-", "-", "-", "No houses found", "-", "-", "-", "-"]);
      row.alignment = { horizontal: "center", vertical: "middle" };
      row.font = { italic: true, color: { argb: "FF49454F" } };
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE7E0EC" } },
          left: { style: "thin", color: { argb: "FFE7E0EC" } },
          bottom: { style: "thin", color: { argb: "FFE7E0EC" } },
          right: { style: "thin", color: { argb: "FFE7E0EC" } },
        };
      });
    }

    sheet.pageSetup.printArea = `A1:H${sheet.rowCount}`;
    sheet.pageSetup.margins = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
    sheet.headerFooter.oddHeader = `&C&10${title.replace(/&/g, "&&")}`;
    sheet.headerFooter.oddFooter = "&CPage &P of &N";

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

module.exports = new MaintenanceService();
