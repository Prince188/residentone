const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notice title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    body: {
      type: String,
      required: [true, "Notice body is required"],
      trim: true,
      maxlength: [2000, "Body cannot exceed 2000 characters"],
    },
    createdBy: {
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

noticeSchema.index({ societyId: 1, createdAt: -1 });

tenantPlugin(noticeSchema);

const Notice = mongoose.model("Notice", noticeSchema);

module.exports = { Notice };
