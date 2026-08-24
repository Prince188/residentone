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
