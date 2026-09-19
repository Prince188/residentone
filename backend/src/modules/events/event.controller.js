const eventService = require("./event.service");

class EventController {
  async createEvent(req, res, next) {
    try {
      const societyId = req.societyId;
      const userId = req.userId || req.user?.id || req.user?._id;
      const event = await eventService.createEvent(societyId, userId, req.body);
      res.status(201).json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  }

  async listEvents(req, res, next) {
    try {
      const societyId = req.societyId;
      const { status } = req.query;
      const events = await eventService.listEvents(societyId, status);
      res.status(200).json({ success: true, data: events });
    } catch (error) {
      next(error);
    }
  }

  async getEvent(req, res, next) {
    try {
      const societyId = req.societyId;
      const { id } = req.params;
      const event = await eventService.getEventById(societyId, id);
      res.status(200).json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req, res, next) {
    try {
      const societyId = req.societyId;
      const { id } = req.params;
      const event = await eventService.updateEvent(societyId, id, req.body);
      res.status(200).json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req, res, next) {
    try {
      const societyId = req.societyId;
      const { id } = req.params;
      await eventService.deleteEvent(societyId, id);
      res.status(200).json({ success: true, message: "Event deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

const eventController = new EventController();

module.exports = {
  createEvent: (req, res, next) => eventController.createEvent(req, res, next),
  listEvents: (req, res, next) => eventController.listEvents(req, res, next),
  getEvent: (req, res, next) => eventController.getEvent(req, res, next),
  updateEvent: (req, res, next) => eventController.updateEvent(req, res, next),
  deleteEvent: (req, res, next) => eventController.deleteEvent(req, res, next),
};
