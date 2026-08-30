const express = require("express");
const complaintController = require("./complaint.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { requirePermission } = require("../../middlewares/permission.middleware");
const {
  createComplaintSchema,
  updateStatusSchema,
  assignComplaintSchema,
} = require("./complaint.validation");

const router = express.Router();

// All complaint routes require auth + society context
router.use(authenticate, resolveSocietyContext, requireSociety);

// Stats - all members (filtered by visibility)
router.get("/stats", (req, res, next) => complaintController.stats(req, res, next));

// List & create - all society members can list/create
router.get("/", (req, res, next) => complaintController.list(req, res, next));
router.post("/", validate(createComplaintSchema), (req, res, next) => complaintController.create(req, res, next));

// Detail
router.get("/:id", (req, res, next) => complaintController.getById(req, res, next));

// Status update - admin can do any, resident can only reopen own (checked in service)
router.patch("/:id/status", validate(updateStatusSchema), (req, res, next) =>
  complaintController.updateStatus(req, res, next)
);

// Assign - permission-based: manage_complaints
router.patch(
  "/:id/assign",
  requirePermission("manage_complaints"),
  validate(assignComplaintSchema),
  (req, res, next) => complaintController.assign(req, res, next)
);

module.exports = router;
