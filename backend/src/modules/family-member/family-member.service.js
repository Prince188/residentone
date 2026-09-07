const { FamilyMember } = require("./family-member.model");
const { Unit } = require("../unit/unit.model");
const { AppError } = require("../../shared/utils/errors");

class FamilyMemberService {
  async list(societyId, userId, membership, query = {}) {
    const isMine = query?.mine === true || query?.mine === "true";
    let filter = { isActive: true };

    if (query?.userId || query?.addedBy) {
      filter.addedBy = query.userId || query.addedBy;
    } else if (isMine) {
      filter.addedBy = userId;
    } else {
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

      if (canManageHouses && societyId) {
        // Universal Household: Admin sees family members linked directly or added by any active resident of this society
        const units = await Unit.find({ societyId, isActive: true })
          .select("ownerId tenantId")
          .lean();
        const residentIds = new Set();
        units.forEach((u) => {
          if (u.ownerId) residentIds.add(String(u.ownerId));
          if (u.tenantId) residentIds.add(String(u.tenantId));
        });

        const orConditions = [{ societyId }];
        if (residentIds.size > 0) {
          orConditions.push({ addedBy: { $in: Array.from(residentIds) } });
        }
        filter.$or = orConditions;
      } else {
        // User seeing their own family members
        filter.addedBy = userId;
      }
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
        const userOwnsOrRents = await Unit.exists({
          _id: targetId,
          societyId,
          isActive: true,
          $or: [{ ownerId: userId }, { tenantId: userId }],
        });

        if (!isAdmin && !myUnitIds.includes(targetId) && !userOwnsOrRents) {
          throw new AppError("You can only add members to your own house", 403);
        }
        const unit = await Unit.findOne({ _id: targetId, societyId, isActive: true });
        if (!unit) throw new AppError("House not found", 404);
        unitId = targetId;
      }
    }

    if (!unitId) {
      if (membership?.units?.length > 0) {
        unitId = membership.units[0]?._id || membership.units[0];
      } else if (societyId) {
        const userUnit = await Unit.findOne({
          societyId,
          isActive: true,
          $or: [{ ownerId: userId }, { tenantId: userId }],
        }).select("_id");
        if (userUnit) {
          unitId = userUnit._id;
        }
      }
    }

    if (unitId && membership?._id) {
      try {
        const { Membership } = require("../membership/membership.model");
        await Membership.findByIdAndUpdate(membership._id, {
          $addToSet: { units: unitId },
        });
      } catch (_) {}
    }

    let linkedUser = null;
    if (data.phone) {
      try {
        linkedUser = await this.createOrFindUserForFamilyMember(data.name, data.phone, data.occupation);
      } catch (err) {
        console.warn("[family-member] failed to auto-provision user account:", err.message);
      }
    }

    const member = await FamilyMember.create({
      societyId: societyId || membership?.societyId || null,
      unitId: unitId || null,
      userId: linkedUser?._id || null,
      addedBy: userId,
      name: data.name.trim(),
      relation: data.relation || "other",
      phone: data.phone ? data.phone.trim() : "",
      occupation: (data.occupation || "").trim(),
    });

    // Auto-create/sync resident Membership in this society for the family member's user account
    const activeSocId = societyId || membership?.societyId;
    if (linkedUser && activeSocId) {
      try {
        const { Membership } = require("../membership/membership.model");
        let userMem = await Membership.findOne({ userId: linkedUser._id, societyId: activeSocId });
        if (!userMem) {
          await Membership.create({
            userId: linkedUser._id,
            societyId: activeSocId,
            role: "resident",
            units: unitId ? [unitId] : [],
            isActive: true,
          });
        } else {
          userMem.isActive = true;
          if (unitId) {
            if (!userMem.units) userMem.units = [];
            if (!userMem.units.some((u) => String(u) === String(unitId))) {
              userMem.units.push(unitId);
            }
          }
          await userMem.save();
        }
      } catch (err) {
        console.warn("[family-member] failed to link membership:", err.message);
      }
    }

    try {
      const { User } = require("../user/user.model");
      const count = await FamilyMember.countDocuments({ addedBy: userId, isActive: true });
      await User.findByIdAndUpdate(userId, { familyMembers: count });
    } catch (_) {}

    return member;
  }

  async createOrFindUserForFamilyMember(name, phone, occupation = "") {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length < 10) return null;

    const digits = cleanPhone.slice(-10);
    const { User } = require("../user/user.model");
    let user = await User.findOne({ phone: new RegExp(`${digits}$`) });
    if (user) return user;

    const email = `${digits}@residentone.local`;
    const existingEmail = await User.findOne({ email });
    const finalEmail = existingEmail ? `${digits}_${Date.now()}@residentone.local` : email;

    user = await User.create({
      name: (name || "Resident").trim(),
      email: finalEmail,
      phone: digits,
      occupation: occupation || "",
      role: ["resident"],
      passwordHash: digits, // Default password is phone number
    });

    return user;
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
    if (data.occupation !== undefined) doc.occupation = data.occupation.trim();
    if (data.phone !== undefined) {
      const cleanPhone = data.phone.trim();
      doc.phone = cleanPhone;
      if (cleanPhone) {
        try {
          const linkedUser = await this.createOrFindUserForFamilyMember(doc.name, cleanPhone, doc.occupation);
          if (linkedUser) {
            doc.userId = linkedUser._id;
            const socId = societyId || doc.societyId;
            if (socId) {
              const { Membership } = require("../membership/membership.model");
              let userMem = await Membership.findOne({ userId: linkedUser._id, societyId: socId });
              if (!userMem) {
                await Membership.create({
                  userId: linkedUser._id,
                  societyId: socId,
                  role: "resident",
                  units: doc.unitId ? [doc.unitId] : [],
                  isActive: true,
                });
              } else {
                userMem.isActive = true;
                if (doc.unitId) {
                  if (!userMem.units) userMem.units = [];
                  if (!userMem.units.some((u) => String(u) === String(doc.unitId))) {
                    userMem.units.push(doc.unitId);
                  }
                }
                await userMem.save();
              }
            }
          }
        } catch (_) {}
      }
    }
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

    const socId = societyId || doc.societyId;
    if (doc.userId && socId) {
      try {
        const { Membership } = require("../membership/membership.model");
        if (doc.unitId) {
          await Membership.updateOne(
            { userId: doc.userId, societyId: socId },
            { $pull: { units: doc.unitId } }
          );
        }
        const userMem = await Membership.findOne({ userId: doc.userId, societyId: socId });
        if (userMem && userMem.role === "resident" && (!userMem.units || userMem.units.length === 0)) {
          userMem.isActive = false;
          await userMem.save();
        }
      } catch (_) {}
    }

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
      userId: doc.userId?._id || doc.userId || null,
      name: doc.name,
      relation: doc.relation,
      phone: doc.phone,
      occupation: doc.occupation || "",
      addedBy: doc.addedBy?._id || doc.addedBy || null,
      addedByName: doc.addedBy?.name || null,
      createdAt: doc.createdAt,
    };
  }
}

module.exports = new FamilyMemberService();
