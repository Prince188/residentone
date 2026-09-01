const collectionService = require("./collection.service");

class CollectionController {
  async create(req, res, next) {
    try {
      const collection = await collectionService.create(req.societyId, req.userId, req.body);
      res.status(201).json({ success: true, data: collectionService.mapCollection({ ...collection.toObject(), createdBy: { name: "You" } }) });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const collections = await collectionService.list(req.societyId);
      // If query ?my=1, return with myUnits status (for resident)
      if (req.query.my === "1" || req.query.my === "true") {
        const my = await collectionService.getMyCollections(req.societyId, req.membership, collections.map(c => ({ _id: c.id, ...c })));
        // But list already mapped, we need raw; instead fetch raw and map with my
        // For now, if my requested, recompute using raw fetched inside service
        const rawList = await require("./collection.model").Collection.find({ societyId: req.societyId, isActive: true }).sort({ createdAt: -1 }).lean();
        const mappedMy = await collectionService.getMyCollections(req.societyId, req.membership, rawList);
        return res.json({ success: true, data: mappedMy });
      }
      res.json({ success: true, data: collections });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await collectionService.getById(req.societyId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getUnits(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.id);
      const units = await collectionService.getCollectionUnits(req.societyId, collection);
      res.json({ success: true, data: units });
    } catch (error) {
      next(error);
    }
  }

  async getUnitDetail(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.collectionId);
      const detail = await collectionService.getUnitDetail(req.societyId, collection, req.params.unitId, req.membership);
      res.json({ success: true, data: detail });
    } catch (error) {
      next(error);
    }
  }

  async recordPayment(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.collectionId);
      const payment = await collectionService.recordPayment(req.societyId, collection, req.params.unitId, req.userId, req.body);
      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  async removePayment(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.collectionId);
      const result = await collectionService.removePayment(req.societyId, collection, req.params.unitId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createOrder(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.collectionId);
      const order = await collectionService.createRazorpayOrder(req.societyId, collection, req.params.unitId, req.userId);
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  async verifyPayment(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.collectionId);
      const payment = await collectionService.verifyRazorpayPayment(req.societyId, collection, req.params.unitId, req.userId, req.body);
      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = await collectionService.update(req.societyId, req.params.id, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async close(req, res, next) {
    try {
      const col = await collectionService.closeCollection(req.societyId, req.params.id);
      res.json({ success: true, data: collectionService.mapCollection({ ...col.toObject(), createdBy: col.createdBy }) });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const col = await collectionService.deleteCollection(req.societyId, req.params.id);
      res.json({ success: true, data: { id: col._id } });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.id);
      const buffer = await collectionService.generateExcelBuffer(req.societyId, collection);

      const safeTitle = (collection.title || "collection")
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .slice(0, 60) || "collection";
      const filename = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CollectionController();
