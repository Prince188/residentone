const { Collection, CollectionPayment } = require("./collection.model");
const { Unit } = require("../unit/unit.model");
const { AppError } = require("../../shared/utils/errors");
const { Society } = require("../society/society.model");
const { hasPermission } = require("../../shared/permissions");
const ExcelJS = require("exceljs");

async function hasCollectionPermission(societyId, role) {
  if (["super_admin", "society_admin"].includes(role)) return true;
  try {
    const society = await Society.findById(societyId).select("rolePermissions").lean();
    return hasPermission(role, "manage_collections", society?.rolePermissions) || hasPermission(role, "manage_maintenance", society?.rolePermissions);
  } catch {
    return false;
  }
}

class CollectionService {
  async create(societyId, userId, data) {
    const collection = await Collection.create({
      societyId,
      createdBy: userId,
      title: data.title.trim(),
      description: (data.description || "").trim(),
      category: data.category || "festival",
      amount: Number(data.amount),
      dueDate: new Date(data.dueDate),
      status: "active",
    });
    try {
      const socketHelper = require("../../socket");
      socketHelper.emitToSociety(String(societyId), "collection:change", { id: collection._id, action: "create" });
    } catch (_) {}
    return collection;
  }

  async list(societyId) {
    const collections = await Collection.find({ societyId, isActive: true })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();
    // Auto-close if past due? Keep active until manual close, but we can mark isPastDue
    return collections.map((c) => this.mapCollection(c));
  }

  async getById(societyId, collectionId) {
    const collection = await Collection.findOne({ _id: collectionId, societyId, isActive: true })
      .populate("createdBy", "name")
      .lean();
    if (!collection) throw new AppError("Collection not found", 404);
    return this.mapCollection(collection);
  }

  async getRawById(societyId, collectionId) {
    const collection = await Collection.findOne({ _id: collectionId, societyId, isActive: true }).lean();
    if (!collection) throw new AppError("Collection not found", 404);
    return collection;
  }

  mapCollection(c) {
    const isOverdue = new Date(c.dueDate) < new Date() && c.status === "active";
    return {
      id: c._id,
      title: c.title,
      description: c.description,
      category: c.category,
      amount: c.amount,
      dueDate: c.dueDate,
      status: c.status,
      isOverdue,
      createdBy: c.createdBy?._id || c.createdBy,
      createdByName: c.createdBy?.name || "Admin",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  statusFor(payment, collection) {
    if (!payment) {
      return new Date(collection.dueDate) < new Date() ? "overdue" : "pending";
    }
    return new Date(payment.paidOn) <= new Date(collection.dueDate) ? "paid" : "late_paid";
  }

  async getCollectionUnits(societyId, collection) {
    const units = await Unit.find({ societyId, isActive: true })
      .populate("ownerId", "name phone")
      .populate("tenantId", "name phone")
      .sort({ unitNumber: 1, label: 1 })
      .lean();

    const payments = await CollectionPayment.find({
      societyId,
      collectionId: collection._id,
      isActive: true,
    }).lean();

    const paymentByUnit = new Map(payments.map((p) => [String(p.unitId), p]));

    return units.map((unit) => {
      const payment = paymentByUnit.get(String(unit._id));
      const displayName = unit.tenantId?.name || unit.ownerId?.name || null;
      const displayPhone = unit.tenantId?.phone || unit.ownerId?.phone || null;
      return {
        unitId: unit._id,
        label: unit.label,
        ownerName: displayName,
        ownerPhone: displayPhone,
        ownerId: unit.ownerId ? String(unit.ownerId._id || unit.ownerId) : null,
        tenantId: unit.tenantId ? String(unit.tenantId._id || unit.tenantId) : null,
        isOccupied: Boolean(unit.ownerId || unit.tenantId),
        amount: collection.amount,
        status: this.statusFor(payment, collection),
        paidOn: payment?.paidOn || null,
        method: payment?.method || null,
        receiptNo: payment?.receiptNo || null,
        fee: payment?.fee || 0,
        totalAmount: payment?.totalAmount || collection.amount,
        gatewayStatus: payment?.gatewayStatus || "cash",
      };
    });
  }

  async getMyCollections(societyId, membership, collections) {
    const myUnitIds = (membership?.units || []).map((id) => String(id));
    if (!myUnitIds.length) return [];

    const result = [];
    for (const col of collections) {
      const payments = await CollectionPayment.find({
        societyId,
        collectionId: col._id,
        unitId: { $in: myUnitIds },
        isActive: true,
      }).lean();
      const paymentByUnit = new Map(payments.map((p) => [String(p.unitId), p]));
      const myUnits = myUnitIds.map((uid) => {
        const payment = paymentByUnit.get(uid);
        return {
          unitId: uid,
          status: this.statusFor(payment, col),
          paidOn: payment?.paidOn || null,
          receiptNo: payment?.receiptNo || null,
        };
      });
      const allPaid = myUnits.every((u) => ["paid", "late_paid"].includes(u.status));
      result.push({
        ...this.mapCollection(col),
        myUnits,
        allPaid,
        pendingCount: myUnits.filter((u) => !["paid", "late_paid"].includes(u.status)).length,
      });
    }
    return result;
  }

  async getUnitDetail(societyId, collection, unitId, membership) {
    const isAdmin = await hasCollectionPermission(societyId, membership.role);
    const myUnitIds = (membership.units || []).map((id) => String(id));
    const isMyUnit = myUnitIds.includes(String(unitId));
    if (!isAdmin && !isMyUnit) throw new AppError("This house is not assigned to you", 403);

    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true })
      .populate("ownerId", "name phone")
      .populate("tenantId", "name phone")
      .lean();
    if (!unit) throw new AppError("House not found", 404);

    const payment = await CollectionPayment.findOne({
      societyId,
      collectionId: collection._id,
      unitId,
      isActive: true,
    }).lean();

    const ownerIdStr = unit.ownerId ? String(unit.ownerId._id || unit.ownerId) : null;
    const tenantIdStr = unit.tenantId ? String(unit.tenantId._id || unit.tenantId) : null;
    const userIdStr = String(membership.userId);
    const isOwnerFlag = ownerIdStr ? ownerIdStr === userIdStr : false;
    const isTenantFlag = tenantIdStr ? tenantIdStr === userIdStr : false;

    return {
      unitId: unit._id,
      label: unit.label,
      block: unit.block,
      floor: unit.floor,
      doorNo: unit.doorNo,
      ownerName: unit.tenantId?.name || unit.ownerId?.name || null,
      ownerPhone: unit.tenantId?.phone || unit.ownerId?.phone || null,
      isOwner: isOwnerFlag,
      isTenant: isTenantFlag,
      isRenterOccupied: Boolean(unit.tenantId),
      amount: collection.amount,
      dueAmount: collection.amount,
      status: this.statusFor(payment, collection),
      paidOn: payment?.paidOn || null,
      method: payment?.method || null,
      receiptNo: payment?.receiptNo || null,
      fee: payment?.fee || 0,
      totalAmount: payment?.totalAmount || collection.amount,
      gatewayStatus: payment?.gatewayStatus || "cash",
      collection: this.mapCollection(collection),
    };
  }

  async recordPayment(societyId, collection, unitId, userId, data) {
    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true });
    if (!unit) throw new AppError("House not found", 404);
    const paidOn = data.paidOn ? new Date(data.paidOn) : new Date();
    const receiptNo = `CC-${String(collection._id).slice(-4).toUpperCase()}-${String(unitId).slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    return CollectionPayment.findOneAndUpdate(
      { societyId, collectionId: collection._id, unitId },
      {
        societyId,
        collectionId: collection._id,
        unitId,
        paidOn,
        method: data.method || "Cash",
        amount: collection.amount,
        fee: 0,
        totalAmount: collection.amount,
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

  async createRazorpayOrder(societyId, collection, unitId, userId) {
    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true });
    if (!unit) throw new AppError("House not found", 404);
    const existing = await CollectionPayment.findOne({
      societyId,
      collectionId: collection._id,
      unitId,
      isActive: true,
      gatewayStatus: "paid",
    }).lean();
    if (existing) throw new AppError("Payment already recorded for this house", 409);

    const { createOrder } = require("../../shared/services/razorpay.service");
    const receipt = `cc_${String(collection._id).slice(-6)}_${String(unitId).slice(-6)}`;
    const order = await createOrder({ amount: collection.amount, receipt });

    await CollectionPayment.findOneAndUpdate(
      { societyId, collectionId: collection._id, unitId },
      {
        societyId,
        collectionId: collection._id,
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

  async verifyRazorpayPayment(societyId, collection, unitId, userId, data) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError("Missing Razorpay payment details", 400);
    }
    const { verifySignature } = require("../../shared/services/razorpay.service");
    const isValid = verifySignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature });
    if (!isValid) throw new AppError("Invalid Razorpay signature", 400);

    const pending = await CollectionPayment.findOne({
      societyId,
      collectionId: collection._id,
      unitId,
      razorpayOrderId,
    });
    if (!pending) throw new AppError("Order not found. Create order first.", 404);

    const receiptNo = `CC-${String(collection._id).slice(-4).toUpperCase()}-${String(unitId).slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const updated = await CollectionPayment.findOneAndUpdate(
      { societyId, collectionId: collection._id, unitId },
      {
        societyId,
        collectionId: collection._id,
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

  async removePayment(societyId, collection, unitId) {
    const result = await CollectionPayment.findOneAndUpdate(
      { societyId, collectionId: collection._id, unitId, isActive: true },
      { isActive: false },
      { new: true }
    ).lean();
    if (!result) throw new AppError("No recorded payment found", 404);
    return result;
  }

  async closeCollection(societyId, collectionId) {
    const col = await Collection.findOne({ _id: collectionId, societyId, isActive: true });
    if (!col) throw new AppError("Collection not found", 404);
    if (col.status === "closed") throw new AppError("Already closed", 400);
    col.status = "closed";
    await col.save();
    try { const s = require("../../socket"); s.emitToSociety(String(societyId), "collection:change", { id: collectionId, action: "close" }); } catch (_) {}
    return col;
  }

  async deleteCollection(societyId, collectionId) {
    const col = await Collection.findOne({ _id: collectionId, societyId, isActive: true });
    if (!col) throw new AppError("Collection not found", 404);
    col.isActive = false;
    await col.save();
    return col;
  }

  async generateExcelBuffer(societyId, collection) {
    const units = await this.getCollectionUnits(societyId, collection);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ResidentOne";
    workbook.created = new Date();
    workbook.properties.date1904 = false;

    const sheet = workbook.addWorksheet("Collection", {
      properties: { tabColor: { argb: "FF6750A4" } },
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const totalCols = 8;

    // Column widths
    const widths = [8, 16, 14, 26, 14, 14, 18, 20];
    widths.forEach((w, idx) => {
      sheet.getColumn(idx + 1).width = w;
    });

    // --- Title row (merged) : collection name ---
    sheet.mergeCells(1, 1, 1, totalCols);
    const titleCell = sheet.getCell("A1");
    titleCell.value = collection.title;
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

    // --- Subtitle row : category + amount + due date + status ---
    sheet.mergeCells(2, 1, 2, totalCols);
    const subCell = sheet.getCell("A2");
    const dueStr = collection.dueDate ? new Date(collection.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
    const catLabel = collection.category ? collection.category.charAt(0).toUpperCase() + collection.category.slice(1) : "Collection";
    const amountStr = `₹${Number(collection.amount || 0).toLocaleString("en-IN")} per house`;
    const statusLabel = collection.status === "closed" ? "Closed" : collection.status === "active" ? "Active" : collection.status;
    subCell.value = `${catLabel}  •  ${amountStr}  •  Due ${dueStr}  •  ${statusLabel}`;
    subCell.font = { size: 10, italic: true, color: { argb: "FF49454F" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 20;

    // --- Blank spacer row ---
    sheet.mergeCells(3, 1, 3, totalCols);
    sheet.getCell("A3").value = "";
    sheet.getRow(3).height = 8;

    // --- Header row ---
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

    // --- Data rows ---
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
      // Alignments per cell
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(6).font = { size: 10, bold: true, color: { argb: st.color } };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };

      // Borders and zebra striping
      const isEven = idx % 2 === 0;
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE7E0EC" } },
          left: { style: "thin", color: { argb: "FFE7E0EC" } },
          bottom: { style: "thin", color: { argb: "FFE7E0EC" } },
          right: { style: "thin", color: { argb: "FFE7E0EC" } },
        };
        if (isEven) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBFE" } };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F0FF" } };
        }
      });
    });

    // --- Summary footer ---
    if (units.length > 0) {
      // blank row before summary
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
      // No units case: add placeholder row
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

    // Print settings
    sheet.pageSetup.printArea = `A1:H${sheet.rowCount}`;
    sheet.pageSetup.margins = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
    sheet.headerFooter.oddHeader = `&C&10${collection.title.replace(/&/g, "&&")}`;
    sheet.headerFooter.oddFooter = "&CPage &P of &N";

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async update(societyId, collectionId, data) {
    const col = await Collection.findOne({ _id: collectionId, societyId, isActive: true });
    if (!col) throw new AppError("Collection fund not found", 404);

    const paymentsCount = await CollectionPayment.countDocuments({ collectionId, societyId, isActive: true, gatewayStatus: { $ne: "created" } });

    if (data.amount !== undefined && Number(data.amount) !== Number(col.amount)) {
      if (paymentsCount > 0) {
        throw new AppError(
          "Cannot modify collection target amount because payments have already been collected. You can still update the due date, title, and description.",
          400
        );
      }
      col.amount = Number(data.amount);
    }

    if (data.title !== undefined) col.title = data.title.trim();
    if (data.description !== undefined) col.description = (data.description || "").trim();
    if (data.category !== undefined) col.category = data.category;
    if (data.dueDate !== undefined) col.dueDate = new Date(data.dueDate);
    if (data.status !== undefined) col.status = data.status;

    await col.save();
    try {
      const socketHelper = require("../../socket");
      socketHelper.emitToSociety(String(societyId), "collection:change", { id: col._id, action: "update" });
    } catch (_) {}
    return this.mapCollection(col);
  }
}

module.exports = new CollectionService();
