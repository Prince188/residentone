const express = require("express");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
} = require("./event.controller");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

router.route("/")
  .get(listEvents)
  .post(createEvent);

router.route("/:id")
  .get(getEvent)
  .put(updateEvent)
  .delete(deleteEvent);

module.exports = router;
