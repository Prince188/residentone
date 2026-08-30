const express = require("express");
const amenityController = require("./amenity.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createAmenitySchema, updateAmenitySchema, bookAmenitySchema } = require("./amenity.validation");
const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// Member: list & view (all can see for booking)
router.get("/", (req, res, next) => amenityController.list(req, res, next));
router.get("/bookings/my", (req, res, next) => amenityController.myBookings(req, res, next));
router.get("/bookings/all", requirePermission("manage_amenities"), (req, res, next) => amenityController.allBookings(req, res, next));
router.get("/:id", (req, res, next) => amenityController.getById(req, res, next));
router.get("/:id/slots", (req, res, next) => amenityController.slots(req, res, next));

// Booking (all members)
router.post("/:id/book", validate(bookAmenitySchema), (req, res, next) => amenityController.book(req, res, next));
router.post("/bookings/:bookingId/cancel", (req, res, next) => amenityController.cancel(req, res, next));

// Permission-based: manage_amenities (0% difference via Manage Permissions)
router.post("/", requirePermission("manage_amenities"), validate(createAmenitySchema), (req, res, next) => amenityController.create(req, res, next));
router.patch("/:id", requirePermission("manage_amenities"), validate(updateAmenitySchema), (req, res, next) => amenityController.update(req, res, next));
router.delete("/:id", requirePermission("manage_amenities"), (req, res, next) => amenityController.remove(req, res, next));

module.exports = router;
