const { FamilyMember } = require("./family-member.model");
const { Unit } = require("../unit/unit.model");
const { AppError } = require("../../shared/utils/errors");

class FamilyMemberService {
  async list(societyId, userId, membership) {
    // For FamilyMembersPage (personal): non-admin sees only own; admin sees all.
    // For ManageHousesPage (per-house view): those with manage_houses should see all to show per-house counts.
    // We allow manage_houses permission to see all, others only own.
    const isAdmin = ["super_admin", "society_admin"].includes(membership.role);
    let canManageHouses = isAdmin;
    if (!canManageHouses) {
      try {
        const { hasPermission } = require("../../shared/permissions");
        const { Society } = require("../society/society.model");
        const society = await Society.findById(societyId).select("rolePermissions").lean();
        canManageHouses = hasPermission(membership.role, "manage_houses", society?.rolePermissions);
      } catch {}
    }
    const filter = { societyId, isActive: true };
    if (!canManageHouses) {
      filter.addedBy = userId;
    }
    return FamilyMember.find(filter).populate("unitId", "label").populate("addedBy", "name").sort({ createdAt: -1 }).lean();
  }

  async create(societyId, userId, membership, data) {
    const myUnitIds = (membership.units || []).map((id) => String(id));
    const isAdmin = ["super_admin", "society_admin"].includes(membership.role);
    // For general family members, no specific house required — just need to be a member of the society
    // If a unitId is provided (legacy), validate it; otherwise store as general (null)
    let unitId = null;
    if (data.unitId) {
      const targetId = String(data.unitId).trim();
      if (targetId) {
        if (!isAdmin && !myUnitIds.includes(targetId)) {
          throw new AppError("You can only add members to your own house", 403);
        }
        const unit = await Unit.findOne({ _id: targetId, societyId, isActive: true });
        if (!unit) throw new AppError("House not found", 404);
        unitId = targetId;
      }
    } else {
      // General family member: ensure user is part of society (has at least one unit or is admin)
      if (!isAdmin && myUnitIds.length === 0) {
        throw new AppError("You need a house in this society to add family members", 403);
      }
      // Use first house as fallback for legacy display, or keep null for truly general
      unitId = null;
    }

    const member = await FamilyMember.create({
      societyId,
      unitId,
      addedBy: userId,
      name: data.name.trim(),
      relation: data.relation || "other",
      phone: data.phone || "",
    });
    return member;
  }

  async remove(societyId, id, userId, membership) {
    const doc = await FamilyMember.findOne({ _id: id, societyId, isActive: true });
    if (!doc) throw new AppError("Family member not found", 404);
    const isAdmin = ["super_admin", "society_admin"].includes(membership.role);
    if (!isAdmin && String(doc.addedBy) !== String(userId)) {
      throw new AppError("You can only remove members you added", 403);
    }
    doc.isActive = false;
    await doc.save();
    return doc;
  }

  map(doc) {
    return {
      id: doc._id,
      unitId: doc.unitId?._id || doc.unitId,
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
