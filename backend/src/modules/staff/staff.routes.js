const express = require("express");
const staffController = require("./staff.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

router.get("/lookup-user", (req, res, next) => staffController.lookupUser(req, res, next));
router.get("/", (req, res, next) => staffController.list(req, res, next));
router.post(
  "/",
  requirePermission("manage_staff"),
  (req, res, next) => staffController.add(req, res, next)
);
router.patch(
  "/:id",
  requirePermission("manage_staff"),
  (req, res, next) => staffController.update(req, res, next)
);
router.delete(
  "/:id",
  requirePermission("manage_staff"),
  (req, res, next) => staffController.remove(req, res, next)
);

module.exports = router;
