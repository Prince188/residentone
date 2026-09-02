const visitorService = require("./visitor.service");

class VisitorController {
  async createPreApproval(req, res, next) {
    try {
      const result = await visitorService.createPreApproval(
        req.societyId,
        req.userId,
        req.membership,
        req.body
      );
      res.status(201).json({
        success: true,
        message: "Visitor pre-approved successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async createWalkIn(req, res, next) {
    try {
      const result = await visitorService.createWalkIn(
        req.societyId,
        req.userId,
        req.membership,
        req.body
      );
      res.status(201).json({
        success: true,
        message: "Walk-in visitor logged and approval request sent to resident",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async respondApproval(req, res, next) {
    try {
      const result = await visitorService.respondApproval(
        req.societyId,
        req.params.id,
        req.userId,
        req.membership,
        req.body.action
      );
      res.status(200).json({
        success: true,
        message: `Visitor status updated to ${req.body.action}`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyPasscode(req, res, next) {
    try {
      const result = await visitorService.verifyPasscode(
        req.societyId,
        req.body.passcode
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async checkIn(req, res, next) {
    try {
      const result = await visitorService.checkIn(
        req.societyId,
        req.userId,
        req.membership,
        req.params.id
      );
      res.status(200).json({
        success: true,
        message: "Visitor checked in successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async checkOut(req, res, next) {
    try {
      const result = await visitorService.checkOut(
        req.societyId,
        req.userId,
        req.membership,
        req.params.id,
        req.body?.notes
      );
      res.status(200).json({
        success: true,
        message: "Visitor checked out successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelPass(req, res, next) {
    try {
      const result = await visitorService.cancelPass(
        req.societyId,
        req.userId,
        req.membership,
        req.params.id
      );
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const result = await visitorService.list(
        req.societyId,
        req.userId,
        req.membership,
        req.query
      );
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req, res, next) {
    try {
      const result = await visitorService.getStats(
        req.societyId,
        req.userId,
        req.membership
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPublicPass(req, res, next) {
    try {
      const result = await visitorService.getPublicPass(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VisitorController();
