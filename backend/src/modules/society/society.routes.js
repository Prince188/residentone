const express = require("express");
const societyController = require("./society.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createSocietySchema, updateSocietySchema } = require("./society.validation");

const router = express.Router();

router.get("/", (req, res, next) => societyController.list(req, res, next));
router.get("/:id", (req, res, next) => societyController.getById(req, res, next));
router.post("/", authenticate, validate(createSocietySchema), (req, res, next) => societyController.create(req, res, next));
router.patch("/:id", authenticate, validate(updateSocietySchema), (req, res, next) => societyController.update(req, res, next));
router.delete("/:id", authenticate, (req, res, next) => societyController.deactivate(req, res, next));

module.exports = router;
