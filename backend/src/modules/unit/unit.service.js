const mongoose = require("mongoose");
const crypto = require("crypto");
const { Unit } = require("./unit.model");
const { User } = require("../user/user.model");
const { Membership } = require("../membership/membership.model");
const { Society } = require("../society/society.model");
const { AppError } = require("../../shared/utils/errors");
const { ROLE_HIERARCHY, DEFAULT_ACCOUNT_ROLE } = require("../../shared/types");
const ExcelJS = require("exceljs");

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
      unitType: unit.unitType || "2bhk",
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

  async applyResidentProfile(userId, payload, societyId = null) {
    const update = {};
    if (Array.isArray(payload.vehicles)) {
      const cleanVehicles = payload.vehicles.map((v) => String(v).trim().toUpperCase()).filter(Boolean);
      if (societyId && cleanVehicles.length > 0) {
        const userService = require("../user/user.service");
        await userService.validateUniqueVehiclesInSociety(userId, societyId, cleanVehicles);
      }
      update.vehicles = cleanVehicles;
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
      .select("name email phone occupation vehicles familyMembers createdAt")
      .limit(8)
      .lean();

    const { FamilyMember } = require("../family-member/family-member.model");
    const mapped = await Promise.all(
      users.map(async (u) => {
        let familyCount = u.familyMembers;
        let familyList = [];
        try {
          familyList = await FamilyMember.find({ addedBy: u._id, isActive: true })
            .select("name relation phone occupation")
            .lean();
          if (familyList.length > 0 || familyCount === undefined || familyCount === null) {
            familyCount = familyList.length;
          }
        } catch (_) {}

        return {
          id: u._id,
          name: u.name,
          email: u.email && !u.email.endsWith("@residentone.local") ? u.email : "",
          phone: u.phone,
          occupation: u.occupation || "",
          vehicles: Array.isArray(u.vehicles) ? u.vehicles : [],
          familyMembers: familyCount ?? 0,
          familyList: familyList.map((f) => ({
            id: f._id,
            name: f.name,
            relation: f.relation,
            phone: f.phone,
            occupation: f.occupation || "",
          })),
        };
      })
    );
    return mapped;
  }

  async checkOwner(societyId, unitId, phone) {
    await this.findUnitInSociety(societyId, unitId);
    const user = await findUserByPhone(phone);
    if (!user) return { exists: false, user: null };

    const { FamilyMember } = require("../family-member/family-member.model");
    let familyCount = user.familyMembers;
    let familyList = [];
    try {
      familyList = await FamilyMember.find({ addedBy: user._id, isActive: true })
        .select("name relation phone occupation")
        .lean();
      if (familyList.length > 0 || familyCount === undefined || familyCount === null) {
        familyCount = familyList.length;
      }
    } catch (_) {}

    return {
      exists: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email && !user.email.endsWith("@residentone.local") ? user.email : "",
        phone: user.phone,
        occupation: user.occupation || "",
        vehicles: Array.isArray(user.vehicles) ? user.vehicles : [],
        familyMembers: familyCount ?? 0,
        familyList: familyList.map((f) => ({
          id: f._id,
          name: f.name,
          relation: f.relation,
          phone: f.phone,
          occupation: f.occupation || "",
        })),
      },
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
    await this.applyResidentProfile(user._id, payload, societyId);

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

    try {
      const { FamilyMember } = require("../family-member/family-member.model");
      await FamilyMember.updateMany(
        { addedBy: user._id, isActive: true, $or: [{ societyId: null }, { unitId: null }] },
        { $set: { societyId, unitId: unit._id } }
      );
    } catch (_) {}

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
    await this.applyResidentProfile(user._id, payload, unit.societyId);

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

  async updateUnit(societyId, unitId, data) {
    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true });
    if (!unit) throw new AppError("Unit not found", 404);

    if (data.label !== undefined) unit.label = data.label.trim();
    if (data.doorNo !== undefined) unit.doorNo = data.doorNo ? data.doorNo.trim() : null;
    if (data.block !== undefined) unit.block = data.block ? data.block.trim() : null;
    if (data.floor !== undefined) unit.floor = data.floor;
    if (data.propertyType !== undefined) unit.propertyType = data.propertyType;
    if (data.unitType !== undefined) unit.unitType = data.unitType ? data.unitType.trim() : "2bhk";

    await unit.save();

    try {
      const s = require("../../socket");
      if (s.emitToSociety) s.emitToSociety(String(societyId), "unit:change", { action: "update", id: unit._id });
    } catch (_) {}

    return this.getUnitDetail(societyId, unit._id);
  }

  async deleteUnit(societyId, unitId) {
    const unit = await Unit.findOne({ _id: unitId, societyId, isActive: true });
    if (!unit) throw new AppError("Unit not found", 404);

    await Membership.updateMany(
      { societyId, units: unit._id },
      { $pull: { units: unit._id } }
    );

    const { FamilyMember } = require("../family-member/family-member.model");
    await FamilyMember.updateMany({ societyId, unitId: unit._id }, { $set: { unitId: null } });

    await Unit.findByIdAndDelete(unit._id);

    try {
      const s = require("../../socket");
      if (s.emitToSociety) s.emitToSociety(String(societyId), "unit:change", { action: "delete", id: unit._id });
    } catch (_) {}

    return { id: unit._id, deleted: true };
  }

  async getSocietyVehicles(societyId, query = {}) {
    const { Visitor } = require("../visitor/visitor.model");
    const search = String(query.search || "").trim().toLowerCase();
    const typeFilter = String(query.type || "all").toLowerCase();

    // 1. Fetch all Units in society to map resident vehicles
    const units = await Unit.find({ societyId, isActive: true })
      .populate("ownerId", "name email phone vehicles")
      .populate("tenantId", "name email phone vehicles")
      .lean();

    const residentMap = new Map();

    units.forEach((u) => {
      const flatLabel = `Flat ${u.label || u.unitNumber || u.doorNo || ""}`.trim();

      const processResident = (resUser, roleName) => {
        if (!resUser || !Array.isArray(resUser.vehicles)) return;

        resUser.vehicles.forEach((vStr) => {
          if (!vStr || typeof vStr !== "string") return;
          const plate = vStr.trim().toUpperCase();
          if (!plate) return;

          if (!residentMap.has(plate)) {
            residentMap.set(plate, {
              id: `res_${resUser._id}_${plate}`,
              plateNumber: plate,
              type: "resident",
              ownerId: resUser._id,
              ownerName: resUser.name || "Resident",
              ownerPhone: resUser.phone || "",
              role: roleName,
              flats: [flatLabel],
            });
          } else {
            const existing = residentMap.get(plate);
            if (!existing.flats.includes(flatLabel)) {
              existing.flats.push(flatLabel);
            }
          }
        });
      };

      processResident(u.ownerId, "Owner");
      processResident(u.tenantId, "Tenant");
    });

    let residentVehicles = Array.from(residentMap.values());

    // 2. Fetch Active Visitors currently inside the society (status = "inside")
    const activeVisitors = await Visitor.find({
      societyId,
      status: "inside",
      vehicleNumber: { $ne: "" },
    })
      .populate("unitId", "label doorNo unitNumber block")
      .populate("hostUserId", "name phone")
      .sort({ checkedInAt: -1, createdAt: -1 })
      .lean();

    const visitorVehicles = activeVisitors.map((v) => {
      const hostLabel = v.unitId ? `Flat ${v.unitId.label || v.unitId.unitNumber || ""}` : "";
      return {
        id: String(v._id),
        plateNumber: (v.vehicleNumber || "").trim().toUpperCase(),
        type: "visitor",
        visitorName: v.name || "Visitor",
        visitorPhone: v.phone || "",
        visitorType: v.visitorType || "guest",
        company: v.company || "",
        hostName: v.hostUserId?.name || "",
        visitingFlat: hostLabel,
        checkedInAt: v.checkedInAt || v.createdAt,
        status: v.status,
      };
    });

    // 3. Search Filter
    if (search) {
      residentVehicles = residentVehicles.filter((r) => {
        const plateMatch = r.plateNumber.toLowerCase().includes(search);
        const nameMatch = r.ownerName.toLowerCase().includes(search);
        const flatMatch = r.flats.some((f) => f.toLowerCase().includes(search));
        return plateMatch || nameMatch || flatMatch;
      });
    }

    let filteredVisitors = visitorVehicles;
    if (search) {
      filteredVisitors = visitorVehicles.filter((v) => {
        const plateMatch = v.plateNumber.toLowerCase().includes(search);
        const nameMatch = v.visitorName.toLowerCase().includes(search);
        const flatMatch = v.visitingFlat.toLowerCase().includes(search);
        const hostMatch = v.hostName.toLowerCase().includes(search);
        return plateMatch || nameMatch || flatMatch || hostMatch;
      });
    }

    let resultList = [];
    if (typeFilter === "resident") {
      resultList = residentVehicles;
    } else if (typeFilter === "visitor") {
      resultList = filteredVisitors;
    } else {
      resultList = [...residentVehicles, ...filteredVisitors];
    }

    return {
      residentVehicles,
      visitorVehicles: filteredVisitors,
      allVehicles: resultList,
      totalCount: resultList.length,
      residentCount: residentVehicles.length,
      visitorCount: filteredVisitors.length,
    };
  }

  async generateHousesExcelBuffer(societyId, options = {}) {
    const filter = options.filter || "all";
    const society = await Society.findById(societyId).select("name").lean();
    const societyName = society?.name || "Society";

    const { FamilyMember } = require("../family-member/family-member.model");

    // Fetch units and family members in parallel
    const [units, familyMembers] = await Promise.all([
      Unit.find({ societyId, isActive: true })
        .populate("ownerId", "name phone email vehicles")
        .populate("tenantId", "name phone email vehicles")
        .sort({ block: 1, unitNumber: 1, label: 1 })
        .lean(),
      FamilyMember.find({ societyId, isActive: true })
        .populate("addedBy", "_id name")
        .populate("unitId", "_id label")
        .lean(),
    ]);

    // Apply Filter
    let filteredUnits = units;
    if (filter === "owner") {
      filteredUnits = units.filter((u) => u.ownerId && !u.tenantId);
    } else if (filter === "renter") {
      filteredUnits = units.filter((u) => Boolean(u.tenantId));
    } else if (filter === "vacant") {
      filteredUnits = units.filter((u) => !u.ownerId && !u.tenantId);
    }

    // Rules implementation:
    // Rule 1: If someone has >1 house, we show their details on every house, BUT their family members are assigned ONLY to their primary house (so family members are NOT added a 2nd time).
    // Rule 2: If a house is rented, we count and show ONLY the tenant's (renter's) family members, ignoring the non-resident owner's family members.
    // Rule 3: Total House Resident Count = 1 (Head/Resident: Owner or Tenant) + Family Member Count.

    const seenResidentIds = new Set();
    let totalSocietyPrimaryCount = 0;
    let totalSocietyFamilyCount = 0;

    const houseProcessedData = filteredUnits.map((unit) => {
      const isRented = Boolean(unit.tenantId);
      const isOwner = Boolean(unit.ownerId);
      const isVacant = !isRented && !isOwner;

      // Active resident living in the house (Rule 2: Tenant if rented, Owner if owned & occupied)
      const activeResident = isRented ? unit.tenantId : isOwner ? unit.ownerId : null;
      const activeResidentId = activeResident ? String(activeResident._id || activeResident) : null;

      let famList = [];

      if (activeResidentId) {
        if (!seenResidentIds.has(activeResidentId)) {
          seenResidentIds.add(activeResidentId);

          // Rule 2: Fetch family members belonging to active resident (tenant if rented, owner if owned)
          famList = familyMembers.filter(
            (m) => String(m.addedBy?._id || m.addedBy) === activeResidentId
          );
        } else {
          // Rule 1: Resident seen on a previous house. Do NOT add family members a 2nd time!
          famList = [];
        }
      }

      const famCount = famList.length;
      // Rule 3: Include the resident (Head of house) + family member count
      const headCount = isVacant ? 0 : 1;
      const totalHouseResidents = headCount + famCount;

      if (headCount > 0) totalSocietyPrimaryCount += 1;
      totalSocietyFamilyCount += famCount;

      return {
        unit,
        isRented,
        isVacant,
        status: isRented ? "Rented" : isOwner ? "Owner" : "Vacant",
        resident: activeResident || {},
        owner: unit.ownerId || {},
        tenant: unit.tenantId || {},
        famList,
        famCount,
        headCount,
        totalHouseResidents,
      };
    });

    const grandTotalSocietyResidents = totalSocietyPrimaryCount + totalSocietyFamilyCount;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ResidentOne";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Houses & Residents", {
      views: [{ state: "frozen", ySplit: 4 }],
    });

    // Page Title (Row 1)
    sheet.mergeCells(1, 1, 1, 17);
    const titleCell = sheet.getCell("A1");
    titleCell.value = `${societyName}  —  Houses & Residents Directory`;
    titleCell.font = { size: 14, bold: true, color: { argb: "FF006948" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 28;

    // Subtitle (Row 2) - Demographics summary line
    sheet.mergeCells(2, 1, 2, 17);
    const subCell = sheet.getCell("A2");
    const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const filterLabel = filter === "owner" ? "Owned Houses" : filter === "renter" ? "Rented Houses" : filter === "vacant" ? "Vacant Houses" : "All Houses";
    subCell.value = `Filter: ${filterLabel}  •  Total Units: ${filteredUnits.length}  •  Total Residents: ${grandTotalSocietyResidents} (${totalSocietyPrimaryCount} Primary + ${totalSocietyFamilyCount} Family)  •  Exported on ${dateStr}`;
    subCell.font = { size: 10, italic: true, color: { argb: "FF49454F" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 20;

    // Blank row 3
    sheet.mergeCells(3, 1, 3, 17);
    sheet.getRow(3).height = 8;

    // Header (Row 4) - 17 Columns
    const headers = [
      "Sr No",
      "Flat Number",
      "Block / Wing",
      "Floor",
      "Occupancy Status",
      "Resident Name",
      "Resident Phone",
      "Resident Email",
      "Owner Name",
      "Owner Phone",
      "Tenant Name",
      "Tenant Phone",
      "Vehicles",
      "Family Member Count",
      "Total House Residents",
      "Family Member Name",
      "Relation",
    ];

    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF006948" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FF86EFAC" } },
        left: { style: "thin", color: { argb: "FF86EFAC" } },
        bottom: { style: "thin", color: { argb: "FF86EFAC" } },
        right: { style: "thin", color: { argb: "FF86EFAC" } },
      };
    });

    // Enable Excel Header AutoFilter
    sheet.autoFilter = { from: "A4", to: "Q4" };

    let currentExcelRow = 5;

    houseProcessedData.forEach((item, idx) => {
      const { unit, status, resident, owner, tenant, famList, famCount, totalHouseResidents } = item;

      const vehicles = [
        ...(owner.vehicles || []),
        ...(tenant.vehicles || []),
      ]
        .filter(Boolean)
        .join(", ") || "—";

      const startRow = currentExcelRow;

      if (famCount === 0) {
        const rowData = [
          idx + 1,
          unit.label || "-",
          unit.block || unit.wing || "-",
          unit.floor !== undefined && unit.floor !== null ? unit.floor : "-",
          status,
          resident.name || "-",
          resident.phone || "-",
          resident.email || "-",
          owner.name || "-",
          owner.phone || "-",
          tenant.name || "-",
          tenant.phone || "-",
          vehicles,
          0,
          totalHouseResidents,
          "—",
          "—",
        ];
        const row = sheet.addRow(rowData);
        row.height = 20;
        currentExcelRow++;
      } else {
        famList.forEach((m) => {
          const rowData = [
            idx + 1,
            unit.label || "-",
            unit.block || unit.wing || "-",
            unit.floor !== undefined && unit.floor !== null ? unit.floor : "-",
            status,
            resident.name || "-",
            resident.phone || "-",
            resident.email || "-",
            owner.name || "-",
            owner.phone || "-",
            tenant.name || "-",
            tenant.phone || "-",
            vehicles,
            famCount,
            totalHouseResidents,
            m.name || "-",
            m.relation || "Member",
          ];
          const row = sheet.addRow(rowData);
          row.height = 20;
          currentExcelRow++;
        });

        const endRow = currentExcelRow - 1;

        // OPTION B: Vertically merge cells for House details across the family sub-rows
        if (endRow > startRow) {
          for (let col = 1; col <= 15; col++) {
            sheet.mergeCells(startRow, col, endRow, col);
          }
        }
      }
    });

    // Formatting cell styles & borders
    for (let r = 5; r < currentExcelRow; r++) {
      const row = sheet.getRow(r);
      row.font = { size: 10, color: { argb: "FF1D1B20" } };
      row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      row.getCell(6).alignment = { vertical: "middle", horizontal: "left" };
      row.getCell(8).alignment = { vertical: "middle", horizontal: "left" };
      row.getCell(9).alignment = { vertical: "middle", horizontal: "left" };
      row.getCell(11).alignment = { vertical: "middle", horizontal: "left" };
      row.getCell(15).font = { size: 10, bold: true, color: { argb: "FF006948" } };
      row.getCell(16).alignment = { vertical: "middle", horizontal: "left", bold: true };
      row.getCell(17).alignment = { vertical: "middle", horizontal: "center" };

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    }

    // Set Column Widths
    const widths = [8, 14, 14, 10, 16, 22, 16, 24, 22, 16, 22, 16, 22, 18, 20, 22, 16];
    widths.forEach((w, colIdx) => {
      sheet.getColumn(colIdx + 1).width = w;
    });

    return workbook.xlsx.writeBuffer();
  }
}

module.exports = new UnitService();
