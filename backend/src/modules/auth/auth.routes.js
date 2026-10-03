const express = require("express");
const authController = require("./auth.controller");
const { validate } = require("../../middlewares/validate.middleware");
const { registerSchema, loginSchema, refreshSchema } = require("./auth.validation");

const router = express.Router();

router.post("/register", validate(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post("/login", validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post("/refresh", validate(refreshSchema), (req, res, next) => authController.refresh(req, res, next));

// Forgot Password via Mobile Number / Email OTP
router.post("/forgot-password/send-otp", (req, res, next) => authController.sendForgotOtp(req, res, next));
router.post("/forgot-password/verify-otp", (req, res, next) => authController.verifyForgotOtp(req, res, next));
router.post("/forgot-password/reset", (req, res, next) => authController.resetPassword(req, res, next));

// Legacy single-call forgot password (backward compatibility)
router.post("/forgot-password", (req, res, next) => authController.forgotPassword(req, res, next));

module.exports = router;
