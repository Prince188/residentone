const express = require("express");
const { protect } = require("../../middlewares/auth.middleware");
const { requireTenant } = require("../../middlewares/tenant.middleware");
const {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
} = require("./event.controller");

const router = express.Router();

router.use(protect);
router.use(requireTenant);

router.route("/")
  .get(listEvents)
  .post(createEvent);

router.route("/:id")
  .get(getEvent)
  .put(updateEvent)
  .delete(deleteEvent);

module.exports = router;
