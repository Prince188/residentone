const express = require("express");
const userController = require("./user.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { updateProfileSchema } = require("./user.validation");

const router = express.Router();

router.get("/profile", authenticate, (req, res, next) => userController.getProfile(req, res, next));
router.patch(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  (req, res, next) => userController.updateProfile(req, res, next)
);

module.exports = router;
