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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      .select("label doorNo block")
      .lean();
    // If wings already exist (apartment with block), don't create sequential 1..N duplicates that cause General wing doubling
    const hasWingedUnits = existing.some((u) => Boolean(u.block));
    if (hasWingedUnits) {
      // Auto-cleanup legacy General sequential houses for apartments (created before wing structure)
      if (society.societyType !== "row_house") {
        const generalCount = existing.filter((u) => !u.block).length;
        if (generalCount > 0 && existing.length > totalUnits) {
          try {
            await Unit.deleteMany({ societyId: society._id, block: null });
            // also block empty string
            await Unit.deleteMany({ societyId: society._id, block: "" });
            const cleaned = await Unit.find({ societyId: society._id }).lean();
            if (cleaned.length >= totalUnits) return this.listUnits(societyId);
          } catch (_) {}
        }
      }
      // If count already matches totalUnits, skip
      if (existing.length >= totalUnits) return this.listUnits(societyId);
      // If winged but count less than totalUnits, still skip sequential creation - wing structure is authoritative
      // Only create sequential for row_house without wings
      if (society.societyType !== "row_house") return this.listUnits(societyId);
    }
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

  async bulkGenerateFromStructure(societyId, structure) {
    const society = await Society.findById(societyId).lean();
    if (!society) throw new AppError("Society not found", 404);

    const wings = Array.isArray(structure?.wings) ? structure.wings : [];
    const globalNumbering = structure?.numberingMode === "sequential" ? "sequential" : "floor_based";
    if (wings.length === 0) throw new AppError("At least one wing is required", 400);

    const existing = await Unit.find({ societyId: society._id }).select("label").lean();
    const existingLabels = new Set(existing.map((u) => String(u.label)));
    const propertyType = society.societyType === "row_house" ? "row_house" : "flat";

    const toCreate = [];
    let unitCounter = existing.length + 1;

    for (const wing of wings) {
      const wingName = String(wing.name || "").trim().toUpperCase();
      if (!wingName) throw new AppError("Wing name is required", 400);
      if (!/^[A-Z0-9]{1,10}$/.test(wingName)) throw new AppError(`Invalid wing name: ${wingName}`, 400);
      const floors = Number(wing.floors);
      if (!Number.isInteger(floors) || floors < 1 || floors > 100) throw new AppError(`Invalid floors for wing ${wingName}`, 400);
      const numberingMode = wing.numberingMode === "sequential" || wing.numberingMode === "floor_based" ? wing.numberingMode : globalNumbering;
      const hasGround = Boolean(wing.hasGround);
      const groundFlats = Number.isInteger(wing.groundFlats) ? wing.groundFlats : (hasGround ? 2 : 0);
      const defaultPerFloor = Number.isInteger(wing.defaultPerFloor) && wing.defaultPerFloor >= 0 ? wing.defaultPerFloor : 4;
      const perFloorMap = wing.perFloorMap && typeof wing.perFloorMap === "object" ? wing.perFloorMap : {};

      let seqCounter = 1;
      for (let f = hasGround ? 0 : 1; f <= floors; f += 1) {
        const key = String(f);
        let count;
        if (f === 0) count = groundFlats;
        else if (perFloorMap[key] !== undefined) count = Number(perFloorMap[key]);
        else if (perFloorMap[String(f)] !== undefined) count = Number(perFloorMap[String(f)]);
        else count = defaultPerFloor;
        count = Number(count);
        if (!Number.isInteger(count) || count < 0 || count > 50) throw new AppError(`Invalid flat count for wing ${wingName} floor ${f === 0 ? "G" : f}`, 400);
        for (let door = 1; door <= count; door += 1) {
          let label;
          let floorStr;
          let doorNo;
          if (numberingMode === "sequential") {
            label = `${wingName}-${seqCounter}`;
            floorStr = f === 0 ? "G" : String(f);
            doorNo = String(seqCounter);
            seqCounter += 1;
          } else {
            if (f === 0) {
              label = `${wingName}-G${door}`;
              floorStr = "G";
              doorNo = `G${door}`;
            } else {
              label = `${wingName}-${f}0${door}`;
              floorStr = String(f);
              doorNo = `${f}0${door}`;
            }
          }
          if (existingLabels.has(label)) continue;
          existingLabels.add(label);
          toCreate.push({
            societyId: society._id,
            propertyType,
            label,
            block: wingName,
            floor: floorStr,
            doorNo,
            unitNumber: unitCounter++,
          });
        }
      }
    }

    if (toCreate.length > 0) {
      try {
        await Unit.insertMany(toCreate, { ordered: false });
      } catch (error) {
        if (!error || error.code !== 11000) throw error;
      }
    }
    return this.listUnits(societyId);
  }

  async listUnits(societyId) {
    return Unit.find({ societyId })
      .sort({ unitNumber: 1, label: 1 })
      .populate("ownerId", "name email phone vehicles occupation familyMembers isActive createdAt")
      .populate("tenantId", "name email phone vehicles occupation familyMembers isActive createdAt")
      .lean();
  }

  mapUnitCard(unit) {
    const mapResident = (u) =>
      u
        ? {
            id: u._id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            vehicles: u.vehicles || [],
            occupation: u.occupation || "",
            familyMembers: u.familyMembers ?? null,
            isActive: u.isActive,
            createdAt: u.createdAt,
          }
        : null;
    return {
      id: unit._id,
      label: unit.label,
      doorNo: unit.doorNo,
      block: unit.block || null,
      floor: unit.floor || null,
      propertyType: unit.propertyType || null,
      unitNumber: unit.unitNumber || null,
      isAssigned: Boolean(unit.ownerId),
      isRented: Boolean(unit.tenantId),
      hasPendingInvite: Boolean(unit.inviteToken && unit.inviteExpiresAt && new Date(unit.inviteExpiresAt) > new Date()),
      owner: mapResident(unit.ownerId),
      tenant: mapResident(unit.tenantId),
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
    const populated = await unit.populate("ownerId", "name email phone vehicles occupation familyMembers isActive createdAt");
    await populated.populate("tenantId", "name email phone vehicles occupation familyMembers isActive createdAt");
    const [card, society] = await Promise.all([
      Promise.resolve(this.mapUnitCard(populated)),
      Society.findById(societyId).select("name").lean(),
    ]);
    return { ...card, societyName: society ? society.name : null };
  }

  async linkOwnerToUnit(user, unit, desiredRole = "owner") {
    let membership = await Membership.findOne({ userId: user._id, societyId: unit.societyId });
    if (!membership) {
      return Membership.create({
        userId: user._id,
        societyId: unit.societyId,
        role: desiredRole,
        units: [unit._id],
      });
    }
    if (!membership.units) membership.units = [];
    if (!membership.units.some((u) => String(u) === String(unit._id))) {
      membership.units.push(unit._id);
    }
    if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[desiredRole]) {
      membership.role = desiredRole;
    }
    membership.isActive = true;
    return membership.save();
  }

  async applyResidentProfile(userId, payload) {
    const update = {};
    if (Array.isArray(payload.vehicles)) {
      update.vehicles = payload.vehicles.map((v) => String(v).trim().toUpperCase()).filter(Boolean);
    }
    if (payload.occupation !== undefined && payload.occupation !== null) {
      update.occupation = String(payload.occupation).trim();
    }
    if (payload.familyMembers !== undefined && payload.familyMembers !== null && payload.familyMembers !== "") {
      update.familyMembers = Number(payload.familyMembers);
    }
    if (Object.keys(update).length === 0) return;
    await User.findByIdAndUpdate(userId, { $set: update });
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

  async searchUsers(query) {
    const raw = String(query || "").trim();
    if (!raw) return [];

    const digits = normalizePhone(raw);
    const conditions = [];
    if (digits.length >= 3) {
      conditions.push({ phone: { $regex: escapeRegExp(digits) } });
    }
    if (/[a-zA-Z]/.test(raw)) {
      const rx = new RegExp(escapeRegExp(raw), "i");
      conditions.push({ name: rx });
      conditions.push({ email: rx });
    }
    if (conditions.length === 0) return [];

    const users = await User.find({ $or: conditions })
      .select("name email phone")
      .limit(8)
      .lean();
    return users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
    }));
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
    const isRenter = payload.residentType === "renter";

    if (isRenter) {
      if (unit.tenantId) {
        throw new AppError("This house already has a renter", 409);
      }
      // Allow renter even if owner exists (owner + renter can co-exist)
    } else if (unit.ownerId) {
      throw new AppError("This house already has an owner assigned", 409);
    }

    const { user, credentialsCreated } = await this.createOrFindOwner(payload);
    await this.applyResidentProfile(user._id, payload);

    if (isRenter) {
      await this.linkOwnerToUnit(user, unit, "tenant");
      unit.tenantId = user._id;
    } else {
      await this.linkOwnerToUnit(user, unit, "owner");
      unit.ownerId = user._id;
    }
    unit.inviteToken = null;
    unit.inviteExpiresAt = null;
    await unit.save();
    await unit.populate("ownerId", "name email phone vehicles");
    await unit.populate("tenantId", "name email phone vehicles");

    return {
      unit: this.mapUnitCard(unit),
      credentialsCreated,
      loginUsername: user.phone,
      temporaryPassword: credentialsCreated ? normalizePhone(user.phone) : null,
      message: credentialsCreated
        ? `${isRenter ? "Renter" : "Owner"} account created. Login username and password are both ${user.phone}.`
        : `${user.name} already had an account. Their existing credentials still work.`,
    };
  }

  async unassignOwner(societyId, unitId, residentType) {
    const unit = await this.findUnitInSociety(societyId, unitId);
    // Support tab-specific removal: owner vs renter
    let targetId = null;
    let role = null;
    if (residentType === "renter") {
      targetId = unit.tenantId;
      role = "tenant";
      if (!targetId) throw new AppError("No renter assigned to this house", 409);
    } else if (residentType === "owner") {
      targetId = unit.ownerId;
      role = "owner";
      if (!targetId) throw new AppError("No owner assigned to this house", 409);
    } else {
      // fallback: remove whichever exists (owner first)
      targetId = unit.ownerId || unit.tenantId;
      role = unit.ownerId ? "owner" : "tenant";
      if (!targetId) throw new AppError("This house has no resident assigned", 409);
    }

    await Membership.updateOne(
      { userId: targetId, societyId },
      { $pull: { units: unit._id } }
    );
    const membership = await Membership.findOne({ userId: targetId, societyId }).lean();
    if (membership && membership.role === role && (!membership.units || membership.units.length === 0)) {
      await Membership.findByIdAndUpdate(membership._id, { isActive: false });
    }

    if (residentType === "renter") unit.tenantId = null;
    else if (residentType === "owner") unit.ownerId = null;
    else {
      unit.ownerId = null;
      unit.tenantId = null;
    }
    unit.inviteToken = null;
    unit.inviteExpiresAt = null;
    await unit.save();

    return this.mapUnitCard(unit);
  }

  async createInviteLink(societyId, unitId, frontendUrl, residentType = "owner") {
    const unit = await this.findUnitInSociety(societyId, unitId);
    const isRenter = residentType === "renter";
    if (isRenter) {
      if (unit.tenantId) throw new AppError("This house already has a renter", 409);
    } else {
      if (unit.ownerId) throw new AppError("This house already has an owner assigned", 409);
    }

    unit.inviteToken = crypto.randomBytes(24).toString("hex");
    unit.inviteExpiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    unit.inviteResidentType = residentType === "renter" ? "renter" : "owner";
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
      residentType: unit.inviteResidentType || "owner",
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
    await this.applyResidentProfile(user._id, payload);

    const isRenter = (unit.inviteResidentType || "owner") === "renter";
    await this.linkOwnerToUnit(user, unit, isRenter ? "tenant" : "owner");
    if (isRenter) {
      unit.tenantId = user._id;
    } else {
      unit.ownerId = user._id;
    }
    unit.inviteToken = null;
    unit.inviteExpiresAt = null;
    unit.inviteResidentType = "owner";
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
