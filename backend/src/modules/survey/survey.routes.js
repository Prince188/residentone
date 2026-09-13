const express = require("express");
const surveyController = require("./survey.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createSurveySchema, submitSurveySchema } = require("./survey.validation");
const { requirePermission } = require("../../middlewares/permission.middleware");
const { AppError } = require("../../shared/utils/errors");

const requireSocietyAdmin = (req, _res, next) => {
  const role = req.membership?.role || (Array.isArray(req.role) ? req.role[0] : req.role) || req.accountRole;
  const roles = [role, ...((req.membership?.additionalRoles) || [])];
  if (!roles.includes("super_admin") && !roles.includes("society_admin")) {
    return next(new AppError("Only society admins can export survey responses", 403));
  }
  next();
};

const router = express.Router();
router.use(authenticate, resolveSocietyContext, requireSociety);

router.get("/", (req, res, next) => surveyController.list(req, res, next));
router.get("/:id", (req, res, next) => surveyController.getById(req, res, next));
router.get("/:id/export", requireSocietyAdmin, (req, res, next) => surveyController.exportExcel(req, res, next));
router.post("/:id/submit", validate(submitSurveySchema), (req, res, next) => surveyController.submit(req, res, next));

router.post("/", requirePermission("create_survey"), validate(createSurveySchema), (req, res, next) => surveyController.create(req, res, next));
router.post("/:id/close", requirePermission("create_survey"), (req, res, next) => surveyController.close(req, res, next));
router.post("/:id/reopen", requirePermission("create_survey"), (req, res, next) => surveyController.reopen(req, res, next));
router.patch("/:id", requirePermission("create_survey"), (req, res, next) => surveyController.update(req, res, next));
router.delete("/:id", requirePermission("create_survey"), (req, res, next) => surveyController.remove(req, res, next));

module.exports = router;
