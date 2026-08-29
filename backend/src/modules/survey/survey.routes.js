const express = require("express");
const surveyController = require("./survey.controller");
const { authenticate, requireRole, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createSurveySchema, submitSurveySchema } = require("./survey.validation");

const router = express.Router();
router.use(authenticate, resolveSocietyContext, requireSociety);

router.get("/", (req, res, next) => surveyController.list(req, res, next));
router.get("/:id", (req, res, next) => surveyController.getById(req, res, next));
router.post("/:id/submit", validate(submitSurveySchema), (req, res, next) => surveyController.submit(req, res, next));

router.post("/", requireRole("super_admin", "society_admin", "committee_member", "manager"), validate(createSurveySchema), (req, res, next) => surveyController.create(req, res, next));
router.post("/:id/close", requireRole("super_admin", "society_admin", "committee_member", "manager"), (req, res, next) => surveyController.close(req, res, next));
router.delete("/:id", requireRole("super_admin", "society_admin"), (req, res, next) => surveyController.remove(req, res, next));

module.exports = router;
