const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const DOCUMENT_CATEGORIES = ["bill", "collection", "expense", "navratri", "other"];

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [1, "Title must be at least 1 character"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    category: {
      type: String,
      default: "general",
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
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
    // Optional path on disk or Cloudinary public ID
    filePath: {
      type: String,
      default: "",
    },
    publicId: {
      type: String,
      default: null,
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
