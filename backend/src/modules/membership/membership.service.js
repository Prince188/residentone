const { Membership } = require("./membership.model");
const { Unit } = require("../unit/unit.model");
const { AppError } = require("../../shared/utils/errors");

class MembershipService {
  async findById(id) {
    return Membership.findById(id);
  }

  async findByUserAndSociety(userId, societyId) {
    return Membership.findOne({ userId, societyId, isActive: true });
  }

  async findBySociety(societyId) {
    return Membership.find({ societyId, isActive: true }).populate("userId", "name email phone");
  }

  maskPhone(phone) {
    if (!phone) return null;
    const str = String(phone).trim();
    if (str.length <= 4) return "****";
    // MyGate style masking: 98XXXXXX10
    const start = str.slice(0, 2);
    const end = str.slice(-2);
    const masked = start + "X".repeat(Math.max(0, str.length - 4)) + end;
    return masked;
  }

  async getDirectory(societyId) {
    const members = await Membership.find({ societyId, isActive: true })
      .populate("userId", "name phone")
      .populate("units", "label unitNumber")
      .lean();

    const NO_ORDER = Number.MAX_SAFE_INTEGER;
    const entries = [];
    for (const m of members) {
      if (!m.userId) continue;
      const houses = (m.units || [])
        .slice()
        .sort(
          (a, b) => (a.unitNumber ?? NO_ORDER) - (b.unitNumber ?? NO_ORDER)
        );
      const maskedPhone = this.maskPhone(m.userId.phone);
      if (houses.length === 0) {
        entries.push({
          id: String(m._id),
          userId: String(m.userId._id),
          name: m.userId.name,
          role: m.role,
          phoneMasked: maskedPhone,
          house: null,
          unitNumber: NO_ORDER,
        });
        continue;
      }
      for (const u of houses) {
        entries.push({
          id: `${m._id}-${u._id}`,
          userId: String(m.userId._id),
          name: m.userId.name,
          role: m.role,
          phoneMasked: maskedPhone,
          house: u.label,
          unitNumber: u.unitNumber ?? NO_ORDER,
        });
      }
    }

    return entries
      .sort(
        (a, b) =>
          a.unitNumber - b.unitNumber ||
          String(a.name).localeCompare(String(b.name))
      )
      .map(({ id, userId, name, role, house, phoneMasked }) => ({ id, userId, name, role, house, phoneMasked }));
  }

  async findByUser(userId) {
    return Membership.find({ userId, isActive: true }).populate("societyId", "name city");
  }

  async findUserSocieties(userId) {
    const memberships = await Membership.find({ userId, isActive: true })
      .populate("societyId", "name city state pincode address isActive status societyType")
      .populate("units")
      .sort({ createdAt: 1 })
      .lean();

    return memberships
      .filter((membership) => membership.societyId && membership.societyId.status !== "archived" && membership.societyId.status !== "rejected")
      .map((membership) => ({
        membershipId: membership._id,
        role: membership.role,
        additionalRoles: membership.additionalRoles || [],
        roles: [membership.role, ...(membership.additionalRoles || [])].filter(Boolean),
        assignedWings: membership.assignedWings || [],
        joinedAt: membership.joinedAt,
        society: {
          id: membership.societyId._id,
          name: membership.societyId.name,
          city: membership.societyId.city,
          address: membership.societyId.address,
          status: membership.societyId.status,
          isActive: membership.societyId.isActive,
          societyType: membership.societyId.societyType || "apartment",
        },
        units: (membership.units || [])
          .filter((unit) => unit && unit.isActive !== false)
          .map((unit) => ({
            id: unit._id,
            propertyType: unit.propertyType,
            label: unit.label,
            block: unit.block || null,
            floor: unit.floor || null,
            doorNo: unit.doorNo,
            isOwner: Boolean(
              unit.ownerId && String(unit.ownerId) === String(membership.userId)
            ),
          })),
      }));
  }

  async create(data) {
    const existing = await this.findByUserAndSociety(data.userId, data.societyId);
    if (existing) {
      throw new AppError("User is already a member of this society", 409);
    }
    if (data.role === "society_admin") {
      const count = await Membership.countDocuments({ societyId: data.societyId, role: "society_admin", isActive: true });
      if (count >= 2) {
        throw new AppError("Maximum 2 Society Admins allowed per society", 400);
      }
    }
    return Membership.create(data);
  }

  async addUnitsToMembership(membershipId, unitIds) {
    return Membership.findByIdAndUpdate(
      membershipId,
      { $addToSet: { units: { $each: unitIds } } },
      { new: true }
    );
  }

  async updateRole(id, role, assignedWings) {
    const existing = await Membership.findById(id);
    if (!existing) throw new AppError("Membership not found", 404);
    const existingRoles = [existing.role, ...(existing.additionalRoles || [])].filter(Boolean);
    // Additive: if existing is society_admin/super_admin and we add wing_admin, keep society_admin
    const isWingAdminAdd = role === "wing_admin" && (existingRoles.includes("society_admin") || existingRoles.includes("super_admin"));
    if (isWingAdminAdd) {
      const wings = Array.isArray(assignedWings) ? assignedWings.map((w) => String(w).trim().toUpperCase()).filter(Boolean) : [];
      if (wings.length === 0) throw new AppError("Wing Admin requires at least one wing assignment", 400);
      const invalid = wings.filter((w) => !/^[A-Z0-9]{1,10}$/.test(w));
      if (invalid.length) throw new AppError(`Invalid wing names: ${invalid.join(", ")}`, 400);
      const additional = new Set(existing.additionalRoles || []);
      additional.add("wing_admin");
      return Membership.findByIdAndUpdate(id, { additionalRoles: Array.from(additional), assignedWings: wings }, { new: true, runValidators: true });
    }
    // Enforce max 2 society_admin per society
    if (role === "society_admin" && !existingRoles.includes("society_admin")) {
      const count = await Membership.countDocuments({ societyId: existing.societyId, role: "society_admin", isActive: true });
      if (count >= 2) {
        throw new AppError("Maximum 2 Society Admins allowed per society", 400);
      }
    }
    const update = { role };
    if (role === "wing_admin") {
      const wings = Array.isArray(assignedWings) ? assignedWings.map((w) => String(w).trim().toUpperCase()).filter(Boolean) : [];
      if (wings.length === 0) throw new AppError("Wing Admin requires at least one wing assignment", 400);
      const invalid = wings.filter((w) => !/^[A-Z0-9]{1,10}$/.test(w));
      if (invalid.length) throw new AppError(`Invalid wing names: ${invalid.join(", ")}`, 400);
      update.assignedWings = wings;
      update.additionalRoles = [];
    } else {
      // clear wings and additional roles when switching away from wing_admin (unless we keep additionalRoles that still includes wing_admin via other path)
      update.assignedWings = [];
      update.additionalRoles = [];
    }
    return Membership.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  }

  async removeWingAdminRole(id, wing) {
    const existing = await Membership.findById(id);
    if (!existing) throw new AppError("Membership not found", 404);
    const targetWing = String(wing || "").trim().toUpperCase();
    const remaining = (existing.assignedWings || []).filter((w) => String(w).toUpperCase() !== targetWing);
    if (remaining.length > 0) {
      return Membership.findByIdAndUpdate(id, { assignedWings: remaining }, { new: true, runValidators: true });
    }
    // No wings left: if additionalRoles contains wing_admin, remove it but keep primary role
    const isAdditionalWingAdmin = (existing.additionalRoles || []).includes("wing_admin");
    if (isAdditionalWingAdmin) {
      const additional = (existing.additionalRoles || []).filter((r) => r !== "wing_admin");
      return Membership.findByIdAndUpdate(id, { additionalRoles: additional, assignedWings: [] }, { new: true, runValidators: true });
    }
    // primary wing_admin -> demote to owner
    return Membership.findByIdAndUpdate(id, { role: "owner", assignedWings: [], additionalRoles: [] }, { new: true, runValidators: true });
  }

  async deactivate(id) {
    return Membership.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async countAdmins(societyId) {
    return Membership.countDocuments({
      societyId,
      role: { $in: ["super_admin", "society_admin"] },
      isActive: true,
    });
  }
}

module.exports = new MembershipService();
