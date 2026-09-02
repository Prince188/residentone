const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const NOTIFICATION_TYPES = [
  "notice",
  "maintenance",
  "collection",
  "complaint",
  "amenity",
  "poll",
  "survey",
  "visitor",
  "chat",
  "system",
  "emergency",
];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "system",
      index: true,
    },
    link: {
      type: String,
      trim: true,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, societyId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ societyId: 1, createdAt: -1 });

notificationSchema.plugin(tenantPlugin);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = { Notification, NOTIFICATION_TYPES };
