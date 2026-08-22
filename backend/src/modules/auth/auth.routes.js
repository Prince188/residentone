const express = require("express");
const authController = require("./auth.controller");
const { validate } = require("../../middlewares/validate.middleware");
const { registerSchema, loginSchema, refreshSchema } = require("./auth.validation");

const router = express.Router();

router.post("/register", validate(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post("/login", validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post("/refresh", validate(refreshSchema), (req, res, next) => authController.refresh(req, res, next));

module.exports = router;
