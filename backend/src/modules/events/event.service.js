const { SocietyEvent } = require("./event.model");
const { AppError } = require("../../shared/utils/errors");

class EventService {
  async createEvent(societyId, userId, data) {
    if (!data.name || !data.name.trim()) {
      throw new AppError("Event name is required", 400);
    }
    const name = data.name.trim();

    // Check duplicate active event in same society
    const existing = await SocietyEvent.findOne({
      societyId,
      name: new RegExp(`^${name}$`, "i"),
      isActive: true,
    });
    if (existing) {
      return existing; // Reuse existing event tag if already present
    }

    const event = await SocietyEvent.create({
      societyId,
      createdBy: userId,
      name,
      description: data.description ? data.description.trim() : "",
      category: data.category || "festival",
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      status: data.status || "active",
      isActive: true,
    });

    return event;
  }

  async listEvents(societyId, status = undefined) {
    const query = { societyId, isActive: true };
    if (status) {
      query.status = status;
    }
    return SocietyEvent.find(query).sort({ createdAt: -1 }).lean();
  }

  async getEventById(societyId, eventId) {
    const event = await SocietyEvent.findOne({ _id: eventId, societyId, isActive: true }).lean();
    if (!event) {
      throw new AppError("Event tag not found", 404);
    }
    return event;
  }

  async updateEvent(societyId, eventId, data) {
    const event = await SocietyEvent.findOneAndUpdate(
      { _id: eventId, societyId, isActive: true },
      {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description.trim() }),
        ...(data.category && { category: data.category }),
        ...(data.status && { status: data.status }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
      },
      { new: true }
    ).lean();

    if (!event) {
      throw new AppError("Event tag not found", 404);
    }
    return event;
  }

  async deleteEvent(societyId, eventId) {
    const event = await SocietyEvent.findOneAndUpdate(
      { _id: eventId, societyId, isActive: true },
      { isActive: false },
      { new: true }
    ).lean();

    if (!event) {
      throw new AppError("Event tag not found", 404);
    }
    return event;
  }
}

module.exports = new EventService();
