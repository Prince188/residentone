const express = require("express");
const expenseController = require("./expense.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");

const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// All society members can view society expenses for transparency
router.get("/", (req, res, next) => expenseController.list(req, res, next));

// Admin/permission holders can create, update, delete expenses
router.post("/", requirePermission("manage_expenses"), (req, res, next) => expenseController.create(req, res, next));
router.patch("/:id", requirePermission("manage_expenses"), (req, res, next) => expenseController.update(req, res, next));
router.delete("/:id", requirePermission("manage_expenses"), (req, res, next) => expenseController.delete(req, res, next));

module.exports = router;
