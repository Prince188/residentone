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
    req.role = decoded.role;

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
    if (!req.role || !allowedRoles.includes(req.role)) {
      return next(new AppError("Insufficient permissions", 403));
    }
    next();
  };
}

module.exports = { authenticate, requireSociety, requireRole };
