const unitService = require("./unit.service");
const { config } = require("../../config");
const { Unit } = require("./unit.model");
const { AppError } = require("../../shared/utils/errors");

class UnitController {
  async list(req, res, next) {
    try {
      const units = await unitService.ensureUnitsForSociety(req.societyId);
      res.json({
        success: true,
        data: units.map((u) => unitService.mapUnitCard(u)),
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      // Allow admin or house owner/tenant to view
      const isAdmin = ["super_admin", "society_admin"].includes(req.membership?.role || req.role?.[0]);
      if (!isAdmin) {
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
      const isAdmin = ["super_admin", "society_admin"].includes(req.membership?.role || req.role?.[0]);
      if (!isAdmin) {
        // Only house owner can add renter to their own house
        if (!isRenter) throw new AppError("Only Society Admin can assign owner", 403);
        const unit = await Unit.findOne({ _id: req.params.unitId, societyId: req.societyId }).lean();
        if (!unit || !unit.ownerId || String(unit.ownerId) !== String(req.userId)) {
          throw new AppError("Only the house owner or Society Admin can add renter", 403);
        }
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
      const isAdmin = ["super_admin", "society_admin"].includes(req.membership?.role || req.role?.[0]);
      if (!isAdmin) {
        // House owner can remove renter only
        if (residentType !== "renter") throw new AppError("Only Society Admin can remove owner", 403);
        const unit = await Unit.findOne({ _id: req.params.unitId, societyId: req.societyId }).lean();
        if (!unit || !unit.ownerId || String(unit.ownerId) !== String(req.userId)) {
          throw new AppError("Only the house owner or Society Admin can remove renter", 403);
        }
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
      const isAdmin = ["super_admin", "society_admin"].includes(req.membership?.role || req.role?.[0]);
      if (!isAdmin && isRenter) {
        const unit = await Unit.findOne({ _id: req.params.unitId, societyId: req.societyId }).lean();
        if (!unit || !unit.ownerId || String(unit.ownerId) !== String(req.userId)) {
          throw new AppError("Only the house owner or Society Admin can invite renter", 403);
        }
      } else if (!isAdmin) {
        throw new AppError("Only Society Admin can invite owner", 403);
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
