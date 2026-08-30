const { Society } = require("../modules/society/society.model");
const { hasPermission } = require("../shared/permissions");
const { AppError } = require("../shared/utils/errors");

function requirePermission(permission) {
  return async (req, _res, next) => {
    try {
      const role = req.membership?.role || (Array.isArray(req.role) ? req.role[0] : req.role) || req.accountRole;
      if (!role) {
        return next(new AppError("Insufficient permissions", 403));
      }
      // super_admin and society_admin always have all permissions
      if (["super_admin", "society_admin"].includes(role)) {
        return next();
      }

      let customPermissions = null;
      if (req.societyId) {
        const society = await Society.findById(req.societyId).select("rolePermissions").lean();
        customPermissions = society?.rolePermissions || null;
      }

      if (hasPermission(role, permission, customPermissions)) {
        return next();
      }
      return next(new AppError(`Permission denied: ${permission} required for role ${role}`, 403));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { requirePermission };
