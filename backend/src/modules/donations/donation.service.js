const { Donation, DonationCounter } = require("./donation.model");
const { Unit } = require("../unit/unit.model");
const { Society } = require("../society/society.model");
const { AppError } = require("../../shared/utils/errors");
const { hasPermission } = require("../../shared/permissions");

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

    return donations.map((d) => {
      const unit = unitMap.get(String(d.unitId));
      const displayName = unit?.tenantId?.name || unit?.ownerId?.name || null;
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
        collectedBy: d.collectedBy ? { id: d.collectedBy._id, name: d.collectedBy.name } : null,
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
        Membership.findOne({ societyId, userId: donation.collectedBy, isActive: true }).populate("units", "label").lean(),
      ]);
      if (recUser) {
        collectedByInfo = { name: recUser.name, phone: recUser.phone };
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
}

module.exports = new DonationService();
