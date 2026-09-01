const express = require("express");
const familyMemberController = require("./family-member.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createFamilyMemberSchema } = require("./family-member.validation");

const router = express.Router();
router.use(authenticate, resolveSocietyContext, requireSociety);

router.get("/", (req, res, next) => familyMemberController.list(req, res, next));
router.post("/", validate(createFamilyMemberSchema), (req, res, next) => familyMemberController.create(req, res, next));
router.patch("/:id", validate(updateFamilyMemberSchema), (req, res, next) => familyMemberController.update(req, res, next));
router.delete("/:id", (req, res, next) => familyMemberController.remove(req, res, next));

module.exports = router;
