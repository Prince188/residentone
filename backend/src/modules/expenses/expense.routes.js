const express = require("express");
const expenseController = require("./expense.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// All society members can view society expenses for transparency
router.get("/", (req, res, next) => expenseController.list(req, res, next));

// Admin/manager can create, update, delete expenses
router.post("/", (req, res, next) => expenseController.create(req, res, next));
router.patch("/:id", (req, res, next) => expenseController.update(req, res, next));
router.delete("/:id", (req, res, next) => expenseController.delete(req, res, next));

module.exports = router;
