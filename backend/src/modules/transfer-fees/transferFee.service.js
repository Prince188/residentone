const { TransferFee, TransferFeeCounter } = require("./transferFee.model");
const { Unit } = require("../unit/unit.model");
const { Society } = require("../society/society.model");
const { AppError } = require("../../shared/utils/errors");
const { hasPermission } = require("../../shared/permissions");
const ExcelJS = require("exceljs");

function getInitials(societyName) {
  if (!societyName || typeof societyName !== "string") return "TF";
  const words = societyName
    .trim()
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w));
  if (!words.length) return "TF";
  const initials = words.map((w) => w[0].toUpperCase()).join("");
  return initials.slice(0, 8) || "TF";
}

function formatYyyymmdd(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

async function generateReceiptNo(societyId, societyName, collectedAt) {
  const initials = getInitials(societyName);
  const dateObj = new Date(collectedAt);
  const yyyy = dateObj.getFullYear();
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const yyyymmdd = formatYyyymmdd(dateObj);

  const counter = await TransferFeeCounter.findOneAndUpdate(
    { societyId, yyyymmdd },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const seqStr = String(counter.seq).padStart(4, "0");
  return `TF-${initials}-${yyyy}-${dd}${seqStr}`;
}

const FEE_TYPE_LABELS = {
  ownership_transfer: "Ownership Transfer Fee",
  tenant_move_in: "Tenant Move-In Fee",
  noc_fee: "NOC & Share Certificate Fee",
  parking_transfer: "Parking Transfer Fee",
  other: "Transfer & Move-In Fee",
};

class TransferFeeService {
  async create(societyId, userId, data) {
    const unitId = data.unitId;
    const unit = await Unit.findOne({ _id: unitId, societyId }).lean();
    if (!unit) throw new AppError("House not found in this society", 404);

    const collectedAtRaw = data.collectedAt || data.dueDate || data.date;
    const collectedAt = collectedAtRaw ? new Date(collectedAtRaw) : new Date();
    if (isNaN(collectedAt.getTime())) throw new AppError("Invalid date", 400);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    if (collectedAt > endOfToday) throw new AppError("Date cannot be in the future", 400);

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount < 1) throw new AppError("Amount must be at least ₹1", 400);

    const payerName = (data.payerName || "").trim();
    if (!payerName) throw new AppError("Payer Name is required", 400);

    const payerPhone = (data.payerPhone || "").trim();
    const payerRole = ["owner", "tenant"].includes(data.payerRole) ? data.payerRole : "owner";
    const feeType = ["ownership_transfer", "tenant_move_in", "noc_fee", "parking_transfer", "other"].includes(data.feeType)
      ? data.feeType
      : "ownership_transfer";
    const notes = (data.notes || "").trim();

    const society = await Society.findById(societyId).select("name").lean();
    if (!society) throw new AppError("Society not found", 404);

    const receiptNo = await generateReceiptNo(societyId, society.name, collectedAt);

    const feeRecord = await TransferFee.create({
      societyId,
      unitId,
      payerName,
      payerPhone,
      payerRole,
      feeType,
      amount,
      collectedAt,
      receiptNo,
      collectedBy: userId,
      method: "Cash",
      notes,
    });

    try {
      const socketHelper = require("../../socket");
      socketHelper.emitToSociety(String(societyId), "transferFee:change", { id: feeRecord._id, action: "create", receiptNo });
      const { notificationService } = require("../notification/notification.service");
      notificationService
        .broadcastNotification({
          societyId,
          title: `Transfer Fee Received: ₹${amount.toLocaleString("en-IN")}`,
          body: `${FEE_TYPE_LABELS[feeType]} — House ${unit.label || ""} (${payerName})`,
          type: "transfer_fee",
          link: `/transfer-fees/${feeRecord._id}`,
          metadata: { transferFeeId: String(feeRecord._id), receiptNo },
        })
        .catch(() => {});
    } catch (_) {}

    return this.mapTransferFee(feeRecord, unit, society);
  }

  mapTransferFee(tf, unit, society) {
    const obj = typeof tf.toObject === "function" ? tf.toObject() : tf;
    return {
      id: obj._id,
      _id: obj._id,
      receiptNo: obj.receiptNo,
      unitId: obj.unitId,
      payerName: obj.payerName,
      payerPhone: obj.payerPhone || "",
      payerRole: obj.payerRole || "owner",
      feeType: obj.feeType || "ownership_transfer",
      feeTypeLabel: FEE_TYPE_LABELS[obj.feeType] || "Transfer Fee",
      amount: obj.amount,
      collectedAt: obj.collectedAt,
      method: obj.method || "Cash",
      collectedBy: obj.collectedBy,
      notes: obj.notes || "",
      societyId: obj.societyId,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
      unit: unit
        ? {
            id: unit._id,
            _id: unit._id,
            label: unit.label,
            block: unit.block,
            floor: unit.floor,
            doorNo: unit.doorNo,
            ownerName: unit.ownerId?.name || unit.ownerName || null,
          }
        : null,
      society: society ? { name: society.name } : null,
    };
  }

  async list(societyId) {
    const records = await TransferFee.find({ societyId, isActive: true })
      .populate("collectedBy", "name phone")
      .sort({ collectedAt: -1, createdAt: -1 })
      .lean();

    if (!records.length) return [];

    const unitIds = [...new Set(records.map((r) => String(r.unitId)))];
    const units = await Unit.find({ _id: { $in: unitIds }, societyId })
      .populate("ownerId", "name phone")
      .populate("tenantId", "name phone")
      .lean();
    const unitMap = new Map(units.map((u) => [String(u._id), u]));

    return records.map((r) => {
      const unit = unitMap.get(String(r.unitId));
      return {
        id: r._id,
        _id: r._id,
        receiptNo: r.receiptNo,
        unitId: r.unitId,
        unitLabel: unit?.label || "",
        block: unit?.block || "",
        floor: unit?.floor || "",
        doorNo: unit?.doorNo || "",
        payerName: r.payerName,
        payerPhone: r.payerPhone || "",
        payerRole: r.payerRole || "owner",
        feeType: r.feeType || "ownership_transfer",
        feeTypeLabel: FEE_TYPE_LABELS[r.feeType] || "Transfer Fee",
        amount: r.amount,
        notes: r.notes || "",
        collectedAt: r.collectedAt,
        method: r.method || "Cash",
        collectedBy: r.collectedBy
          ? {
              id: r.collectedBy._id,
              name: r.collectedBy.name,
            }
          : null,
        createdAt: r.createdAt,
      };
    });
  }

  async listMy(societyId, membership) {
    const myUnitIds = (membership?.units || []).map((id) => String(id));
    if (!myUnitIds.length) return [];
    const records = await TransferFee.find({ societyId, isActive: true, unitId: { $in: myUnitIds } })
      .populate("collectedBy", "name")
      .sort({ collectedAt: -1 })
      .lean();

    if (!records.length) return [];

    const unitIds = [...new Set(records.map((r) => String(r.unitId)))];
    const units = await Unit.find({ _id: { $in: unitIds }, societyId }).lean();
    const unitMap = new Map(units.map((u) => [String(u._id), u]));

    return records.map((r) => {
      const unit = unitMap.get(String(r.unitId));
      return {
        id: r._id,
        _id: r._id,
        receiptNo: r.receiptNo,
        unitId: r.unitId,
        unitLabel: unit?.label || "",
        block: unit?.block || "",
        payerName: r.payerName,
        payerPhone: r.payerPhone || "",
        payerRole: r.payerRole || "owner",
        feeType: r.feeType || "ownership_transfer",
        feeTypeLabel: FEE_TYPE_LABELS[r.feeType] || "Transfer Fee",
        amount: r.amount,
        notes: r.notes || "",
        collectedAt: r.collectedAt,
        method: r.method || "Cash",
        createdAt: r.createdAt,
      };
    });
  }

  async getReceipt(societyId, transferFeeId, membership) {
    const record = await TransferFee.findOne({ _id: transferFeeId, societyId, isActive: true }).lean();
    if (!record) throw new AppError("Transfer fee record not found", 404);

    const isAdmin = await this.hasCollectPermission(societyId, membership);
    const myUnitIds = (membership?.units || []).map((id) => String(id));
    const isOwner = myUnitIds.includes(String(record.unitId));
    if (!isAdmin && !isOwner) throw new AppError("This receipt is not assigned to you", 403);

    const [unit, society] = await Promise.all([
      Unit.findOne({ _id: record.unitId, societyId }).populate("ownerId", "name phone email").populate("tenantId", "name phone email").lean(),
      Society.findById(societyId).lean(),
    ]);
    if (!unit) throw new AppError("House not found", 404);

    let collectedByInfo = null;
    if (record.collectedBy) {
      const { User } = require("../user/user.model");
      const { Membership } = require("../membership/membership.model");
      const [recUser, recMembership] = await Promise.all([
        User.findById(record.collectedBy).select("name phone").lean(),
        Membership.findOne({ societyId, userId: record.collectedBy, isActive: true }).populate("units", "label doorNo").lean(),
      ]);
      if (recUser) {
        let adminUnits = (recMembership?.units || []).filter(Boolean);
        if (!adminUnits.length) {
          const ownedUnits = await Unit.find({ societyId, $or: [{ ownerId: record.collectedBy }, { tenantId: record.collectedBy }] }).select("label doorNo").lean();
          if (ownedUnits.length) adminUnits = ownedUnits;
        }
        const firstUnit = adminUnits[0];
        const houseLabel = firstUnit?.label
          ? (/^(house|flat)\b/i.test(firstUnit.label) ? firstUnit.label : `House ${firstUnit.label}`)
          : firstUnit?.doorNo
          ? `House ${firstUnit.doorNo}`
          : "Society Office";
        collectedByInfo = { name: recUser.name, phone: recUser.phone, houseNumber: houseLabel };
      }
    }

    let verificationToken = null;
    let verificationUrl = null;
    try {
      const jwt = require("jsonwebtoken");
      const { config } = require("../../config");
      const secret = config.jwt.receiptSecret || config.jwt.accessSecret;
      const payload = {
        rid: record.receiptNo,
        sid: String(societyId),
        a: record.amount,
        t: record.amount,
        ts: Math.floor(new Date(record.collectedAt).getTime() / 1000),
        pid: String(record._id),
        type: "transfer_fee",
      };
      verificationToken = jwt.sign(payload, secret, { expiresIn: "10y" });
      verificationUrl = `residentone://verify?t=${verificationToken}`;
    } catch (e) {
      console.warn("Failed to generate transfer fee verificationToken", e?.message);
    }

    return {
      receiptNo: record.receiptNo,
      verificationToken,
      verificationUrl,
      token: verificationToken,
      society: {
        id: society?._id || societyId,
        _id: society?._id || societyId,
        name: society?.name || "Society",
        address: society ? `${society.address}, ${society.city}, ${society.state} - ${society.pincode}` : "",
        logoUrl: society?.logoUrl || null,
      },
      unit: {
        id: unit._id,
        label: unit.label,
        block: unit.block,
        floor: unit.floor,
        doorNo: unit.doorNo,
        ownerName: record.payerName || unit.ownerId?.name || "Resident",
        ownerPhone: record.payerPhone || unit.ownerId?.phone || "",
      },
      transferFee: {
        id: record._id,
        amount: record.amount,
        payerName: record.payerName,
        payerPhone: record.payerPhone || "",
        payerRole: record.payerRole || "owner",
        feeType: record.feeType || "ownership_transfer",
        feeTypeLabel: FEE_TYPE_LABELS[record.feeType] || "Transfer Fee",
        notes: record.notes || "",
        collectedAt: record.collectedAt,
        method: record.method || "Cash",
        receiptNo: record.receiptNo,
      },
      payment: {
        amount: record.amount,
        totalAmount: record.amount,
        fee: 0,
        method: record.method || "Cash",
        paidOn: record.collectedAt,
        receiptNo: record.receiptNo,
        collectedBy: collectedByInfo,
      },
      collectedBy: collectedByInfo,
      status: "paid",
    };
  }

  async hasCollectPermission(societyId, membership) {
    if (!membership) return false;
    const roles = [membership.role, ...((membership.additionalRoles) || [])];
    if (roles.includes("society_admin") || roles.includes("super_admin")) return true;
    try {
      const society = await Society.findById(societyId).select("rolePermissions").lean();
      return hasPermission(membership.role, "manage_houses", society?.rolePermissions) || hasPermission(membership.role, "manage_society", society?.rolePermissions);
    } catch {
      return false;
    }
  }

  async generateExcelBuffer(societyId, options = {}) {
    const { from, to } = options || {};
    const query = { societyId, isActive: true };

    if (from || to) {
      query.collectedAt = {};
      if (from) query.collectedAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) query.collectedAt.$lte = new Date(`${to}T23:59:59.999Z`);
    }

    const [society, records] = await Promise.all([
      Society.findById(societyId).select("name").lean(),
      TransferFee.find(query)
        .populate("collectedBy", "name phone")
        .sort({ collectedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const unitIds = [...new Set(records.map((r) => String(r.unitId)).filter(Boolean))];
    const collectorUserIds = [...new Set(records.map((r) => r.collectedBy?._id || r.collectedBy).filter(Boolean))];

    const [units, memberships, collectorOwnedUnits] = await Promise.all([
      unitIds.length ? Unit.find({ _id: { $in: unitIds }, societyId }).populate("ownerId", "name phone").populate("tenantId", "name phone").lean() : [],
      collectorUserIds.length
        ? require("../membership/membership.model").Membership.find({ societyId, userId: { $in: collectorUserIds }, isActive: true })
            .populate("units", "label block doorNo")
            .lean()
        : [],
      collectorUserIds.length
        ? Unit.find({ societyId, $or: [{ ownerId: { $in: collectorUserIds } }, { tenantId: { $in: collectorUserIds } }] })
            .select("label doorNo ownerId tenantId")
            .lean()
        : [],
    ]);

    const unitMap = new Map(units.map((u) => [String(u._id), u]));
    const membershipMap = new Map(memberships.map((m) => [String(m.userId), m]));
    const collectorUnitMap = new Map();
    collectorOwnedUnits.forEach((u) => {
      if (u.ownerId) collectorUnitMap.set(String(u.ownerId), u);
      if (u.tenantId) collectorUnitMap.set(String(u.tenantId), u);
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ResidentOne";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Transfer Fees", {
      properties: { tabColor: { argb: "FF006948" } },
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const totalCols = 9;
    const widths = [8, 18, 14, 22, 14, 26, 16, 24, 12];
    widths.forEach((w, idx) => {
      sheet.getColumn(idx + 1).width = w;
    });

    // Title row
    sheet.mergeCells(1, 1, 1, totalCols);
    const titleCell = sheet.getCell("A1");
    titleCell.value = `${society?.name || "Society"} - Transfer Fees Report`;
    titleCell.font = { size: 16, bold: true, color: { argb: "FF002116" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F5EE" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    sheet.getRow(1).height = 30;

    // Subtitle row
    sheet.mergeCells(2, 1, 2, totalCols);
    const subCell = sheet.getCell("A2");
    const totalCollected = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    subCell.value = `Total Records: ${records.length}  •  Total Collected: ₹${totalCollected.toLocaleString("en-IN")}`;
    subCell.font = { size: 10, italic: true, color: { argb: "FF49454F" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 20;

    // Header row
    const headers = ["Sr No", "Receipt No", "House Number", "Payer Name", "Amount", "Fee Type", "Date", "Collected By", "Method"];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF006948" } };
    });

    // Data rows
    records.forEach((r, idx) => {
      const unit = unitMap.get(String(r.unitId));
      const houseLabel = unit?.label || "—";
      const amountStr = `₹${Number(r.amount || 0).toLocaleString("en-IN")}`;
      const typeStr = FEE_TYPE_LABELS[r.feeType] || "Transfer Fee";
      const dateStr = r.collectedAt ? new Date(r.collectedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

      const row = sheet.addRow([
        idx + 1,
        r.receiptNo || "—",
        houseLabel,
        r.payerName,
        amountStr,
        typeStr,
        dateStr,
        r.collectedBy?.name || "Society Office",
        r.method || "Cash",
      ]);
      row.height = 18;
      row.alignment = { vertical: "middle" };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

module.exports = new TransferFeeService();
