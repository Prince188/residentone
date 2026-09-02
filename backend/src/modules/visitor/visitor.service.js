const { Visitor } = require("./visitor.model");
const { Unit } = require("../unit/unit.model");
const { Society } = require("../society/society.model");
const { User } = require("../user/user.model");
const { Membership } = require("../membership/membership.model");
const { AppError } = require("../../shared/utils/errors");
const { hasPermission } = require("../../shared/permissions");
const { notificationService } = require("../notification/notification.service");
const { emitToSociety, emitToUser } = require("../../socket");

function generatePasscode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateParcelCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

class VisitorService {
  async canManageVisitors(societyId, membership) {
    if (!membership) return false;
    if (["super_admin", "society_admin"].includes(membership.role)) return true;
    try {
      const society = await Society.findById(societyId).select("rolePermissions").lean();
      return hasPermission(membership.role, "manage_visitors", society?.rolePermissions);
    } catch {
      return false;
    }
  }

  async getMyUnitIds(membership) {
    return (membership?.units || []).map((u) => String(u._id || u.id || u));
  }

  async createPreApproval(societyId, userId, membership, data) {
    const targetUnitId = String(data.unitId).trim();
    const myUnitIds = await this.getMyUnitIds(membership);

    if (!myUnitIds.includes(targetUnitId)) {
      throw new AppError("You can only pre-approve visitors for your own assigned house", 403);
    }

    const unit = await Unit.findOne({ _id: targetUnitId, societyId, isActive: true })
      .populate("ownerId", "name phone")
      .populate("tenantId", "name phone")
      .lean();

    if (!unit) throw new AppError("House not found in this society", 404);

    let passcode = generatePasscode();
    // Ensure passcode is unique among active visitors for this society
    let attempts = 0;
    while (attempts < 5) {
      const existing = await Visitor.findOne({
        societyId,
        passcode,
        status: { $in: ["approved", "pending_approval", "inside"] },
      });
      if (!existing) break;
      passcode = generatePasscode();
      attempts++;
    }

    const validFrom = data.validFrom ? new Date(data.validFrom) : new Date();
    let validUntil;
    if (data.validUntil) {
      validUntil = new Date(data.validUntil);
    } else {
      // Default: valid until end of the day (23:59:59)
      validUntil = new Date(validFrom);
      validUntil.setHours(23, 59, 59, 999);
    }

    const visitor = await Visitor.create({
      societyId,
      unitId: targetUnitId,
      hostUserId: userId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      visitorType: data.visitorType || "guest",
      company: data.company?.trim() || "",
      vehicleNumber: data.vehicleNumber?.trim()?.toUpperCase() || "",
      passcode,
      passType: "pre_approved",
      status: "approved",
      validFrom,
      validUntil,
      notes: data.notes?.trim() || "",
    });

    const populated = await Visitor.findById(visitor._id)
      .populate("unitId", "label doorNo block floor")
      .populate("hostUserId", "name phone")
      .populate("societyId", "name address city")
      .lean();

    // Broadcast real-time event to society gate
    try {
      emitToSociety(societyId, "visitor:pre_approved", populated);
      emitToSociety(societyId, "visitor:change", populated);
    } catch (_) {}

    return populated;
  }

  async createWalkIn(societyId, guardUserId, membership, data) {
    const canManage = await this.canManageVisitors(societyId, membership);
    if (!canManage) {
      throw new AppError("Only security guards or society admins can log walk-in visitors", 403);
    }

    const targetUnitId = String(data.unitId).trim();
    const unit = await Unit.findOne({ _id: targetUnitId, societyId, isActive: true })
      .populate("ownerId", "name phone")
      .populate("tenantId", "name phone")
      .lean();

    if (!unit) throw new AppError("House not found in this society", 404);

    const hostUserId = unit.tenantId?._id || unit.ownerId?._id;
    if (!hostUserId) {
      throw new AppError("This house is currently vacant. Cannot assign a visitor without a resident.", 400);
    }

    const passcode = generatePasscode();
    const validFrom = new Date();
    const validUntil = new Date(validFrom.getTime() + 4 * 60 * 60 * 1000); // 4 hours validity

    const isParcel = Boolean(data.isParcel);
    let parcelDetails = { isParcel: false, parcelCode: "" };
    if (isParcel) {
      parcelDetails = {
        isParcel: true,
        parcelCode: generateParcelCode(),
        collectedAt: null,
      };
    }

    const visitor = await Visitor.create({
      societyId,
      unitId: targetUnitId,
      hostUserId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      visitorType: data.visitorType || (isParcel ? "delivery" : "guest"),
      company: data.company?.trim() || "",
      vehicleNumber: data.vehicleNumber?.trim()?.toUpperCase() || "",
      passcode,
      passType: "walk_in",
      status: "pending_approval",
      validFrom,
      validUntil,
      notes: data.notes?.trim() || "",
      parcelDetails,
    });

    const populated = await Visitor.findById(visitor._id)
      .populate("unitId", "label doorNo block floor")
      .populate("hostUserId", "name phone")
      .populate("societyId", "name address city")
      .lean();

    // Find all residents/family members attached to this specific house
    const unitMemberships = await Membership.find({
      societyId,
      units: targetUnitId,
      status: "active",
    }).select("userId").lean();

    const targetUserIds = new Set();
    if (hostUserId) targetUserIds.add(String(hostUserId));
    unitMemberships.forEach((m) => {
      if (m.userId) targetUserIds.add(String(m.userId));
    });

    // Targeted socket emission ONLY to residents of this specific house
    try {
      targetUserIds.forEach((uid) => {
        emitToUser(uid, "visitor:approval_request", populated);
        emitToUser(uid, "visitor:change", populated);
      });
      // General update for list query invalidation across society (without ringing modal)
      emitToSociety(societyId, "visitor:change", populated);
    } catch (_) {}

    // Send in-app notification to all house residents
    try {
      const typeLabel = data.visitorType ? data.visitorType.toUpperCase() : "VISITOR";
      for (const uid of targetUserIds) {
        await notificationService.createNotification({
          societyId,
          userId: uid,
          type: "visitor",
          title: `Gate Alert: ${populated.name} at Main Gate`,
          message: `${populated.name} (${typeLabel}${populated.company ? ` · ${populated.company}` : ""}) is requesting entry to House ${unit.label}.`,
          link: "/visitors",
          metadata: {
            visitorId: String(populated._id),
            status: populated.status,
            visitorType: populated.visitorType,
            name: populated.name,
          },
        });
      }
    } catch (_) {}

    return populated;
  }

  async respondApproval(societyId, visitorId, residentUserId, membership, action) {
    const visitor = await Visitor.findOne({ _id: visitorId, societyId });
    if (!visitor) throw new AppError("Visitor request not found", 404);

    const myUnitIds = await this.getMyUnitIds(membership);
    const canManage = await this.canManageVisitors(societyId, membership);
    const isHost = String(visitor.hostUserId) === String(residentUserId);
    const isUnitResident = myUnitIds.includes(String(visitor.unitId));

    if (!canManage && !isHost && !isUnitResident) {
      throw new AppError("You do not have permission to approve/deny visitors for this house", 403);
    }

    const normAction = String(action || "").toLowerCase().trim();
    if (normAction === "approve" || normAction === "approved") {
      visitor.status = "approved";
      visitor.approvedBy = residentUserId;
    } else if (normAction === "reject" || normAction === "rejected" || normAction === "deny" || normAction === "denied") {
      visitor.status = "rejected";
    } else if (normAction === "leave_at_gate" || normAction === "gate") {
      visitor.status = "left_at_gate";
      if (!visitor.parcelDetails?.parcelCode) {
        visitor.parcelDetails = {
          isParcel: true,
          parcelCode: generateParcelCode(),
          collectedAt: null,
        };
      }
    } else {
      throw new AppError("Invalid approval action", 400);
    }

    await visitor.save();

    const populated = await Visitor.findById(visitor._id)
      .populate("unitId", "label doorNo block floor")
      .populate("hostUserId", "name phone")
      .populate("approvedBy", "name")
      .lean();

    // Broadcast real-time response to Gate Guards & Residents
    try {
      emitToSociety(societyId, "visitor:approval_response", populated);
      emitToSociety(societyId, "visitor:change", populated);
      if (visitor.hostUserId) {
        emitToUser(String(visitor.hostUserId), "visitor:approval_response", populated);
      }
    } catch (_) {}

    return populated;
  }

  async verifyPasscode(societyId, passcode) {
    const code = String(passcode || "").trim();
    if (!code) throw new AppError("Please provide a passcode", 400);

    const visitor = await Visitor.findOne({
      societyId,
      passcode: code,
      status: { $in: ["approved", "pending_approval", "inside", "checked_out", "rejected"] },
    })
      .populate("unitId", "label doorNo block floor")
      .populate("hostUserId", "name phone")
      .populate("societyId", "name")
      .lean();

    if (!visitor) {
      throw new AppError("Invalid passcode or no pass found for this code", 404);
    }

    const now = new Date();
    const isExpired = new Date(visitor.validUntil) < now;
    const isInside = visitor.status === "inside";
    const isApproved = visitor.status === "approved";
    const isCheckedOut = visitor.status === "checked_out";

    return {
      visitor,
      isExpired,
      isInside,
      isApproved,
      isCheckedOut,
      isValid: !isExpired && isApproved,
    };
  }

  async checkIn(societyId, guardUserId, membership, visitorId) {
    const canManage = await this.canManageVisitors(societyId, membership);
    if (!canManage) {
      throw new AppError("Only security guards or society admins can check in visitors", 403);
    }

    const visitor = await Visitor.findOne({ _id: visitorId, societyId });
    if (!visitor) throw new AppError("Visitor not found", 404);

    if (visitor.status === "inside") {
      throw new AppError("This visitor is already checked in and inside the society", 400);
    }

    if (visitor.status === "checked_out") {
      throw new AppError("This pass has already been used and checked out", 400);
    }

    if (visitor.status === "rejected") {
      throw new AppError("This visitor was rejected by the resident", 400);
    }

    visitor.status = "inside";
    visitor.checkInTime = new Date();
    visitor.checkedInBy = guardUserId;
    await visitor.save();

    const populated = await Visitor.findById(visitor._id)
      .populate("unitId", "label doorNo block floor")
      .populate("hostUserId", "name phone")
      .populate("checkedInBy", "name")
      .lean();

    // Broadcast socket event
    try {
      emitToSociety(societyId, "visitor:checked_in", populated);
      emitToSociety(societyId, "visitor:change", populated);
      if (visitor.hostUserId) {
        emitToUser(String(visitor.hostUserId), "visitor:checked_in", populated);
      }
    } catch (_) {}

    // Send in-app notification to resident
    try {
      await notificationService.createNotification({
        societyId,
        userId: visitor.hostUserId,
        type: "general",
        title: `Visitor Checked In: ${populated.name}`,
        message: `${populated.name} has passed the gate security and is heading to House ${populated.unitId?.label || ""}.`,
        link: "/visitors",
      });
    } catch (_) {}

    return populated;
  }

  async checkOut(societyId, guardUserId, membership, visitorId, notes) {
    const canManage = await this.canManageVisitors(societyId, membership);
    if (!canManage) {
      throw new AppError("Only security guards or society admins can check out visitors", 403);
    }

    const visitor = await Visitor.findOne({ _id: visitorId, societyId });
    if (!visitor) throw new AppError("Visitor not found", 404);

    visitor.status = "checked_out";
    visitor.checkOutTime = new Date();
    visitor.checkedOutBy = guardUserId;
    if (notes) visitor.notes = (visitor.notes ? visitor.notes + "\n" : "") + notes.trim();
    await visitor.save();

    const populated = await Visitor.findById(visitor._id)
      .populate("unitId", "label doorNo block floor")
      .populate("hostUserId", "name phone")
      .populate("checkedOutBy", "name")
      .lean();

    // Broadcast socket event
    try {
      emitToSociety(societyId, "visitor:checked_out", populated);
      emitToSociety(societyId, "visitor:change", populated);
      if (visitor.hostUserId) {
        emitToUser(String(visitor.hostUserId), "visitor:checked_out", populated);
      }
    } catch (_) {}

    return populated;
  }

  async cancelPass(societyId, userId, membership, visitorId) {
    const visitor = await Visitor.findOne({ _id: visitorId, societyId });
    if (!visitor) throw new AppError("Visitor pass not found", 404);

    const canManage = await this.canManageVisitors(societyId, membership);
    const isHost = String(visitor.hostUserId) === String(userId);

    if (!canManage && !isHost) {
      throw new AppError("You can only cancel passes created by you", 403);
    }

    if (visitor.status === "inside") {
      throw new AppError("Cannot cancel pass for a visitor currently inside the society", 400);
    }

    visitor.status = "expired";
    await visitor.save();

    return { message: "Pass cancelled successfully" };
  }

  async list(societyId, userId, membership, query) {
    const canManage = await this.canManageVisitors(societyId, membership);
    const myUnitIds = await this.getMyUnitIds(membership);

    const filter = { societyId };

    // Scope filter: if regular resident, restrict to their houses or passes created by them
    if (!canManage) {
      filter.$or = [
        { unitId: { $in: myUnitIds } },
        { hostUserId: userId },
      ];
    }

    // Status filtering
    if (query.status) {
      if (query.status === "inside") {
        filter.status = "inside";
      } else if (query.status === "expected") {
        filter.status = "approved";
        filter.checkInTime = null;
        filter.validUntil = { $gte: new Date() };
      } else if (query.status === "pending") {
        filter.status = "pending_approval";
      } else if (query.status === "history") {
        filter.status = { $in: ["checked_out", "rejected", "expired", "left_at_gate"] };
      } else if (query.status !== "all") {
        filter.status = query.status;
      }
    }

    if (query.visitorType && query.visitorType !== "all") {
      filter.visitorType = query.visitorType;
    }

    if (query.unitId) {
      filter.unitId = query.unitId;
    }

    if (query.search) {
      const rx = new RegExp(query.search.trim(), "i");
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: rx },
          { phone: rx },
          { company: rx },
          { vehicleNumber: rx },
          { passcode: rx },
        ],
      });
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Visitor.find(filter)
        .populate("unitId", "label doorNo block floor")
        .populate("hostUserId", "name phone")
        .populate("checkedInBy", "name")
        .populate("checkedOutBy", "name")
        .populate("approvedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Visitor.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getStats(societyId, userId, membership) {
    const canManage = await this.canManageVisitors(societyId, membership);
    const myUnitIds = await this.getMyUnitIds(membership);

    const baseFilter = { societyId };
    if (!canManage) {
      baseFilter.$or = [
        { unitId: { $in: myUnitIds } },
        { hostUserId: userId },
      ];
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [inside, expected, pending, todayTotal] = await Promise.all([
      Visitor.countDocuments({ ...baseFilter, status: "inside" }),
      Visitor.countDocuments({
        ...baseFilter,
        status: "approved",
        checkInTime: null,
        validUntil: { $gte: new Date() },
      }),
      Visitor.countDocuments({ ...baseFilter, status: "pending_approval" }),
      Visitor.countDocuments({
        ...baseFilter,
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      }),
    ]);

    return {
      inside,
      expected,
      pending,
      todayTotal,
    };
  }

  async getPublicPass(visitorId) {
    const visitor = await Visitor.findById(visitorId)
      .populate("unitId", "label doorNo block floor")
      .populate("hostUserId", "name phone")
      .populate("societyId", "name address city state pincode")
      .lean();

    if (!visitor) throw new AppError("Digital pass not found", 404);

    return {
      id: visitor._id,
      name: visitor.name,
      phone: visitor.phone,
      visitorType: visitor.visitorType,
      company: visitor.company,
      vehicleNumber: visitor.vehicleNumber,
      passcode: visitor.passcode,
      status: visitor.status,
      validFrom: visitor.validFrom,
      validUntil: visitor.validUntil,
      checkInTime: visitor.checkInTime,
      checkOutTime: visitor.checkOutTime,
      unit: {
        label: visitor.unitId?.label,
        block: visitor.unitId?.block,
        floor: visitor.unitId?.floor,
      },
      host: {
        name: visitor.hostUserId?.name,
      },
      society: {
        name: visitor.societyId?.name,
        address: visitor.societyId?.address,
        city: visitor.societyId?.city,
        state: visitor.societyId?.state,
      },
    };
  }
}

module.exports = new VisitorService();
