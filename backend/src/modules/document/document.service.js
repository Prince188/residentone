const path = require("path");
const fs = require("fs");
const { Document } = require("./document.model");
const { AppError } = require("../../shared/utils/errors");
const { uploadBuffer } = require("../../shared/utils/cloudinary");

class DocumentService {
  async create(societyId, userId, data = {}, file) {
    if (!file) throw new AppError("File is required (pdf or image, max 10MB)", 400);

    const title = (data.title || file.originalname || "Untitled Document").toString().trim();
    const category = data.category || "other";
    const description = (data.description || "").toString().trim();

    let fileUrl = "";
    let publicId = null;

    if (file.buffer) {
      try {
        const isPdf = file.mimetype === "application/pdf" || (file.originalname && file.originalname.toLowerCase().endsWith(".pdf"));
        const uploadResult = await uploadBuffer(file.buffer, {
          folder: "residentone/documents",
          resource_type: isPdf ? "raw" : "auto",
        });
        fileUrl = uploadResult.secure_url || uploadResult.url;
        publicId = uploadResult.public_id;
      } catch (uploadErr) {
        console.error("Cloudinary document upload failed:", uploadErr);
        throw new AppError("Failed to upload document file: " + (uploadErr.message || "Storage service unavailable"), 500);
      }
    } else if (file.path) {
      fileUrl = `/uploads/documents/${path.basename(file.path)}`;
    } else {
      throw new AppError("Invalid file upload payload", 400);
    }

    const doc = await Document.create({
      societyId,
      uploadedBy: userId,
      title,
      category,
      description,
      fileUrl,
      fileName: file.originalname || "document",
      fileType: file.mimetype || "application/octet-stream",
      fileSize: file.size || (file.buffer ? file.buffer.length : 0),
      filePath: file.path || "",
      publicId,
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

  async update(societyId, docId, data) {
    const doc = await Document.findOne({ _id: docId, societyId, isActive: true });
    if (!doc) throw new AppError("Document not found", 404);
    if (data.title !== undefined) doc.title = data.title.trim();
    if (data.category !== undefined) doc.category = data.category;
    if (data.description !== undefined) doc.description = (data.description || "").trim();
    await doc.save();
    return this.mapDocument(doc);
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
