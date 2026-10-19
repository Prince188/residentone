const auditLogService = require("./audit-log.service");

class AuditLogController {
  async list(req, res, next) {
    try {
      const societyId = req.societyId;
      const result = await auditLogService.list(societyId, req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuditLogController();
