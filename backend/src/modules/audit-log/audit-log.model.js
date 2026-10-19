const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    performedByName: {
      type: String,
      default: "Admin",
      trim: true,
    },
    performedByPhone: {
      type: String,
      default: "",
    },
    performedByRole: {
      type: String,
      default: "society_admin",
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes for high-speed chronological search and filtering
auditLogSchema.index({ societyId: 1, createdAt: -1 });
auditLogSchema.index({ societyId: 1, action: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = { AuditLog };
