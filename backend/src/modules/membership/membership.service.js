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
      .populate("societyId", "name city state pincode address isActive")
      .populate("units")
      .sort({ createdAt: 1 })
      .lean();

    return memberships
      .filter((membership) => membership.societyId && membership.societyId.isActive !== false)
      .map((membership) => ({
        membershipId: membership._id,
        role: membership.role,
        joinedAt: membership.joinedAt,
        society: {
          id: membership.societyId._id,
          name: membership.societyId.name,
          city: membership.societyId.city,
          address: membership.societyId.address,
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

  async updateRole(id, role) {
    const existing = await Membership.findById(id);
    if (!existing) throw new AppError("Membership not found", 404);
    // Enforce max 2 society_admin per society
    if (role === "society_admin" && existing.role !== "society_admin") {
      const count = await Membership.countDocuments({ societyId: existing.societyId, role: "society_admin", isActive: true });
      if (count >= 2) {
        throw new AppError("Maximum 2 Society Admins allowed per society", 400);
      }
    }
    return Membership.findByIdAndUpdate(id, { role }, { new: true, runValidators: true });
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
