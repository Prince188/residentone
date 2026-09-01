const { AppError } = require("../shared/utils/errors");
const membershipService = require("../modules/membership/membership.service");
const { Society } = require("../modules/society/society.model");
const logger = require("../config/logger");

async function resolveSocietyContext(req, _res, next) {
  try {
    const requestedSocietyId =
      req.headers["x-society-id"] || req.query.societyId || req.params.societyId;

    if (!requestedSocietyId) {
      return next(new AppError("No society context. Please select a society.", 400));
    }

    let membership = await membershipService.findByUserAndSociety(
      req.userId,
      requestedSocietyId
    );

    // If user is a platform Super Admin, allow them to manage ANY registered society on the platform
    const isSuperAdmin = req.accountRole === "super_admin" || (req.roles && req.roles.includes("super_admin"));
    if (!membership && isSuperAdmin) {
      const society = await Society.findById(requestedSocietyId);
      if (society && society.status !== "rejected") {
        membership = {
          _id: `super-${req.userId}-${requestedSocietyId}`,
          userId: req.userId,
          societyId: requestedSocietyId,
          role: "super_admin",
          additionalRoles: ["society_admin"],
          assignedWings: [],
          units: [],
          isActive: true,
        };
      }
    }

    if (!membership) {
      logger.debug(`Membership check failed for user ${req.userId} in society ${requestedSocietyId}`);
      return next(new AppError("You do not have access to this society", 403));
    }

    req.societyId = (membership.societyId?._id || membership.societyId || requestedSocietyId).toString();
    req.membership = membership;
    req.role = membership.role;

    if (req.asyncContext) {
      req.asyncContext.societyId = req.societyId;
      req.asyncContext.role = req.role;
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { resolveSocietyContext };
