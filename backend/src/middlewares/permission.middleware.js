const { Society } = require("../modules/society/society.model");
const { hasPermission, hasPermissionForMembership } = require("../shared/permissions");
const { AppError } = require("../shared/utils/errors");

function requirePermission(permission) {
  return async (req, _res, next) => {
    try {
      const membership = req.membership;
      if (membership) {
        if (hasPermissionForMembership(membership, permission, null)) {
          // need custom perms fetch if not super/society
          if ((membership.role === "super_admin" || membership.role === "society_admin" || (membership.additionalRoles || []).includes("super_admin") || (membership.additionalRoles || []).includes("society_admin"))) {
            return next();
          }
        }
      }
      const role = req.membership?.role || (Array.isArray(req.role) ? req.role[0] : req.role) || req.accountRole;
      if (!role) {
        return next(new AppError("Insufficient permissions", 403));
      }
      // super_admin and society_admin always have all permissions (including via additionalRoles)
      const roles = [role, ...((req.membership?.additionalRoles) || [])];
      if (roles.includes("super_admin") || roles.includes("society_admin")) {
        return next();
      }

      let customPermissions = null;
      if (req.societyId) {
        const society = await Society.findById(req.societyId).select("rolePermissions").lean();
        customPermissions = society?.rolePermissions || null;
      }

      if (membership && hasPermissionForMembership(membership, permission, customPermissions)) {
        return next();
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
