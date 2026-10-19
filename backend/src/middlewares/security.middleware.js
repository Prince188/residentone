const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { AppError } = require("../shared/utils/errors");

/**
 * Production-grade Sliding Window Log Store.
 * Replaces fixed-window buckets with continuous millisecond timestamp sliding windows.
 * Completely eliminates the "boundary burst" loophole where attackers send 2x requests
 * across window reset boundaries.
 */
class SlidingWindowStore {
  constructor(windowMs) {
    this.windowMs = windowMs;
    this.hits = new Map();
    // Periodic garbage collection every 60 seconds to prune expired keys from memory
    this.gcTimer = setInterval(() => this.cleanup(), 60000);
    if (this.gcTimer.unref) this.gcTimer.unref();
  }

  cleanup() {
    const cutoff = Date.now() - this.windowMs;
    for (const [key, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter((t) => t > cutoff);
      if (valid.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, valid);
      }
    }
  }

  async increment(key) {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const existing = this.hits.get(key) || [];
    const valid = existing.filter((t) => t > cutoff);
    valid.push(now);
    this.hits.set(key, valid);

    return {
      totalHits: valid.length,
      resetTime: new Date(valid[0] + this.windowMs),
    };
  }

  async decrement(key) {
    const existing = this.hits.get(key);
    if (existing && existing.length > 0) {
      existing.pop();
    }
  }

  async resetKey(key) {
    this.hits.delete(key);
  }

  async resetAll() {
    this.hits.clear();
  }
}

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
 * Compound key generator for auth endpoints:
 * Uses normalized IPv4/IPv6 IP + user identifier so shared society Wi-Fi IPs
 * are not globally blocked when a single user misbehaves.
 */
function authKeyGenerator(req) {
  const ip = ipKeyGenerator(req);
  const identifier = (req.body?.identifier || req.body?.email || req.body?.phone || "")
    .toLowerCase()
    .trim();
  return identifier ? `${ip}:${identifier}` : ip;
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * 1. Global API sliding window limiter - 600 requests per rolling 15 minutes (~40 req/min)
 * Prevents automated DDoS and high-frequency scraping.
 */
const globalApiLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  store: new SlidingWindowStore(FIFTEEN_MINUTES),
  handler: createRateLimitHandler(
    "Too many requests from this IP address. Please slow down and try again later."
  ),
  skip: (req) => req.path === "/api/v1/health" || req.method === "OPTIONS",
});

/**
 * 2. Auth sliding window limiter for /login and /register
 * Max 10 attempts per rolling 15 minutes per IP + account.
 * Prevents credential stuffing and brute-force password attacks.
 */
const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authKeyGenerator,
  store: new SlidingWindowStore(FIFTEEN_MINUTES),
  handler: createRateLimitHandler(
    "Too many login or registration attempts. Please try again after 15 minutes.",
    "AUTH_RATE_LIMIT"
  ),
});

/**
 * 3. OTP dispatch sliding window limiter for /forgot-password/send-otp
 * Max 5 OTP sends per rolling 15 minutes per IP + account.
 * Prevents SMS toll fraud and recipient mailbox/phone flooding.
 */
const otpSendLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authKeyGenerator,
  store: new SlidingWindowStore(FIFTEEN_MINUTES),
  handler: createRateLimitHandler(
    "Too many OTP requests. Please wait 15 minutes before requesting a new code.",
    "OTP_SEND_LIMIT"
  ),
});

/**
 * 4. OTP verification sliding window limiter for /forgot-password/verify-otp
 * Max 5 verification attempts per rolling 15 minutes.
 * Prevents brute-force 6-digit OTP guessing (stops account takeover).
 */
const otpVerifyLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authKeyGenerator,
  store: new SlidingWindowStore(FIFTEEN_MINUTES),
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
  SlidingWindowStore,
  globalApiLimiter,
  authLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  sanitizeMongoInput,
  preventParameterPollution,
};
