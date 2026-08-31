const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const DOCUMENT_CATEGORIES = ["bill", "collection", "expense", "navratri", "other"];

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    category: {
      type: String,
      enum: DOCUMENT_CATEGORIES,
      default: "other",
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    // Relative path on disk for download
    filePath: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

documentSchema.index({ societyId: 1, createdAt: -1 });
documentSchema.index({ societyId: 1, category: 1 });

tenantPlugin(documentSchema);

const Document = mongoose.model("Document", documentSchema);

module.exports = { Document, DOCUMENT_CATEGORIES };
