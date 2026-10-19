const express = require("express");
const authController = require("./auth.controller");
const { validate } = require("../../middlewares/validate.middleware");
const { registerSchema, loginSchema, refreshSchema } = require("./auth.validation");
const {
  authLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
} = require("../../middlewares/security.middleware");

const { authenticate } = require("../../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post("/login", authLimiter, validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post("/refresh", (req, res, next) => authController.refresh(req, res, next));
router.post("/set-initial-password", authenticate, (req, res, next) => authController.setInitialPassword(req, res, next));

// Forgot Password via Mobile Number / Email OTP
router.post("/forgot-password/send-otp", otpSendLimiter, (req, res, next) => authController.sendForgotOtp(req, res, next));
router.post("/forgot-password/verify-otp", otpVerifyLimiter, (req, res, next) => authController.verifyForgotOtp(req, res, next));
router.post("/forgot-password/reset", authLimiter, (req, res, next) => authController.resetPassword(req, res, next));

// Legacy single-call forgot password (backward compatibility)
router.post("/forgot-password", authLimiter, (req, res, next) => authController.forgotPassword(req, res, next));

module.exports = router;
