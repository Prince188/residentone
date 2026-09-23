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
      try {
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        const { Unit } = require("../unit/unit.model");
        const targetUnitId = result?.unitId || req.body?.unitId;
        if (targetUnitId) {
          const unitDoc = await Unit.findById(targetUnitId).select("ownerId tenantId label").lean();
          const recipientUserIds = [unitDoc?.ownerId, unitDoc?.tenantId].filter(Boolean).map(String);
          pushNotificationService.sendPushToUsers({
            userIds: recipientUserIds,
            title: "🚪 Visitor Arrival at Gate",
            body: `${req.body.name || 'Visitor'} (${req.body.category || 'Guest'}) at gate for House ${unitDoc?.label || 'your unit'}.`,
            data: { screen: "Visitors" },
          });
        }
      } catch (_) {}
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

  async listParcels(req, res, next) {
    try {
      const result = await visitorService.getParcels(
        req.societyId,
        req.userId,
        req.membership,
        req.query
      );
      res.status(200).json({
        success: true,
        data: result.parcels,
        countWaiting: result.countWaiting,
      });
    } catch (err) {
      next(err);
    }
  }

  async logParcel(req, res, next) {
    try {
      const result = await visitorService.logParcel(
        req.societyId,
        req.userId,
        req.membership,
        req.body
      );
      try {
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        const { Unit } = require("../unit/unit.model");
        const targetUnitId = result?.unitId || req.body?.unitId;
        if (targetUnitId) {
          const unitDoc = await Unit.findById(targetUnitId).select("ownerId tenantId label").lean();
          const recipientUserIds = [unitDoc?.ownerId, unitDoc?.tenantId].filter(Boolean).map(String);
          pushNotificationService.sendPushToUsers({
            userIds: recipientUserIds,
            title: "📦 Parcel Received at Gate",
            body: `Courier parcel (${req.body.courierName || 'Delivery'}) received at Security Desk for House ${unitDoc?.label || 'your unit'}. Code: ${result.pickupCode || 'Available'}`,
            data: { screen: "GateParcel" },
          });
        }
      } catch (_) {}
      res.status(201).json({
        success: true,
        message: "Parcel delivery logged at gate desk successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyParcelPickup(req, res, next) {
    try {
      const result = await visitorService.verifyParcelPickup(
        req.societyId,
        req.body.parcelCode
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async collectParcel(req, res, next) {
    try {
      const result = await visitorService.collectParcel(
        req.societyId,
        req.params.id,
        req.userId,
        req.membership
      );
      res.status(200).json({
        success: true,
        message: "Parcel marked as collected / handed over",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VisitorController();
