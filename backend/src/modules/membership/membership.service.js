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

  async getDirectory(societyId, query = {}) {
    const members = await Membership.find({ societyId, isActive: true })
      .populate("userId", "name phone occupation")
      .populate("units", "label unitNumber")
      .lean();

    const NO_ORDER = Number.MAX_SAFE_INTEGER;
    let entries = [];
    const seenUsers = new Map();

    for (const m of members) {
      if (!m.userId) continue;
      const uId = String(m.userId._id);
      const houses = (m.units || [])
        .slice()
        .sort(
          (a, b) => (a.unitNumber ?? NO_ORDER) - (b.unitNumber ?? NO_ORDER)
        );
      const houseLabels = houses.map((u) => u.label).filter(Boolean);
      const maskedPhone = this.maskPhone(m.userId.phone);
      const occupation = (m.userId.occupation || "").trim();

      if (seenUsers.has(uId)) {
        // Merge houses and roles if user has multiple membership records
        const existing = seenUsers.get(uId);
        houseLabels.forEach((hl) => {
          if (!existing.houses.includes(hl)) existing.houses.push(hl);
        });
        if (["super_admin", "society_admin"].includes(m.role)) {
          existing.role = m.role;
        }
        if (!existing.occupation && occupation) existing.occupation = occupation;
        continue;
      }

      const entry = {
        id: String(m._id),
        userId: uId,
        name: m.userId.name,
        role: m.role,
        roles: [m.role, ...(m.additionalRoles || [])].filter(Boolean),
        phoneMasked: maskedPhone,
        occupation,
        house: houseLabels.length > 0 ? houseLabels[0] : null,
        houses: houseLabels,
        unitNumber: houses[0]?.unitNumber ?? NO_ORDER,
      };

      seenUsers.set(uId, entry);
      entries.push(entry);
    }

    // Include Family Members (Universal Household)
    try {
      const { FamilyMember } = require("../family-member/family-member.model");
      const memberUserIds = members.map((m) => m.userId?._id).filter(Boolean);
      if (memberUserIds.length > 0 || societyId) {
        const queryOr = [];
        if (societyId) queryOr.push({ societyId });
        if (memberUserIds.length > 0) queryOr.push({ addedBy: { $in: memberUserIds } });

        const familyMembers = await FamilyMember.find({
          isActive: true,
          $or: queryOr,
        })
          .populate("unitId", "label unitNumber")
          .populate("addedBy", "name")
          .lean();

        const userHouseMap = {};
        for (const m of members) {
          if (m.userId && m.units && m.units.length > 0) {
            userHouseMap[String(m.userId._id)] = m.units.map((u) => ({
              label: u.label,
              unitNumber: u.unitNumber ?? NO_ORDER,
            }));
          }
        }

        for (const fm of familyMembers) {
          const isSameSocietyUnit = fm.societyId && String(fm.societyId) === String(societyId) && fm.unitId;
          const residentHouses = userHouseMap[String(fm.addedBy?._id || fm.addedBy)] || [];
          const primaryHouse = isSameSocietyUnit
            ? fm.unitId?.label
            : (residentHouses[0]?.label || fm.unitId?.label || null);
          const allHouseLabels = isSameSocietyUnit
            ? [fm.unitId?.label].filter(Boolean)
            : (residentHouses.length > 0 ? residentHouses.map((h) => h.label) : [fm.unitId?.label].filter(Boolean));
          const primaryUnitNumber = isSameSocietyUnit
            ? (fm.unitId?.unitNumber ?? NO_ORDER)
            : (residentHouses[0]?.unitNumber ?? fm.unitId?.unitNumber ?? NO_ORDER);

          entries.push({
            id: `fm-${fm._id}`,
            userId: String(fm.addedBy?._id || fm.addedBy || ""),
            name: fm.name,
            role: fm.relation ? `Family (${fm.relation})` : "Family Member",
            isFamily: true,
            relation: fm.relation || "other",
            addedByName: fm.addedBy?.name || null,
            phoneMasked: this.maskPhone(fm.phone),
            occupation: (fm.occupation || "").trim(),
            house: primaryHouse,
            houses: allHouseLabels,
            unitNumber: primaryUnitNumber,
          });
        }
      }
    } catch (_) {}

    // Include Staff Data (Daily & Society Staff)
    try {
      const { Staff } = require("../staff/staff.model");
      const staffList = await Staff.find({ societyId, isActive: true })
        .populate("userId", "name phone occupation")
        .lean();

      const STAFF_TYPE_LABELS = {
        security_guard: "Security Guard",
        technician: "Technician / Maintenance",
        housekeeping: "Housekeeping",
        gardener: "Gardener",
        office: "Facility / Office",
        other: "Staff",
      };

      for (const s of staffList) {
        if (!s.userId) continue;
        const typeLabel = STAFF_TYPE_LABELS[s.staffType] || "Staff";
        const staffOccupation = (s.userId.occupation || typeLabel).trim();
        const maskedPhone = this.maskPhone(s.userId.phone);

        entries.push({
          id: `staff-${s._id}`,
          userId: String(s.userId._id),
          name: s.userId.name,
          role: typeLabel,
          isStaff: true,
          staffType: s.staffType || "other",
          department: s.department || "",
          gate: s.gate || "",
          shift: s.shift || "",
          phoneMasked: maskedPhone,
          occupation: staffOccupation,
          house: s.gate || s.department || "Society Staff",
          houses: [s.gate || s.department || "Society Staff"],
          unitNumber: NO_ORDER,
        });
      }
    } catch (_) {}

    if (query?.occupation) {
      const occFilter = String(query.occupation).trim().toLowerCase();
      entries = entries.filter(
        (e) => e.occupation && e.occupation.toLowerCase().includes(occFilter)
      );
    }

    if (query?.search) {
      const searchFilter = String(query.search).trim().toLowerCase();
      entries = entries.filter(
        (e) =>
          (e.name && e.name.toLowerCase().includes(searchFilter)) ||
          (e.house && String(e.house).toLowerCase().includes(searchFilter)) ||
          (Array.isArray(e.houses) && e.houses.some((h) => String(h).toLowerCase().includes(searchFilter))) ||
          (e.occupation && e.occupation.toLowerCase().includes(searchFilter)) ||
          (e.role && e.role.toLowerCase().includes(searchFilter)) ||
          (e.department && e.department.toLowerCase().includes(searchFilter)) ||
          (e.gate && e.gate.toLowerCase().includes(searchFilter))
      );
    }

    return entries
      .sort(
        (a, b) =>
          a.unitNumber - b.unitNumber ||
          String(a.name).localeCompare(String(b.name))
      )
      .map(
        ({
          id,
          userId,
          name,
          role,
          roles,
          house,
          houses,
          phoneMasked,
          occupation,
          isFamily,
          relation,
          addedByName,
          isStaff,
          staffType,
          shift,
          department,
          gate,
        }) => ({
          id,
          userId,
          name,
          role,
          roles: roles || [role],
          house,
          houses: houses && houses.length > 0 ? houses : (house ? [house] : []),
          phoneMasked,
          occupation,
          isFamily: Boolean(isFamily),
          relation: relation || null,
          addedByName: addedByName || null,
          isStaff: Boolean(isStaff),
          staffType: staffType || null,
          shift: shift || null,
          department: department || null,
          gate: gate || null,
        })
      );
  }

  async findByUser(userId) {
    return Membership.find({ userId, isActive: true }).populate("societyId", "name city");
  }

  async findUserSocieties(userId) {
    const memberships = await Membership.find({ userId, isActive: true })
      .populate("societyId", "name city state pincode address isActive status societyType subscriptionPlan subscriptionBilling isSubscriptionPaid totalUnits subscriptionStartedAt subscriptionExpiresAt")
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
          subscriptionPlan: membership.societyId.subscriptionPlan || "starter",
          subscriptionBilling: membership.societyId.subscriptionBilling || "monthly",
          isSubscriptionPaid: Boolean(membership.societyId.isSubscriptionPaid),
          subscriptionStartedAt: membership.societyId.subscriptionStartedAt,
          subscriptionExpiresAt: membership.societyId.subscriptionExpiresAt,
          totalUnits: membership.societyId.totalUnits || 0,
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
