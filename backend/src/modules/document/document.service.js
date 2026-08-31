const path = require("path");
const fs = require("fs");
const { Document } = require("./document.model");
const { AppError } = require("../../shared/utils/errors");

class DocumentService {
  async create(societyId, userId, data, file) {
    if (!file) throw new AppError("File is required (pdf or image, max 10MB)", 400);

    // file already saved by multer to disk
    const doc = await Document.create({
      societyId,
      uploadedBy: userId,
      title: data.title.trim(),
      category: data.category || "other",
      description: (data.description || "").trim(),
      fileUrl: `/uploads/documents/${path.basename(file.path)}`,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      filePath: file.path,
      isActive: true,
    });
    return doc;
  }

  async list(societyId, query = {}) {
    const filter = { societyId, isActive: true };
    if (query.category && query.category !== "all") filter.category = query.category;
    if (query.search) {
      filter.title = { $regex: query.search, $options: "i" };
    }
    const docs = await Document.find(filter)
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => this.mapDocument(d));
  }

  async getById(societyId, docId) {
    const doc = await Document.findOne({ _id: docId, societyId, isActive: true }).populate("uploadedBy", "name").lean();
    if (!doc) throw new AppError("Document not found", 404);
    return this.mapDocument(doc);
  }

  async getRawById(societyId, docId) {
    const doc = await Document.findOne({ _id: docId, societyId, isActive: true });
    if (!doc) throw new AppError("Document not found", 404);
    return doc;
  }

  mapDocument(d) {
    return {
      id: d._id,
      title: d.title,
      category: d.category,
      description: d.description,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      fileType: d.fileType,
      fileSize: d.fileSize,
      uploadedBy: d.uploadedBy?._id || d.uploadedBy,
      uploadedByName: d.uploadedBy?.name || "Admin",
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  async remove(societyId, docId) {
    const doc = await Document.findOne({ _id: docId, societyId, isActive: true });
    if (!doc) throw new AppError("Document not found", 404);
    // Try to delete file from disk (non-critical if fails)
    try {
      if (doc.filePath && fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    } catch (e) {
      console.error("Failed to delete file", e.message);
    }
    doc.isActive = false;
    await doc.save();
    return doc;
  }
}

module.exports = new DocumentService();
