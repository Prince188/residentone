const unitService = require("./unit.service");
const { config } = require("../../config");
const { Unit } = require("./unit.model");
const { Society } = require("../society/society.model");
const { AppError } = require("../../shared/utils/errors");
const { hasPermission, hasPermissionForMembership, getMembershipRoles, isWingAdmin } = require("../../shared/permissions");

async function hasManageHousesPermission(req) {
  const membership = req.membership;
  if (membership) {
    const roles = getMembershipRoles(membership);
    if (roles.includes("super_admin") || roles.includes("society_admin")) return true;
    try {
      const society = await Society.findById(req.societyId).select("rolePermissions").lean();
      return hasPermissionForMembership(membership, "manage_houses", society?.rolePermissions);
    } catch {
      return false;
    }
  }
  const role = (Array.isArray(req.role) ? req.role[0] : req.role);
  if (["super_admin", "society_admin"].includes(role)) return true;
  try {
    const society = await Society.findById(req.societyId).select("rolePermissions").lean();
    return hasPermission(role, "manage_houses", society?.rolePermissions);
  } catch {
    return false;
  }
}

function canAccessWing(membership, block) {
  if (!membership || !isWingAdmin(membership)) return true;
  // society_admin + wing_admin has both, still allow all wings
  const roles = getMembershipRoles(membership);
  if (roles.includes("society_admin") || roles.includes("super_admin")) return true;
  const wings = (membership.assignedWings || []).map((w) => String(w).trim().toUpperCase());
  if (wings.length === 0) return false;
  const b = String(block || "").trim().toUpperCase();
  return wings.includes(b);
}

function isPureWingAdmin(membership) {
  if (!membership) return false;
  const roles = getMembershipRoles(membership);
  return roles.includes("wing_admin") && !roles.includes("society_admin") && !roles.includes("super_admin");
}

class UnitController {
  async list(req, res, next) {
    try {
      console.log('[units/list] societyId', req.societyId, 'user', req.userId, 'role', req.membership?.role);
      const units = await unitService.ensureUnitsForSociety(req.societyId);
      console.log('[units/list] found', units.length, 'for', req.societyId);
      res.json({
        success: true,
        data: units.map((u) => unitService.mapUnitCard(u)),
      });
    } catch (error) {
      console.error('[units/list] error', error.message);
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      // Allow admin, those with manage_houses permission, or house owner/tenant to view
      const roles = getMembershipRoles(req.membership || { role: req.role?.[0] });
      const isAdmin = roles.includes("super_admin") || roles.includes("society_admin");
      let canManage = isAdmin;
      if (!canManage) {
        canManage = await hasManageHousesPermission(req);
      }
      if (!canManage) {
        const unit = await Unit.findOne({ _id: req.params.unitId, societyId: req.societyId }).lean();
        if (!unit) throw new AppError("House not found", 404);
        const isOwner = unit.ownerId && String(unit.ownerId) === String(req.userId);
        const isTenant = unit.tenantId && String(unit.tenantId) === String(req.userId);
        const myUnits = (req.membership.units || []).map((id) => String(id));
        const isMyHouse = myUnits.includes(String(req.params.unitId));
        if (!isOwner && !isTenant && !isMyHouse) {
          throw new AppError("You do not have access to this house", 403);
        }
      }
      const unit = await unitService.getUnitDetail(req.societyId, req.params.unitId);
      res.json({ success: true, data: unit });
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req, res, next) {
    try {
      const users = await unitService.searchUsers(req.query.q);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async checkOwner(req, res, next) {
    try {
      const result = await unitService.checkOwner(
        req.societyId,
        req.params.unitId,
        req.body.phone
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async assignOwner(req, res, next) {
    try {
      const isRenter = req.body?.residentType === "renter";
      const canManage = await hasManageHousesPermission(req);
      if (!canManage) {
        // Only house owner can add renter to their own house
        if (!isRenter) throw new AppError("Only Society Admin can assign owner", 403);
        const unit = await Unit.findOne({ _id: req.params.unitId, societyId: req.societyId }).lean();
        if (!unit || !unit.ownerId || String(unit.ownerId) !== String(req.userId)) {
          throw new AppError("Only the house owner or Society Admin can add renter", 403);
        }
      } else if (isWingAdmin(req.membership) && isPureWingAdmin(req.membership)) {
        const unit = await Unit.findOne({ _id: req.params.unitId, societyId: req.societyId }).lean();
        if (!unit) throw new AppError("House not found", 404);
        if (!canAccessWing(req.membership, unit.block)) throw new AppError(`Wing Admin can only manage houses in wings: ${(req.membership.assignedWings||[]).join(", ")}`, 403);
      }
      const result = await unitService.assignOwner(
        req.societyId,
        req.params.unitId,
        req.body
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async unassignOwner(req, res, next) {
    try {
      const residentType = req.body?.residentType || req.query?.residentType;
      const canManage = await hasManageHousesPermission(req);
      if (!canManage) {
        // House owner can remove renter only
        if (residentType !== "renter") throw new AppError("Only Society Admin can remove owner", 403);
        const unit = await Unit.findOne({ _id: req.params.unitId, societyId: req.societyId }).lean();
        if (!unit || !unit.ownerId || String(unit.ownerId) !== String(req.userId)) {
          throw new AppError("Only the house owner or Society Admin can remove renter", 403);
        }
      } else if (isWingAdmin(req.membership) && isPureWingAdmin(req.membership)) {
        const unit = await Unit.findOne({ _id: req.params.unitId, societyId: req.societyId }).lean();
        if (!unit) throw new AppError("House not found", 404);
        if (!canAccessWing(req.membership, unit.block)) throw new AppError(`Wing Admin can only manage houses in wings: ${(req.membership.assignedWings||[]).join(", ")}`, 403);
      }
      const result = await unitService.unassignOwner(
        req.societyId,
        req.params.unitId,
        residentType
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createInviteLink(req, res, next) {
    try {
      const isRenter = req.body?.residentType === "renter";
      const canManage = await hasManageHousesPermission(req);
      if (!canManage && isRenter) {
        const unit = await Unit.findOne({ _id: req.params.unitId, societyId: req.societyId }).lean();
        if (!unit || !unit.ownerId || String(unit.ownerId) !== String(req.userId)) {
          throw new AppError("Only the house owner or Society Admin can invite renter", 403);
        }
      } else if (!canManage) {
        throw new AppError("Only Society Admin can invite owner", 403);
      } else if (isWingAdmin(req.membership) && isPureWingAdmin(req.membership)) {
        const unit = await Unit.findOne({ _id: req.params.unitId, societyId: req.societyId }).lean();
        if (!unit) throw new AppError("House not found", 404);
        if (!canAccessWing(req.membership, unit.block)) throw new AppError(`Wing Admin can only manage houses in wings: ${(req.membership.assignedWings||[]).join(", ")}`, 403);
      }
      const result = await unitService.createInviteLink(
        req.societyId,
        req.params.unitId,
        config.cors.origin,
        req.body.residentType
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async bulkGenerate(req, res, next) {
    try {
      if (isPureWingAdmin(req.membership)) throw new AppError("Wing Admin cannot bulk generate houses", 403);
      const units = await unitService.bulkGenerateFromStructure(req.societyId, req.body);
      res.status(201).json({ success: true, data: units.map((u) => unitService.mapUnitCard(u)) });
    } catch (error) {
      next(error);
    }
  }

  async getInvitePreview(req, res, next) {
    try {
      const result = await unitService.getInvitePreview(req.params.token);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async submitInvite(req, res, next) {
    try {
      const result = await unitService.submitInvite(req.params.token, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UnitController();
