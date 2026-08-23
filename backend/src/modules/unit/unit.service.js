const mongoose = require("mongoose");
const crypto = require("crypto");
const { Unit } = require("./unit.model");
const { User } = require("../user/user.model");
const { Membership } = require("../membership/membership.model");
const { Society } = require("../society/society.model");
const { AppError } = require("../../shared/utils/errors");
const { ROLE_HIERARCHY, DEFAULT_ACCOUNT_ROLE } = require("../../shared/types");

const INVITE_EXPIRY_DAYS = 7;

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

async function findUserByPhone(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  const exact = await User.findOne({ phone: phone.trim() });
  if (exact) return exact;
  return User.findOne({ phone: new RegExp(`${digits}$`) });
}

class UnitService {
  async ensureUnitsForSociety(societyId) {
    const society = await Society.findById(societyId).lean();
    if (!society) throw new AppError("Society not found", 404);

    const totalUnits = society.totalUnits || 0;
    if (totalUnits <= 0) return [];

    const existing = await Unit.find({ societyId: society._id })
      .select("label doorNo")
      .lean();
    const existingLabels = new Set(existing.map((u) => String(u.label)));

    const propertyType = society.societyType === "row_house" ? "row_house" : "flat";
    const missing = [];
    for (let n = 1; n <= totalUnits; n += 1) {
      const label = String(n);
      if (!existingLabels.has(label)) {
        missing.push({
          societyId: society._id,
          propertyType,
          label,
          doorNo: label,
          unitNumber: n,
        });
      }
    }
    if (missing.length > 0) {
      try {
        await Unit.insertMany(missing, { ordered: false });
      } catch (error) {
        if (error && error.code !== 11000) throw error;
      }
    }

    return this.listUnits(societyId);
  }

  async listUnits(societyId) {
    return Unit.find({ societyId })
      .sort({ unitNumber: 1, label: 1 })
      .populate("ownerId", "name email phone")
      .lean();
  }

  mapUnitCard(unit) {
    return {
      id: unit._id,
      label: unit.label,
      doorNo: unit.doorNo,
      block: unit.block || null,
      floor: unit.floor || null,
      isAssigned: Boolean(unit.ownerId),
      hasPendingInvite: Boolean(unit.inviteToken && unit.inviteExpiresAt && new Date(unit.inviteExpiresAt) > new Date()),
      owner: unit.ownerId
        ? { id: unit.ownerId._id, name: unit.ownerId.name, email: unit.ownerId.email, phone: unit.ownerId.phone }
        : null,
    };
  }

  async findUnitInSociety(societyId, unitId) {
    if (!mongoose.Types.ObjectId.isValid(unitId)) {
      throw new AppError("House not found", 404);
    }
    const unit = await Unit.findOne({ _id: unitId, societyId });
    if (!unit) throw new AppError("House not found", 404);
    return unit;
  }

  async getUnitDetail(societyId, unitId) {
    const unit = await this.findUnitInSociety(societyId, unitId);
    const populated = await unit.populate("ownerId", "name email phone");
    const [card, society] = await Promise.all([
      Promise.resolve(this.mapUnitCard(populated)),
      Society.findById(societyId).select("name").lean(),
    ]);
    return { ...card, societyName: society ? society.name : null };
  }

  async linkOwnerToUnit(user, unit) {
    let membership = await Membership.findOne({ userId: user._id, societyId: unit.societyId });
    if (!membership) {
      return Membership.create({
        userId: user._id,
        societyId: unit.societyId,
        role: "owner",
        units: [unit._id],
      });
    }
    if (!membership.units) membership.units = [];
    if (!membership.units.some((u) => String(u) === String(unit._id))) {
      membership.units.push(unit._id);
    }
    if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY.owner) {
      membership.role = "owner";
    }
    membership.isActive = true;
    return membership.save();
  }

  async createOrFindOwner(payload) {
    const user = await findUserByPhone(payload.phone);
    if (user) return { user, credentialsCreated: false };

    if (!payload.name) {
      throw new AppError("Name is required to create a new owner account", 400);
    }

    const email =
      payload.email || `${normalizePhone(payload.phone)}@residentone.local`;
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      throw new AppError(
        "A user with this email already exists. Use a different email.",
        409
      );
    }

    // Username and password are both the owner's phone number.
    const created = await User.create({
      name: payload.name.trim(),
      email: email.toLowerCase(),
      phone: payload.phone.trim(),
      role: [DEFAULT_ACCOUNT_ROLE],
      passwordHash: normalizePhone(payload.phone),
    });
    return { user: created, credentialsCreated: true };
  }

  async checkOwner(societyId, unitId, phone) {
    await this.findUnitInSociety(societyId, unitId);
    const user = await findUserByPhone(phone);
    if (!user) return { exists: false, user: null };
    return {
      exists: true,
      user: { name: user.name, email: user.email, phone: user.phone },
    };
  }

  async assignOwner(societyId, unitId, payload) {
    const unit = await this.findUnitInSociety(societyId, unitId);
    if (unit.ownerId) {
      throw new AppError("This house already has an owner assigned", 409);
    }

    const { user, credentialsCreated } = await this.createOrFindOwner(payload);
    await this.linkOwnerToUnit(user, unit);

    unit.ownerId = user._id;
    unit.inviteToken = null;
    unit.inviteExpiresAt = null;
    await unit.save();
    await unit.populate("ownerId", "name email phone");

    return {
      unit: this.mapUnitCard(unit),
      credentialsCreated,
      loginUsername: user.phone,
      temporaryPassword: credentialsCreated ? normalizePhone(user.phone) : null,
      message: credentialsCreated
        ? `Owner account created. Login username and password are both ${user.phone}.`
        : `${user.name} already had an account. Their existing credentials still work.`,
    };
  }

  async unassignOwner(societyId, unitId) {
    const unit = await this.findUnitInSociety(societyId, unitId);
    if (!unit.ownerId) {
      throw new AppError("This house has no owner assigned", 409);
    }

    await Membership.updateOne(
      { userId: unit.ownerId, societyId },
      { $pull: { units: unit._id } }
    );
    const membership = await Membership.findOne({ userId: unit.ownerId, societyId }).lean();
    if (membership && membership.role === "owner" && (!membership.units || membership.units.length === 0)) {
      await Membership.findByIdAndUpdate(membership._id, { isActive: false });
    }

    unit.ownerId = null;
    unit.inviteToken = null;
    unit.inviteExpiresAt = null;
    await unit.save();

    return this.mapUnitCard(unit);
  }

  async createInviteLink(societyId, unitId, frontendUrl) {
    const unit = await this.findUnitInSociety(societyId, unitId);
    if (unit.ownerId) {
      throw new AppError("This house already has an owner assigned", 409);
    }

    unit.inviteToken = crypto.randomBytes(24).toString("hex");
    unit.inviteExpiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await unit.save();

    const base = (frontendUrl || "").replace(/\/$/, "");
    return {
      inviteUrl: `${base}/house-invite/${unit.inviteToken}`,
      expiresAt: unit.inviteExpiresAt,
    };
  }

  async getInvitePreview(token) {
    const unit = await Unit.findOne({ inviteToken: token }).lean();
    if (!unit || !unit.inviteExpiresAt || new Date(unit.inviteExpiresAt) < new Date()) {
      throw new AppError("This invite link is invalid or has expired", 410);
    }
    const society = await Society.findById(unit.societyId).lean();
    return {
      societyName: society ? society.name : "",
      houseNumber: unit.label,
    };
  }

  async submitInvite(token, payload) {
    const unit = await Unit.findOne({ inviteToken: token });
    if (!unit || !unit.inviteExpiresAt || new Date(unit.inviteExpiresAt) < new Date()) {
      throw new AppError("This invite link is invalid or has expired", 410);
    }
    if (unit.ownerId) {
      throw new AppError("This house has already been claimed", 409);
    }

    const { user, credentialsCreated } = await this.createOrFindOwner(payload);
    await this.linkOwnerToUnit(user, unit);

    unit.ownerId = user._id;
    unit.inviteToken = null;
    unit.inviteExpiresAt = null;
    await unit.save();

    return {
      name: user.name,
      loginUsername: user.phone,
      credentialsCreated,
      message: credentialsCreated
        ? `Welcome ${user.name}! Your account is ready. Login username and password are both your phone number (${user.phone}).`
        : `Welcome back ${user.name}! House ${unit.label} is now linked to your existing account.`,
    };
  }
}

module.exports = new UnitService();
