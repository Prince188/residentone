const documentService = require("./document.service");
const path = require("path");
const fs = require("fs");

class DocumentController {
  async create(req, res, next) {
    try {
      // multer puts file in req.file, fields in req.body
      const doc = await documentService.create(req.societyId, req.userId, req.body, req.file);
      res.status(201).json({ success: true, data: documentService.mapDocument({ ...doc.toObject(), uploadedBy: { _id: req.userId, name: "You" } }) });
    } catch (error) {
      // If file was saved but DB failed, cleanup file
      if (req.file && req.file.path) {
        try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (_) {}
      }
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const docs = await documentService.list(req.societyId, req.query);
      res.json({ success: true, data: docs });
    } catch (error) {
      next(error);
    }
  }

  async download(req, res, next) {
    try {
      const doc = await documentService.getRawById(req.societyId, req.params.id);
      const filePath = doc.filePath;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "File not found on server" } });
      }
      const filename = doc.fileName || path.basename(filePath);
      res.setHeader("Content-Type", doc.fileType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/"/g, "")}"`);
      res.setHeader("Content-Length", doc.fileSize);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const doc = await documentService.update(req.societyId, req.params.id, req.body);
      res.json({ success: true, data: doc });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const doc = await documentService.remove(req.societyId, req.params.id);
      res.json({ success: true, data: { id: doc._id } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DocumentController();
