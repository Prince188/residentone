const { AuditLog } = require("./audit-log.model");
const logger = require("../../config/logger");

class AuditLogService {
  /**
   * Records an admin or committee action to the tamper-proof society audit trail.
   * Runs non-blockingly without throwing errors that could interrupt main operations.
   */
  async recordActivity({
    societyId,
    userId,
    userName,
    userPhone,
    userRole,
    req,
    action,
    entityType,
    entityId,
    details = {},
  }) {
    try {
      if (!societyId || !userId || !action) return;

      let name = userName;
      let phone = userPhone;
      let role = userRole;
      let ip = null;

      if (req) {
        ip = (
          req.headers?.["x-forwarded-for"] ||
          req.ip ||
          req.socket?.remoteAddress ||
          ""
        )
          .split(",")[0]
          .trim();

        if (!role && req.role) {
          role = Array.isArray(req.role) ? req.role[0] : req.role;
        }
      }

      // If user details are not passed, fetch them quickly
      if (!name) {
        try {
          const { User } = require("../user/user.model");
          const user = await User.findById(userId).select("name phone role").lean();
          if (user) {
            name = user.name || "Admin";
            phone = user.phone || "";
            if (!role) role = Array.isArray(user.role) ? user.role[0] : "society_admin";
          }
        } catch (_) {}
      }

      await AuditLog.create({
        societyId,
        performedBy: userId,
        performedByName: name || "Admin",
        performedByPhone: phone || "",
        performedByRole: role || "society_admin",
        action,
        entityType: entityType || "General",
        entityId: entityId ? String(entityId) : null,
        details,
        ipAddress: ip,
      });

      logger.debug(`📝 [AUDIT LOG] ${action} on ${entityType} (${entityId}) by ${name} in society ${societyId}`);
    } catch (err) {
      logger.error("Failed to record audit log:", err);
    }
  }

  /**
   * Retrieves paginated society audit trail logs
   */
  async list(societyId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 30));
    const skip = (page - 1) * limit;

    const filter = { societyId };

    if (query.action && query.action !== "all") {
      filter.action = query.action;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      filter.$or = [
        { performedByName: { $regex: term, $options: "i" } },
        { performedByPhone: { $regex: term, $options: "i" } },
        { action: { $regex: term, $options: "i" } },
        { entityType: { $regex: term, $options: "i" } },
      ];
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new AuditLogService();
