const { rateLimit } = require("express-rate-limit");
const { AppError } = require("../shared/utils/errors");

/**
 * Standard JSON response handler for rate limit exceeded
 */
function createRateLimitHandler(message, code = "TOO_MANY_REQUESTS") {
  return (req, res, _next, options) => {
    res.status(options.statusCode || 429).json({
      success: false,
      error: {
        code,
        message,
        retryAfterSeconds: Math.ceil(options.windowMs / 1000),
      },
    });
  };
}

/**
 * 1. Global API rate limiter - 600 requests per 15 minutes (~40 req/min)
 * Prevents automated DDoS and high-frequency scraping.
 */
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    "Too many requests from this IP address. Please slow down and try again later."
  ),
  skip: (req) => req.path === "/api/v1/health" || req.method === "OPTIONS",
});

/**
 * 2. Auth limiter for /login and /register
 * Prevents credential stuffing and brute-force password guessing.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    "Too many login or registration attempts. Please try again after 15 minutes.",
    "AUTH_RATE_LIMIT"
  ),
});

/**
 * 3. OTP dispatch limiter for /forgot-password/send-otp
 * Prevents SMS toll fraud and recipient mailbox/phone flooding.
 */
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    "Too many OTP requests. Please wait 15 minutes before requesting a new code.",
    "OTP_SEND_LIMIT"
  ),
});

/**
 * 4. OTP verification limiter for /forgot-password/verify-otp
 * Prevents brute-force 6-digit OTP guessing (stops account takeover).
 */
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(
    "Too many incorrect OTP verification attempts. Please wait 15 minutes or request a new code.",
    "OTP_VERIFY_LIMIT"
  ),
});

/**
 * 5. NoSQL Operator Sanitizer
 * Recursively removes any object keys starting with '$' or containing '.'
 * from req.body, req.query, and req.params to prevent MongoDB operator injection.
 * (e.g. rejects { "password": { "$ne": null } }).
 */
function hasMongoOperator(key) {
  return typeof key === "string" && (key.startsWith("$") || key.includes("."));
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (hasMongoOperator(key)) {
      // Drop malicious MongoDB operator key
      continue;
    }
    if (value && typeof value === "object") {
      clean[key] = sanitizeObject(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function sanitizeMongoInput(req, _res, next) {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
}

/**
 * 6. HTTP Parameter Pollution (HPP) Protection
 * Ensures sensitive query parameters (e.g. societyId, unitId) cannot be sent
 * as malicious duplicate arrays (e.g. ?societyId=1&societyId=2).
 */
function preventParameterPollution(
  sensitiveKeys = ["societyId", "unitId", "userId", "page", "limit", "status"]
) {
  return (req, _res, next) => {
    if (req.query) {
      for (const key of sensitiveKeys) {
        if (Array.isArray(req.query[key])) {
          req.query[key] = req.query[key][req.query[key].length - 1];
        }
      }
    }
    next();
  };
}

module.exports = {
  globalApiLimiter,
  authLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  sanitizeMongoInput,
  preventParameterPollution,
};
