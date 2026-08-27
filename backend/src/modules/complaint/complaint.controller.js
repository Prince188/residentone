const complaintService = require("./complaint.service");

class ComplaintController {
  async create(req, res, next) {
    try {
      const complaint = await complaintService.create(req.societyId, req.userId, req.body);
      res.status(201).json({ success: true, data: complaintService.mapComplaint(complaint) });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        category: req.query.category,
        priority: req.query.priority,
        q: req.query.q,
        isPublic: req.query.isPublic,
      };
      // Normalize isPublic string to boolean if present
      if (filters.isPublic === "true") filters.isPublic = true;
      else if (filters.isPublic === "false") filters.isPublic = false;
      else if (filters.isPublic === undefined) delete filters.isPublic;

      if (filters.isPublic === "" || filters.isPublic === undefined) delete filters.isPublic;

      const complaints = await complaintService.list(req.societyId, req.userId, req.role, filters);
      res.json({ success: true, data: complaints });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const complaint = await complaintService.getById(req.societyId, req.params.id, req.userId, req.role);
      res.json({ success: true, data: complaint });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const updated = await complaintService.updateStatus(
        req.societyId,
        req.params.id,
        req.userId,
        req.role,
        req.body.status
      );
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async assign(req, res, next) {
    try {
      const assignedTo = req.body.assignedTo || null;
      const updated = await complaintService.assign(req.societyId, req.params.id, assignedTo);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async stats(req, res, next) {
    try {
      const stats = await complaintService.getStats(req.societyId, req.userId, req.role);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ComplaintController();
