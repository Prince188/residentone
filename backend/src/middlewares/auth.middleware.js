const jwt = require("jsonwebtoken");
const { config } = require("../config");
const { AppError } = require("../shared/utils/errors");
const { createContext } = require("../shared/async-context");
const logger = require("../config/logger");

function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("No token provided", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    req.userId = decoded.userId;
    req.societyId = decoded.societyId;
    req.roles = Array.isArray(decoded.role)
      ? decoded.role
      : decoded.role
        ? [decoded.role]
        : [];
    req.role = req.roles;
    req.accountRole = req.roles.includes("super_admin") ? "super_admin" : null;

    const store = createContext({
      userId: decoded.userId,
      societyId: decoded.societyId,
      role: decoded.role,
    });
    req.asyncContext = store;

    next();
  } catch (error) {
    logger.debug("Invalid or expired token");
    next(new AppError("Invalid or expired token", 401));
  }
}

function requireSociety(req, _res, next) {
  if (!req.societyId) {
    return next(new AppError("No society context. Please select a society.", 400));
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    const roles = Array.isArray(req.role) ? req.role : req.role ? [req.role] : [];
    if (!roles.some((r) => allowedRoles.includes(r))) {
      return next(new AppError("Insufficient permissions", 403));
    }
    next();
  };
}

function requirePlatformAdmin(req, _res, next) {
  if (req.accountRole !== "super_admin") {
    return next(new AppError("Super Admin access required", 403));
  }
  next();
}

module.exports = { authenticate, requireSociety, requireRole, requirePlatformAdmin };
