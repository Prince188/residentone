const staffService = require("./staff.service");
const auditLogService = require("../audit-log/audit-log.service");

class StaffController {
  async lookupUser(req, res, next) {
    try {
      const user = await staffService.lookupUserByPhone(req.query.phone);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const result = await staffService.listStaff(req.societyId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async add(req, res, next) {
    try {
      const result = await staffService.addStaff(req.societyId, req.body);

      auditLogService.recordActivity({
        societyId: req.societyId,
        userId: req.userId,
        req,
        action: "STAFF_ADDED",
        entityType: "Staff",
        entityId: result?.membership?._id || result?._id,
        details: {
          staffName: req.body?.name,
          staffPhone: req.body?.phone,
          staffRole: req.body?.role || "security_guard",
        },
      });

      res.status(201).json({
        success: true,
        message: "Staff member added successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await staffService.updateStaff(
        req.societyId,
        req.params.id,
        req.body
      );
      res.status(200).json({
        success: true,
        message: "Staff member updated successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      const result = await staffService.removeStaff(req.societyId, req.params.id);

      auditLogService.recordActivity({
        societyId: req.societyId,
        userId: req.userId,
        req,
        action: "STAFF_REMOVED",
        entityType: "Staff",
        entityId: req.params.id,
      });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StaffController();
