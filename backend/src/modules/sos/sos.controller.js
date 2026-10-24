const { sosService } = require("./sos.service");

class SOSController {
  async trigger(req, res, next) {
    try {
      const incident = await sosService.triggerSOS({
        societyId: req.societyId,
        userId: req.userId,
        unitId: req.body.unitId,
        emergencyType: req.body.emergencyType,
        locationDescription: req.body.locationDescription,
      });

      res.status(201).json({
        success: true,
        data: incident,
        message: "Emergency SOS broadcasted successfully to security team and society admins",
      });
    } catch (err) {
      next(err);
    }
  }

  async getActive(req, res, next) {
    try {
      const incidents = await sosService.getActiveIncidents(req.societyId);
      res.json({
        success: true,
        data: incidents,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyActive(req, res, next) {
    try {
      const incident = await sosService.getMyActiveSOS(req.societyId, req.userId);
      res.json({
        success: true,
        data: incident,
      });
    } catch (err) {
      next(err);
    }
  }

  async acknowledge(req, res, next) {
    try {
      const incident = await sosService.acknowledgeSOS(
        req.params.id,
        req.userId,
        req.societyId
      );
      res.json({
        success: true,
        data: incident,
        message: "SOS alert acknowledged. Resident has been notified that help is responding.",
      });
    } catch (err) {
      next(err);
    }
  }

  async resolve(req, res, next) {
    try {
      const incident = await sosService.resolveSOS(
        req.params.id,
        req.userId,
        req.societyId,
        req.body
      );
      res.json({
        success: true,
        data: incident,
        message: incident.status === "false_alarm" ? "Incident marked as false alarm" : "Incident successfully resolved",
      });
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req, res, next) {
    try {
      const data = await sosService.getHistory(req.societyId, req.query);
      res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

const sosController = new SOSController();
module.exports = sosController;
