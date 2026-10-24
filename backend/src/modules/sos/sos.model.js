const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const SOS_EMERGENCY_TYPES = ["general", "medical", "fire", "lift", "security"];
const SOS_STATUSES = ["active", "acknowledged", "resolved", "false_alarm"];

const sosIncidentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userPhone: {
      type: String,
      default: "",
      trim: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      default: null,
    },
    unitLabel: {
      type: String,
      default: "",
      trim: true,
    },
    emergencyType: {
      type: String,
      enum: SOS_EMERGENCY_TYPES,
      default: "general",
      index: true,
    },
    status: {
      type: String,
      enum: SOS_STATUSES,
      default: "active",
      index: true,
    },
    locationDescription: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    acknowledgedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String, default: "" },
      role: { type: String, default: "" },
      phone: { type: String, default: "" },
      acknowledgedAt: { type: Date },
    },
    resolvedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String, default: "" },
      role: { type: String, default: "" },
      resolvedAt: { type: Date },
      resolutionNote: { type: String, default: "" },
      isFalseAlarm: { type: Boolean, default: false },
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

sosIncidentSchema.index({ societyId: 1, status: 1, createdAt: -1 });
sosIncidentSchema.index({ societyId: 1, createdAt: -1 });
sosIncidentSchema.index({ userId: 1, status: 1 });

tenantPlugin(sosIncidentSchema);

const SOSIncident = mongoose.model("SOSIncident", sosIncidentSchema);

module.exports = {
  SOSIncident,
  SOS_EMERGENCY_TYPES,
  SOS_STATUSES,
};
