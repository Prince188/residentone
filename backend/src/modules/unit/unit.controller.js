const unitService = require("./unit.service");
const { config } = require("../../config");

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
      const result = await unitService.unassignOwner(
        req.societyId,
        req.params.unitId
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createInviteLink(req, res, next) {
    try {
      const result = await unitService.createInviteLink(
        req.societyId,
        req.params.unitId,
        config.cors.origin
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
