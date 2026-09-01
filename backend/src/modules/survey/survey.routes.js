const express = require("express");
const surveyController = require("./survey.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createSurveySchema, submitSurveySchema } = require("./survey.validation");
const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router();
router.use(authenticate, resolveSocietyContext, requireSociety);

router.get("/", (req, res, next) => surveyController.list(req, res, next));
router.get("/:id", (req, res, next) => surveyController.getById(req, res, next));
router.post("/:id/submit", validate(submitSurveySchema), (req, res, next) => surveyController.submit(req, res, next));

router.post("/", requirePermission("create_survey"), validate(createSurveySchema), (req, res, next) => surveyController.create(req, res, next));
router.post("/:id/close", requirePermission("create_survey"), (req, res, next) => surveyController.close(req, res, next));
router.patch("/:id", requirePermission("create_survey"), (req, res, next) => surveyController.update(req, res, next));
router.delete("/:id", requirePermission("create_survey"), (req, res, next) => surveyController.remove(req, res, next));

module.exports = router;
