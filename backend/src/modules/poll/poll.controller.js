const pollService = require("./poll.service");

class PollController {
  async list(req, res, next) {
    try {
      const polls = await pollService.listForSociety(req.societyId, req.userId);
      res.json({ success: true, data: polls });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const poll = await pollService.getById(req.societyId, req.params.id, req.userId);
      res.json({ success: true, data: poll });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const poll = await pollService.create(req.societyId, req.userId, req.body);
      // Return mapped version
      const populated = await poll.populate("createdBy", "name");
      const mapped = pollService.mapPoll(populated.toObject ? populated.toObject() : populated, null);
      res.status(201).json({ success: true, data: mapped });
    } catch (error) {
      next(error);
    }
  }

  async vote(req, res, next) {
    try {
      const { selectedOptionIndex } = req.body;
      // Handle both number and string from JSON
      const idx = typeof selectedOptionIndex === "string" ? Number(selectedOptionIndex) : selectedOptionIndex;
      await pollService.vote(req.societyId, req.params.id, req.userId, idx);
      const poll = await pollService.getById(req.societyId, req.params.id, req.userId);
      res.json({ success: true, data: poll });
    } catch (error) {
      next(error);
    }
  }

  async close(req, res, next) {
    try {
      await pollService.closePoll(req.societyId, req.params.id);
      const poll = await pollService.getById(req.societyId, req.params.id, req.userId);
      res.json({ success: true, data: poll });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await pollService.deletePoll(req.societyId, req.params.id);
      res.json({ success: true, data: { message: "Poll deleted" } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PollController();
