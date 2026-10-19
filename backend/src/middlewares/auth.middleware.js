const jwt = require("jsonwebtoken");
const { config } = require("../config");
const { AppError } = require("../shared/utils/errors");
const { createContext } = require("../shared/async-context");
const logger = require("../config/logger");
const { User } = require("../modules/user/user.model");

// In-memory cache for user security validation (10 seconds TTL per user)
// Avoids database round-trips on rapid consecutive API calls while ensuring fast revocation
const userSecurityCache = new Map();
const CACHE_TTL_MS = 10 * 1000;

function invalidateUserSecurityCache(userId) {
  if (userId) {
    userSecurityCache.delete(String(userId));
  }
}

// Background cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of userSecurityCache.entries()) {
    if (now - val.timestamp > CACHE_TTL_MS * 2) {
      userSecurityCache.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

async function getUserSecurityData(userId) {
  const key = String(userId);
  const cached = userSecurityCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  const user = await User.findById(userId).select("isActive tokenVersion").lean();
  if (user) {
    userSecurityCache.set(key, { data: user, timestamp: Date.now() });
  }
  return user;
}

async function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("No token provided", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Verify user status and tokenVersion against database / cache
    const user = await getUserSecurityData(decoded.userId);
    if (!user) {
      return next(new AppError("User account no longer exists", 401));
    }
    if (!user.isActive) {
      return next(new AppError("Account is inactive or disabled", 403));
    }

    // Instant Token Revocation Check:
    // If the token has a tokenVersion and it doesn't match user.tokenVersion, session was revoked!
    // Backward compatibility: If decoded.tokenVersion is undefined (legacy active session), allow through.
    const userTokenVersion = typeof user.tokenVersion === "number" ? user.tokenVersion : 0;
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== userTokenVersion) {
      return next(new AppError("Session has expired or was revoked. Please log in again.", 401));
    }

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
    if (error instanceof AppError) {
      return next(error);
    }
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

module.exports = {
  authenticate,
  requireSociety,
  requireRole,
  requirePlatformAdmin,
  invalidateUserSecurityCache,
};
