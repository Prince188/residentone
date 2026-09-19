const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const EVENT_CATEGORIES = ["festival", "celebration", "welfare", "maintenance", "other"];
const EVENT_STATUSES = ["active", "completed", "archived"];

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
      minlength: [2, "Event name must be at least 2 characters"],
      maxlength: [100, "Event name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      default: "festival",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: "active",
      index: true,
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

eventSchema.index({ societyId: 1, name: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
eventSchema.index({ societyId: 1, status: 1, createdAt: -1 });

tenantPlugin(eventSchema);

const SocietyEvent = mongoose.model("SocietyEvent", eventSchema);

module.exports = { SocietyEvent, EVENT_CATEGORIES, EVENT_STATUSES };
