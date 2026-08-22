const { AppError } = require("../shared/utils/errors");
const membershipService = require("../modules/membership/membership.service");
const logger = require("../config/logger");

async function resolveSocietyContext(req, _res, next) {
  try {
    const requestedSocietyId =
      req.headers["x-society-id"] || req.query.societyId || req.params.societyId;

    if (!requestedSocietyId) {
      return next(new AppError("No society context. Please select a society.", 400));
    }

    const membership = await membershipService.findByUserAndSociety(
      req.userId,
      requestedSocietyId
    );

    if (!membership) {
      logger.debug(`Membership check failed for user ${req.userId} in society ${requestedSocietyId}`);
      return next(new AppError("You do not have access to this society", 403));
    }

    req.societyId = membership.societyId.toString();
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
