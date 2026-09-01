const mongoose = require("mongoose");
const crypto = require("crypto");
const { Society } = require("./society.model");
const { User } = require("../user/user.model");
const { Membership } = require("../membership/membership.model");
const { AppError } = require("../../shared/utils/errors");
const unitService = require("../unit/unit.service");

class SocietyService {
  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Society.findById(id).populate("approvedBy", "name email");
  }

  async findAll(filters = {}) {
    const query = {};
    if (filters.city) query.city = filters.city;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    return Society.find(query);
  }

  async listForAdmin(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      const rx = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ name: rx }, { city: rx }];
    }
    return Society.find(query).sort({ createdAt: -1 });
  }

  async countByStatus(status) {
    const query = status ? { status } : {};
    return Society.countDocuments(query);
  }

  async stats() {
    const { Unit } = require("../unit/unit.model");
    const { User } = require("../user/user.model");
    const [total, pending, active, rejected, suspended, archived, totalUnits, totalUsers] = await Promise.all([
      Society.countDocuments({}),
      Society.countDocuments({ status: "pending" }),
      Society.countDocuments({ status: "active" }),
      Society.countDocuments({ status: "rejected" }),
      Society.countDocuments({ status: "suspended" }),
      Society.countDocuments({ status: "archived" }),
      Unit.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
    ]);
    return { total, pending, active, rejected, suspended, archived, totalUnits, totalUsers };
  }

  mapRegistrationPayload(data) {
    const {
      societyName,
      contactName,
      contactMobile,
      ...rest
    } = data;
    return {
      ...rest,
      name: societyName,
      contactPersonName: contactName,
      contactPhone: contactMobile,
    };
  }

  async registerPublic(data) {
    const { structure, ...restData } = data;
    const mapped = this.mapRegistrationPayload(restData);
    const existing = await Society.findOne({
      name: mapped.name.trim(),
      city: mapped.city.trim(),
      status: { $in: ["pending", "active"] },
    });
    if (existing) {
      throw new AppError(
        "A society with this name is already registered or awaiting review",
        409
      );
    }
    // If detailed wing structure provided, derive totalUnits from it to avoid mismatch (G=2, rest=4 cases)
    let effectiveMapped = { ...mapped };
    if (structure && Array.isArray(structure.wings) && structure.wings.length > 0) {
      let computed = 0;
      for (const w of structure.wings) {
        const hasGround = Boolean(w.hasGround);
        const groundFlats = Number.isInteger(w.groundFlats) ? w.groundFlats : (hasGround ? 2 : 0);
        const defaultPerFloor = Number.isInteger(w.defaultPerFloor) ? w.defaultPerFloor : 4;
        const floors = Number(w.floors) || 0;
        const perFloorMap = w.perFloorMap || {};
        for (let f = hasGround ? 0 : 1; f <= floors; f += 1) {
          if (f === 0) computed += groundFlats;
          else {
            const v = perFloorMap[String(f)];
            computed += v !== undefined ? Number(v) : defaultPerFloor;
          }
        }
      }
      if (computed > 0) effectiveMapped.totalUnits = computed;
    }
    const society = await Society.create({
      ...effectiveMapped,
      status: "pending",
      source: "public_registration",
    });
    if (structure && Array.isArray(structure.wings) && structure.wings.length > 0) {
      try {
        await unitService.bulkGenerateFromStructure(society._id, structure);
      } catch (e) {
        // Non-fatal: keep society, log
        console.error("bulkGenerateFromStructure failed", e.message);
      }
    }
    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange("create", society);
      else if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "create", society, id: society._id });
    } catch (_) {}
    return society;
  }

  async createByAdmin(data, adminId) {
    const society = await Society.create({
      ...this.mapRegistrationPayload(data),
      status: "active",
      isActive: true,
      source: "manual",
      approvedAt: new Date(),
      approvedBy: adminId,
      updatedBy: adminId,
    });
    let adminAccount = null;
    try {
      adminAccount = await this.onboardContactAsSocietyAdmin(society);
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError(
          "A user with this email or phone already exists. Use a different contact.",
          409
        );
      }
      throw error;
    }
    await unitService.ensureUnitsForSociety(society._id);
    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange("create", society);
      else if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "create", society, id: society._id });
      if (adminAccount?.userId && s.emitToUser) {
        s.emitToUser(String(adminAccount.userId), "society:change", { action: "create", society, id: society._id });
      }
    } catch (_) {}
    return { society, adminAccount };
  }

  normalizePhoneDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  async onboardContactAsSocietyAdmin(society) {
    const email = String(society.contactEmail || "").toLowerCase().trim();
    const phoneDigits = this.normalizePhoneDigits(society.contactPhone);

    const conditions = [];
    if (email) conditions.push({ email });
    if (phoneDigits) conditions.push({ phone: new RegExp(`${phoneDigits}$`) });
    if (conditions.length === 0) return null;

    let user = await User.findOne({ $or: conditions });
    let temporaryPassword = null;

    if (!user) {
      temporaryPassword = crypto.randomBytes(9).toString("base64url");
      user = await User.create({
        name: society.contactPersonName || "Society Admin",
        email,
        phone: society.contactPhone,
        passwordHash: temporaryPassword,
      });
    }

    const roles = Array.isArray(user.role) ? [...user.role] : user.role ? [user.role] : [];
    if (!roles.includes("society_admin")) roles.push("society_admin");
    await User.findByIdAndUpdate(user._id, { role: roles });

    // Enforce max 2 society_admin per society
    const existingMem = await Membership.findOne({ userId: user._id, societyId: society._id, isActive: true });
    const isAlreadyAdmin = existingMem && existingMem.role === "society_admin";
    if (!isAlreadyAdmin) {
      const adminCount = await Membership.countDocuments({ societyId: society._id, role: "society_admin", isActive: true });
      if (adminCount >= 2) {
        throw new AppError("Maximum 2 Society Admins allowed per society", 400);
      }
    }

    await Membership.findOneAndUpdate(
      { userId: user._id, societyId: society._id },
      {
        $set: { role: "society_admin", isActive: true, isPrimary: true },
        $setOnInsert: { joinedAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Society.findByIdAndUpdate(society._id, {
      societyAdmin: user._id,
    });

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: "society_admin",
      isPrimary: true,
      accountCreated: Boolean(temporaryPassword),
      temporaryPassword,
    };
  }

  async approve(id, adminId) {
    const current = await this.findRawById(id);
    if (!current) throw new AppError("Society not found", 404);
    if (current.status !== "pending") {
      throw new AppError("Only pending societies can be approved", 409);
    }

    let adminAccount = null;
    if (current.source === "public_registration") {
      adminAccount = await this.onboardContactAsSocietyAdmin(current);
    }

    const society = await Society.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        $set: {
          status: "active",
          isActive: true,
          approvedAt: new Date(),
          approvedBy: adminId,
          updatedBy: adminId,
          rejectionReason: null,
        },
      },
      { new: true }
    );
    if (!society) {
      throw new AppError("Society is no longer pending", 409);
    }
    await unitService.ensureUnitsForSociety(society._id);
    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange("approve", society);
      else if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "approve", society, id: society._id });
      // Real-time for the newly onboarded society admin (not in society room yet)
      if (adminAccount?.userId && s.emitToUser) {
        s.emitToUser(String(adminAccount.userId), "society:change", { action: "approve", society, id: society._id });
      }
    } catch (_) {}
    return { society, adminAccount };
  }

  async reject(id, adminId, reason) {
    const society = await Society.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        $set: {
          status: "rejected",
          isActive: false,
          rejectionReason: reason,
          updatedBy: adminId,
        },
      },
      { new: true }
    );
    if (!society) {
      const exists = await Society.findById(id);
      if (!exists) throw new AppError("Society not found", 404);
      throw new AppError("Only pending societies can be rejected", 409);
    }
    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange("reject", society);
      else if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "reject", society, id: society._id });
    } catch (_) {}
    return society;
  }

  async updateStatus(id, adminId, status) {
    const allowedTransitions = {
      suspend: ["active"],
      activate: ["suspended"],
      archive: ["active", "suspended", "rejected"],
      unarchive: ["archived"],
    };
    const current = await this.findRawById(id);
    if (!current) throw new AppError("Society not found", 404);
    if (!allowedTransitions[status] || !allowedTransitions[status].includes(current.status)) {
      throw new AppError(`Cannot ${status} society with status '${current.status}'`, 409);
    }
    const updatePayload = {
      suspend: { status: "suspended", isActive: false, updatedBy: adminId },
      activate: { status: "active", isActive: true, updatedBy: adminId },
      archive: { status: "archived", isActive: false, updatedBy: adminId },
      unarchive: { status: "active", isActive: true, updatedBy: adminId },
    }[status];

    const society = await Society.findByIdAndUpdate(id, { $set: updatePayload }, { new: true });

    // When archiving, deactivate memberships; when unarchiving, reactivate them
    if (status === "archive") {
      await Membership.updateMany({ societyId: society._id }, { $set: { isActive: false } });
    } else if (status === "unarchive") {
      await Membership.updateMany({ societyId: society._id }, { $set: { isActive: true } });
    }

    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange(status, society);
      else if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: status, society, id: society._id });
      // Also push to all members' user rooms
      if (s.emitToUser) {
        const memberships = await Membership.find({ societyId: society._id }).select("userId").lean();
        memberships.forEach((m) => {
          if (m.userId) {
            try {
              s.emitToUser(String(m.userId), "society:change", { action: status, society, id: society._id });
            } catch (_) {}
          }
        });
      }
    } catch (_) {}
    return society;
  }

  async permanentDelete(id, adminId) {
    const current = await this.findRawById(id);
    if (!current) throw new AppError("Society not found", 404);

    const { Unit } = require("../unit/unit.model");
    const { MaintenanceCycle } = require("../maintenance/maintenance.model");
    const { CollectionFund, CollectionPayment } = require("../collections/collection.model");
    const { Document } = require("../document/document.model");
    const { Complaint } = require("../complaint/complaint.model");
    const { Amenity, AmenityBooking } = require("../amenity/amenity.model");
    const { Poll, PollVote } = require("../poll/poll.model");
    const { Survey, SurveyResponse } = require("../survey/survey.model");
    const { Notice } = require("../notice/notice.model");
    const { ChatGroup, ChatMessage, DirectMessage } = require("../chat/chat.model");
    const { BadgeSeen } = require("../dashboard/dashboard.model");
    const { FamilyMember } = require("../family-member/family-member.model");

    await Promise.all([
      Unit.deleteMany({ societyId: id }),
      Membership.deleteMany({ societyId: id }),
      MaintenanceCycle.deleteMany({ societyId: id }),
      CollectionFund.deleteMany({ societyId: id }),
      CollectionPayment.deleteMany({ societyId: id }),
      Document.deleteMany({ societyId: id }),
      Complaint.deleteMany({ societyId: id }),
      Amenity.deleteMany({ societyId: id }),
      AmenityBooking.deleteMany({ societyId: id }),
      Poll.deleteMany({ societyId: id }),
      PollVote.deleteMany({ societyId: id }),
      Survey.deleteMany({ societyId: id }),
      SurveyResponse.deleteMany({ societyId: id }),
      Notice.deleteMany({ societyId: id }),
      ChatGroup.deleteMany({ societyId: id }),
      ChatMessage.deleteMany({ societyId: id }),
      DirectMessage.deleteMany({ societyId: id }),
      BadgeSeen.deleteMany({ societyId: id }),
      FamilyMember.deleteMany({ societyId: id }),
      Society.findByIdAndDelete(id),
    ]);

    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange("delete", { _id: id, id, name: current.name });
      if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "delete", id, name: current.name });
    } catch (_) {}

    return { id, name: current.name, deleted: true };
  }

  async getRolePermissions(societyId) {
    const society = await Society.findById(societyId).select("rolePermissions");
    return society?.rolePermissions || {};
  }

  async updateRolePermissions(societyId, newPermissions, userId) {
    const { PERMISSIONS } = require("../../shared/permissions");
    const { SOCIETY_ROLES } = require("../../shared/types");
    const allKeys = PERMISSIONS.map((p) => p.key);
    const sanitized = {};
    for (const [role, perms] of Object.entries(newPermissions || {})) {
      if (!SOCIETY_ROLES.includes(role)) continue;
      if (["society_admin", "super_admin"].includes(role)) {
        sanitized[role] = allKeys;
      } else {
        sanitized[role] = (Array.isArray(perms) ? perms : []).filter((p) => allKeys.includes(p));
      }
    }
    sanitized["society_admin"] = allKeys;
    sanitized["super_admin"] = allKeys;
    const society = await Society.findByIdAndUpdate(
      societyId,
      { rolePermissions: sanitized, updatedBy: userId },
      { new: true, runValidators: true }
    ).select("rolePermissions");
    try {
      const s = require("../../socket");
      if (s.emitToSociety) s.emitToSociety(String(societyId), "permissions:change", { societyId, rolePermissions: society.rolePermissions });
      if (s.emitToSuperAdmins) s.emitToSuperAdmins("permissions:change", { societyId, rolePermissions: society.rolePermissions });
    } catch (_) {}
    return society.rolePermissions;
  }

  async findRawById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Society.findById(id);
  }

  async create(data) {
    return Society.create(data);
  }

  async update(id, data) {
    const society = await Society.findByIdAndUpdate(
      id,
      { ...data, updatedBy: data.updatedBy },
      { new: true, runValidators: true }
    );
    try {
      const s = require("../../socket");
      if (society && s.emitSocietyChange) s.emitSocietyChange("update", society);
      else if (society && s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "update", society, id: society._id });
    } catch (_) {}
    return society;
  }

  async deactivate(id) {
    const society = await Society.findByIdAndUpdate(
      id,
      { isActive: false, status: "suspended" },
      { new: true }
    );
    try {
      const s = require("../../socket");
      if (society && s.emitSocietyChange) s.emitSocietyChange("deactivate", society);
      else if (society && s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "deactivate", society, id: society._id });
    } catch (_) {}
    return society;
  }
}

module.exports = new SocietyService();
