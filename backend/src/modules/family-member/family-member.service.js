const { FamilyMember } = require("./family-member.model");
const { Unit } = require("../unit/unit.model");
const { AppError } = require("../../shared/utils/errors");

class FamilyMemberService {
  async list(societyId, userId, membership) {
    const isAdmin = membership && ["super_admin", "society_admin"].includes(membership.role);
    let canManageHouses = isAdmin;

    if (societyId && membership && !canManageHouses) {
      try {
        const { hasPermission } = require("../../shared/permissions");
        const { Society } = require("../society/society.model");
        const society = await Society.findById(societyId).select("rolePermissions").lean();
        canManageHouses = hasPermission(membership.role, "manage_houses", society?.rolePermissions);
      } catch {}
    }

    let filter = { isActive: true };

    if (canManageHouses && societyId) {
      // Admin seeing all society members
      filter.societyId = societyId;
    } else {
      // User seeing their own family members
      filter.addedBy = userId;
    }

    return FamilyMember.find(filter)
      .populate("unitId", "label")
      .populate("addedBy", "name")
      .sort({ createdAt: -1 })
      .lean();
  }

  async create(societyId, userId, membership, data) {
    const myUnitIds = (membership?.units || []).map((id) => String(id));
    const isAdmin = membership && ["super_admin", "society_admin"].includes(membership.role);

    let unitId = null;
    if (data.unitId && societyId) {
      const targetId = String(data.unitId).trim();
      if (targetId) {
        if (!isAdmin && !myUnitIds.includes(targetId)) {
          throw new AppError("You can only add members to your own house", 403);
        }
        const unit = await Unit.findOne({ _id: targetId, societyId, isActive: true });
        if (!unit) throw new AppError("House not found", 404);
        unitId = targetId;
      }
    }

    const member = await FamilyMember.create({
      societyId: societyId || null,
      unitId,
      addedBy: userId,
      name: data.name.trim(),
      relation: data.relation || "other",
      phone: data.phone || "",
    });

    try {
      const { User } = require("../user/user.model");
      const count = await FamilyMember.countDocuments({ addedBy: userId, isActive: true });
      await User.findByIdAndUpdate(userId, { familyMembers: count });
    } catch (_) {}

    return member;
  }

  async update(societyId, id, userId, membership, data) {
    const doc = await FamilyMember.findOne({ _id: id, isActive: true });
    if (!doc) throw new AppError("Family member not found", 404);

    const isAdmin = membership && ["super_admin", "society_admin"].includes(membership.role);
    if (!isAdmin && String(doc.addedBy) !== String(userId)) {
      throw new AppError("You can only edit members you added", 403);
    }

    if (data.name !== undefined) doc.name = data.name.trim();
    if (data.relation !== undefined) doc.relation = data.relation;
    if (data.phone !== undefined) doc.phone = data.phone.trim();
    await doc.save();
    return doc;
  }

  async remove(societyId, id, userId, membership) {
    const doc = await FamilyMember.findOne({ _id: id, isActive: true });
    if (!doc) throw new AppError("Family member not found", 404);

    const isAdmin = membership && ["super_admin", "society_admin"].includes(membership.role);
    if (!isAdmin && String(doc.addedBy) !== String(userId)) {
      throw new AppError("You can only remove members you added", 403);
    }

    doc.isActive = false;
    await doc.save();

    try {
      const { User } = require("../user/user.model");
      const count = await FamilyMember.countDocuments({ addedBy: userId, isActive: true });
      await User.findByIdAndUpdate(userId, { familyMembers: count });
    } catch (_) {}

    return doc;
  }

  map(doc) {
    return {
      id: doc._id,
      unitId: doc.unitId?._id || doc.unitId || null,
      unitLabel: doc.unitId?.label || null,
      name: doc.name,
      relation: doc.relation,
      phone: doc.phone,
      addedBy: doc.addedBy?._id || doc.addedBy || null,
      addedByName: doc.addedBy?.name || null,
      createdAt: doc.createdAt,
    };
  }
}

module.exports = new FamilyMemberService();
