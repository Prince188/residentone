const { Donation, DonationCounter } = require("./donation.model");
const { Unit } = require("../unit/unit.model");
const { Society } = require("../society/society.model");
const { AppError } = require("../../shared/utils/errors");
const { hasPermission } = require("../../shared/permissions");
const ExcelJS = require("exceljs");

function getInitials(societyName) {
  if (!societyName || typeof societyName !== "string") return "DN";
  const words = societyName
    .trim()
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w));
  if (!words.length) return "DN";
  const initials = words.map((w) => w[0].toUpperCase()).join("");
  return initials.slice(0, 8) || "DN";
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

  const counter = await DonationCounter.findOneAndUpdate(
    { societyId, yyyymmdd },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const seqStr = String(counter.seq).padStart(4, "0");
  return `${initials}-${yyyy}-${dd}${seqStr}`;
}

class DonationService {
  async create(societyId, userId, data) {
    const unitId = data.unitId;
    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true }).lean();
    if (!unit) throw new AppError("House not found in this society", 404);

    const collectedAtRaw = data.collectedAt || data.dueDate || data.date;
    const collectedAt = collectedAtRaw ? new Date(collectedAtRaw) : new Date();
    if (isNaN(collectedAt.getTime())) throw new AppError("Invalid date", 400);
    if (collectedAt > new Date()) throw new AppError("Date cannot be in the future", 400);

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount < 1) throw new AppError("Amount must be at least ₹1", 400);

    const purpose = (data.purpose || "").trim();
    if (purpose.length < 3) throw new AppError("Purpose must be at least 3 characters", 400);

    const event = (data.event || "").trim().slice(0, 100);

    const society = await Society.findById(societyId).select("name").lean();
    if (!society) throw new AppError("Society not found", 404);

    const receiptNo = await generateReceiptNo(societyId, society.name, collectedAt);

    const donation = await Donation.create({
      societyId,
      unitId,
      amount,
      purpose,
      event,
      collectedAt,
      receiptNo,
      collectedBy: userId,
      method: "Cash",
    });

    try {
      const socketHelper = require("../../socket");
      socketHelper.emitToSociety(String(societyId), "donation:change", { id: donation._id, action: "create", receiptNo });
      const { notificationService } = require("../notification/notification.service");
      notificationService
        .broadcastNotification({
          societyId,
          title: `Donation Received: ₹${amount.toLocaleString("en-IN")}`,
          body: `${purpose}${event ? ` (${event})` : ""} — House ${unit.label || ""}`,
          type: "donation",
          link: `/donations/${donation._id}`,
          metadata: { donationId: String(donation._id), receiptNo },
        })
        .catch(() => {});
    } catch (_) {}

    return this.mapDonation(donation, unit, society);
  }

  mapDonation(d, unit, society) {
    const obj = typeof d.toObject === "function" ? d.toObject() : d;
    return {
      id: obj._id,
      _id: obj._id,
      receiptNo: obj.receiptNo,
      unitId: obj.unitId,
      amount: obj.amount,
      purpose: obj.purpose,
      event: obj.event || "",
      details: obj.purpose,
      collectedAt: obj.collectedAt,
      method: obj.method || "Cash",
      collectedBy: obj.collectedBy,
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
    const donations = await Donation.find({ societyId, isActive: true })
      .populate("collectedBy", "name phone")
      .sort({ collectedAt: -1, createdAt: -1 })
      .lean();

    if (!donations.length) return [];

    const unitIds = [...new Set(donations.map((d) => String(d.unitId)))];
    const units = await Unit.find({ _id: { $in: unitIds }, societyId })
      .populate("ownerId", "name phone")
      .populate("tenantId", "name phone")
      .lean();
    const unitMap = new Map(units.map((u) => [String(u._id), u]));

    const collectorUserIds = [...new Set(donations.map((d) => d.collectedBy?._id || d.collectedBy).filter(Boolean))];
    const { Membership } = require("../membership/membership.model");
    const [memberships, collectorOwnedUnits] = await Promise.all([
      collectorUserIds.length
        ? Membership.find({ societyId, userId: { $in: collectorUserIds }, isActive: true })
            .populate("units", "label block doorNo")
            .lean()
        : [],
      collectorUserIds.length
        ? Unit.find({ societyId, $or: [{ ownerId: { $in: collectorUserIds } }, { tenantId: { $in: collectorUserIds } }] })
            .select("label block doorNo ownerId tenantId")
            .lean()
        : [],
    ]);
    const membershipMap = new Map(memberships.map((m) => [String(m.userId), m]));
    const collectorUnitMap = new Map();
    collectorOwnedUnits.forEach((u) => {
      if (u.ownerId) collectorUnitMap.set(String(u.ownerId), u);
      if (u.tenantId) collectorUnitMap.set(String(u.tenantId), u);
    });

    return donations.map((d) => {
      const unit = unitMap.get(String(d.unitId));
      const displayName = unit?.tenantId?.name || unit?.ownerId?.name || null;

      let collectorHouse = null;
      if (d.collectedBy) {
        const cId = String(d.collectedBy._id || d.collectedBy);
        const mem = membershipMap.get(cId);
        const memUnit = (mem?.units || []).filter(Boolean)[0];
        const ownedUnit = collectorUnitMap.get(cId);
        const bestUnit = memUnit || ownedUnit;
        if (bestUnit) {
          collectorHouse = bestUnit.label
            ? (/^(house|flat)\b/i.test(bestUnit.label) ? bestUnit.label : `House ${bestUnit.label}`)
            : bestUnit.doorNo
            ? `House ${bestUnit.doorNo}`
            : null;
        }
      }

      const methodLower = String(d.method || "").toLowerCase();
      let receivedByStr = "Society Office";
      if (methodLower.includes("razorpay") || methodLower.includes("online")) {
        receivedByStr = "Online (Razorpay)";
      } else if (collectorHouse) {
        receivedByStr = collectorHouse;
      }

      return {
        id: d._id,
        _id: d._id,
        receiptNo: d.receiptNo,
        unitId: d.unitId,
        unitLabel: unit?.label || d.unitLabel || "",
        block: unit?.block || "",
        floor: unit?.floor || "",
        doorNo: unit?.doorNo || "",
        ownerName: displayName,
        ownerPhone: unit?.tenantId?.phone || unit?.ownerId?.phone || "",
        amount: d.amount,
        purpose: d.purpose,
        details: d.purpose,
        event: d.event || "",
        collectedAt: d.collectedAt,
        method: d.method || "Cash",
        collectedBy: d.collectedBy
          ? {
              id: d.collectedBy._id,
              name: d.collectedBy.name,
              houseNumber: collectorHouse || "Society Office",
            }
          : null,
        receivedBy: receivedByStr,
        createdAt: d.createdAt,
      };
    });
  }

  async listMy(societyId, membership) {
    const myUnitIds = (membership?.units || []).map((id) => String(id));
    if (!myUnitIds.length) return [];
    const donations = await Donation.find({ societyId, isActive: true, unitId: { $in: myUnitIds } })
      .populate("collectedBy", "name")
      .sort({ collectedAt: -1 })
      .lean();

    if (!donations.length) return [];

    const unitIds = [...new Set(donations.map((d) => String(d.unitId)))];
    const units = await Unit.find({ _id: { $in: unitIds }, societyId }).lean();
    const unitMap = new Map(units.map((u) => [String(u._id), u]));

    return donations.map((d) => {
      const unit = unitMap.get(String(d.unitId));
      return {
        id: d._id,
        _id: d._id,
        receiptNo: d.receiptNo,
        unitId: d.unitId,
        unitLabel: unit?.label || "",
        block: unit?.block || "",
        amount: d.amount,
        purpose: d.purpose,
        details: d.purpose,
        event: d.event || "",
        collectedAt: d.collectedAt,
        method: d.method || "Cash",
        createdAt: d.createdAt,
      };
    });
  }

  async getReceipt(societyId, donationId, membership) {
    const donation = await Donation.findOne({ _id: donationId, societyId, isActive: true }).lean();
    if (!donation) throw new AppError("Donation not found", 404);

    const isAdmin = await this.hasCollectPermission(societyId, membership);
    const myUnitIds = (membership?.units || []).map((id) => String(id));
    const isOwner = myUnitIds.includes(String(donation.unitId));
    if (!isAdmin && !isOwner) throw new AppError("This receipt is not assigned to you", 403);

    const [unit, society] = await Promise.all([
      Unit.findOne({ _id: donation.unitId, societyId }).populate("ownerId", "name phone email").populate("tenantId", "name phone email").lean(),
      Society.findById(societyId).lean(),
    ]);
    if (!unit) throw new AppError("House not found", 404);

    let collectedByInfo = null;
    if (donation.collectedBy) {
      const { User } = require("../user/user.model");
      const { Membership } = require("../membership/membership.model");
      const [recUser, recMembership] = await Promise.all([
        User.findById(donation.collectedBy).select("name phone").lean(),
        Membership.findOne({ societyId, userId: donation.collectedBy, isActive: true }).populate("units", "label doorNo").lean(),
      ]);
      if (recUser) {
        let adminUnits = (recMembership?.units || []).filter(Boolean);
        if (!adminUnits.length) {
          const ownedUnits = await Unit.find({ societyId, $or: [{ ownerId: donation.collectedBy }, { tenantId: donation.collectedBy }] }).select("label doorNo").lean();
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
        rid: donation.receiptNo,
        sid: String(societyId),
        a: donation.amount,
        t: donation.amount,
        ts: Math.floor(new Date(donation.collectedAt).getTime() / 1000),
        pid: String(donation._id),
        type: "donation",
      };
      verificationToken = jwt.sign(payload, secret, { expiresIn: "10y" });
      verificationUrl = `residentone://verify?t=${verificationToken}`;
    } catch (e) {
      console.warn("Failed to generate donation verificationToken", e?.message);
    }

    return {
      receiptNo: donation.receiptNo,
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
        ownerName: unit.ownerId?.name || unit.tenantId?.name || "Resident",
        ownerPhone: unit.ownerId?.phone || unit.tenantId?.phone || "",
        renterName: unit.tenantId?.name || null,
        isRented: Boolean(unit.tenantId?.name),
      },
      donation: {
        id: donation._id,
        amount: donation.amount,
        purpose: donation.purpose,
        details: donation.purpose,
        event: donation.event || "",
        collectedAt: donation.collectedAt,
        method: donation.method || "Cash",
        receiptNo: donation.receiptNo,
      },
      payment: {
        amount: donation.amount,
        totalAmount: donation.amount,
        fee: 0,
        method: donation.method || "Cash",
        paidOn: donation.collectedAt,
        receiptNo: donation.receiptNo,
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
      return hasPermission(membership.role, "collect_donations", society?.rolePermissions) || hasPermission(membership.role, "manage_collections", society?.rolePermissions) || hasPermission(membership.role, "manage_maintenance", society?.rolePermissions);
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

    const [society, donations] = await Promise.all([
      Society.findById(societyId).select("name").lean(),
      Donation.find(query)
        .populate("collectedBy", "name phone")
        .sort({ collectedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const unitIds = [...new Set(donations.map((d) => String(d.unitId)).filter(Boolean))];
    const collectorUserIds = [...new Set(donations.map((d) => d.collectedBy?._id || d.collectedBy).filter(Boolean))];

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
    workbook.properties.date1904 = false;

    const sheet = workbook.addWorksheet("Donations", {
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
    titleCell.value = `${society?.name || "Society"} - Donations Report`;
    titleCell.font = { size: 16, bold: true, color: { argb: "FF002116" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F5EE" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    titleCell.border = {
      top: { style: "thin", color: { argb: "FF85E0BA" } },
      left: { style: "thin", color: { argb: "FF85E0BA" } },
      bottom: { style: "thin", color: { argb: "FF85E0BA" } },
      right: { style: "thin", color: { argb: "FF85E0BA" } },
    };
    sheet.getRow(1).height = 30;

    // Subtitle row
    sheet.mergeCells(2, 1, 2, totalCols);
    const subCell = sheet.getCell("A2");
    let filterPeriodLabel = "All Dates";
    if (from && to) {
      filterPeriodLabel = `Period: ${new Date(from).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} to ${new Date(to).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
    } else if (from) {
      filterPeriodLabel = `From: ${new Date(from).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
    } else if (to) {
      filterPeriodLabel = `To: ${new Date(to).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    const totalCollected = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    subCell.value = `${filterPeriodLabel}  •  Total Donations: ${donations.length}  •  Total Collected: ₹${totalCollected.toLocaleString("en-IN")}`;
    subCell.font = { size: 10, italic: true, color: { argb: "FF49454F" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 20;

    // Spacer
    sheet.mergeCells(3, 1, 3, totalCols);
    sheet.getCell("A3").value = "";
    sheet.getRow(3).height = 8;

    // Header row
    const headers = ["Sr No", "Receipt No", "House Number", "Resident Name", "Amount", "Purpose / Event", "Date", "Received By", "Method"];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF006948" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FF004D34" } },
        left: { style: "thin", color: { argb: "FF004D34" } },
        bottom: { style: "thin", color: { argb: "FF004D34" } },
        right: { style: "thin", color: { argb: "FF004D34" } },
      };
    });
    sheet.views = [{ state: "frozen", ySplit: 4 }];
    sheet.autoFilter = { from: "A4", to: "I4" };

    // Data rows
    donations.forEach((d, idx) => {
      const unit = unitMap.get(String(d.unitId));
      const resName = unit?.tenantId?.name || unit?.ownerId?.name || "Resident";
      const houseLabel = unit?.label || "—";
      const amountStr = `₹${Number(d.amount || 0).toLocaleString("en-IN")}`;
      const purposeStr = d.event ? `${d.purpose} (${d.event})` : (d.purpose || "Donation");
      const dateStr = d.collectedAt ? new Date(d.collectedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

      let receivedBy = "Society Office";
      if (d.method && d.method.toLowerCase().includes("razorpay")) {
        receivedBy = "Online (Razorpay)";
      } else if (d.collectedBy) {
        const recUser = d.collectedBy;
        const recUserId = String(recUser._id || recUser);
        const recMembership = membershipMap.get(recUserId);
        const memUnit = (recMembership?.units || []).filter(Boolean)[0];
        const ownedUnit = collectorUnitMap.get(recUserId);
        const firstUnit = memUnit || ownedUnit;
        const houseStr = firstUnit?.label
          ? (/^(house|flat)\b/i.test(firstUnit.label) ? firstUnit.label : `House ${firstUnit.label}`)
          : firstUnit?.doorNo
          ? `House ${firstUnit.doorNo}`
          : "Society Office";
        receivedBy = houseStr;
      }

      const row = sheet.addRow([
        idx + 1,
        d.receiptNo || "—",
        houseLabel,
        resName,
        amountStr,
        purposeStr,
        dateStr,
        receivedBy,
        d.method || "Cash",
      ]);
      row.height = 18;
      row.font = { size: 10, color: { argb: "FF1D1B20" } };
      row.alignment = { vertical: "middle", wrapText: true };
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "left", vertical: "middle" };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };

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
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FAF5" } };
        }
      });
    });

    // Summary footer
    if (donations.length > 0) {
      sheet.addRow([]);
      const lastRowNum = sheet.lastRow ? sheet.lastRow.number + 1 : 6;
      sheet.mergeCells(lastRowNum, 1, lastRowNum, totalCols);
      const summaryCell = sheet.getCell(`A${lastRowNum}`);
      summaryCell.value = `Total Donations: ${donations.length}   •   Total Amount: ₹${totalCollected.toLocaleString("en-IN")}   •   ${filterPeriodLabel}   •   Generated on ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
      summaryCell.font = { size: 9, italic: true, color: { argb: "FF002116" }, bold: true };
      summaryCell.alignment = { horizontal: "center", vertical: "middle" };
      summaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD8FCEA" } };
      summaryCell.border = {
        top: { style: "double", color: { argb: "FF006948" } },
        left: { style: "thin", color: { argb: "FF006948" } },
        bottom: { style: "thin", color: { argb: "FF006948" } },
        right: { style: "thin", color: { argb: "FF006948" } },
      };
      sheet.getRow(lastRowNum).height = 20;
    } else {
      const row = sheet.addRow(["-", "-", "-", "No donations found for selected date range", "-", "-", "-", "-", "-"]);
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

    sheet.pageSetup.printArea = `A1:I${sheet.rowCount}`;
    sheet.pageSetup.margins = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
    sheet.headerFooter.oddHeader = `&C&10Donations Report - ${society?.name || "ResidentOne"}`;
    sheet.headerFooter.oddFooter = "&CPage &P of &N";

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

module.exports = new DonationService();
