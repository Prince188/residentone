const { FamilyMember } = require("./family-member.model");
const { Unit } = require("../unit/unit.model");
const { AppError } = require("../../shared/utils/errors");

class FamilyMemberService {
  async list(societyId, userId, membership) {
    // Residents see their house members; admin sees all in society
    const isAdmin = ["super_admin", "society_admin"].includes(membership.role);
    const filter = { societyId, isActive: true };
    if (!isAdmin) {
      // Only show members for houses owned/rented by this user
      const myUnitIds = (membership.units || []).map((id) => String(id));
      if (!myUnitIds.length) return [];
      filter.unitId = { $in: myUnitIds };
    }
    return FamilyMember.find(filter).populate("unitId", "label").populate("addedBy", "name").sort({ createdAt: -1 }).lean();
  }

  async create(societyId, userId, membership, data) {
    const myUnitIds = (membership.units || []).map((id) => String(id));
    const isAdmin = ["super_admin", "society_admin"].includes(membership.role);
    // Must be owner/renter of that house (or admin)
    if (!isAdmin && !myUnitIds.includes(String(data.unitId))) {
      throw new AppError("You can only add members to your own house", 403);
    }
    const unit = await Unit.findOne({ _id: data.unitId, societyId, isActive: true });
    if (!unit) throw new AppError("House not found", 404);

    const member = await FamilyMember.create({
      societyId,
      unitId: data.unitId,
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
