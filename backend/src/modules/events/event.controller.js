const eventService = require("./event.service");
const catchAsync = require("../../shared/utils/catchAsync");

const createEvent = catchAsync(async (req, res) => {
  const societyId = req.societyId;
  const userId = req.user.id || req.user._id;
  const event = await eventService.createEvent(societyId, userId, req.body);
  res.status(201).json({ status: "success", data: event });
});

const listEvents = catchAsync(async (req, res) => {
  const societyId = req.societyId;
  const { status } = req.query;
  const events = await eventService.listEvents(societyId, status);
  res.status(200).json({ status: "success", data: events });
});

const getEvent = catchAsync(async (req, res) => {
  const societyId = req.societyId;
  const { id } = req.params;
  const event = await eventService.getEventById(societyId, id);
  res.status(200).json({ status: "success", data: event });
});

const updateEvent = catchAsync(async (req, res) => {
  const societyId = req.societyId;
  const { id } = req.params;
  const event = await eventService.updateEvent(societyId, id, req.body);
  res.status(200).json({ status: "success", data: event });
});

const deleteEvent = catchAsync(async (req, res) => {
  const societyId = req.societyId;
  const { id } = req.params;
  await eventService.deleteEvent(societyId, id);
  res.status(200).json({ status: "success", message: "Event deleted successfully" });
});

module.exports = {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
};
