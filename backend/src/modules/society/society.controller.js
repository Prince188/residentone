const societyService = require("./society.service");

class SocietyController {
  async getById(req, res, next) {
    try {
      const society = await societyService.findById(req.params.id);
      if (!society) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Society not found" },
        });
      }
      res.json({ success: true, data: society });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const { city, isActive } = req.query;
      const filters = {};
      if (city) filters.city = city;
      if (isActive !== undefined) filters.isActive = isActive === "true";
      const societies = await societyService.findAll(filters);
      res.json({ success: true, data: societies });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const society = await societyService.create(req.body);
      res.status(201).json({ success: true, data: society });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const society = await societyService.update(req.params.id, req.body);
      if (!society) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Society not found" },
        });
      }
      res.json({ success: true, data: society });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req, res, next) {
    try {
      const society = await societyService.deactivate(req.params.id);
      if (!society) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Society not found" },
        });
      }
      res.json({ success: true, data: society });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SocietyController();
