const express = require("express");
const societyController = require("./society.controller");
const {
  authenticate,
  requirePlatformAdmin,
} = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const {
  publicRegistrationSchema,
  manualCreateSchema,
  updateSocietySchema,
  rejectSocietySchema,
} = require("./society.validation");

const router = express.Router();

router.post(
  "/register",
  validate(publicRegistrationSchema),
  (req, res, next) => societyController.registerPublic(req, res, next)
);

router.get("/", authenticate, requirePlatformAdmin, (req, res, next) =>
  societyController.list(req, res, next)
);
router.get("/stats", authenticate, requirePlatformAdmin, (req, res, next) =>
  societyController.stats(req, res, next)
);
router.post(
  "/",
  authenticate,
  requirePlatformAdmin,
  validate(manualCreateSchema),
  (req, res, next) => societyController.adminCreate(req, res, next)
);

router.patch(
  "/:id/approve",
  authenticate,
  requirePlatformAdmin,
  (req, res, next) => societyController.approve(req, res, next)
);
router.patch(
  "/:id/reject",
  authenticate,
  requirePlatformAdmin,
  validate(rejectSocietySchema),
  (req, res, next) => societyController.reject(req, res, next)
);
router.patch(
  "/:id/suspend",
  authenticate,
  requirePlatformAdmin,
  (req, res, next) => societyController.suspend(req, res, next)
);
router.patch(
  "/:id/activate",
  authenticate,
  requirePlatformAdmin,
  (req, res, next) => societyController.activate(req, res, next)
);

router.get("/:id", authenticate, (req, res, next) =>
  societyController.getById(req, res, next)
);
router.patch(
  "/:id",
  authenticate,
  requirePlatformAdmin,
  validate(updateSocietySchema),
  (req, res, next) => societyController.update(req, res, next)
);
router.delete("/:id", authenticate, requirePlatformAdmin, (req, res, next) =>
  societyController.deactivate(req, res, next)
);

module.exports = router;
