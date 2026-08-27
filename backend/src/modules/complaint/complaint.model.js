const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const COMPLAINT_CATEGORIES = [
  "plumbing",
  "electrical",
  "housekeeping",
  "security",
  "common_area",
  "parking",
  "other",
];

const COMPLAINT_PRIORITIES = ["low", "medium", "high", "urgent"];

const COMPLAINT_STATUSES = [
  "open",
  "in_progress",
  "on_hold",
  "resolved",
  "closed",
  "reopened",
];

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    category: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
      default: "other",
      index: true,
    },
    priority: {
      type: String,
      enum: COMPLAINT_PRIORITIES,
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: "open",
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

complaintSchema.index({ societyId: 1, status: 1 });
complaintSchema.index({ societyId: 1, category: 1 });
complaintSchema.index({ societyId: 1, createdAt: -1 });
complaintSchema.index({ societyId: 1, raisedBy: 1 });
complaintSchema.index({ societyId: 1, isPublic: 1 });

tenantPlugin(complaintSchema);

const Complaint = mongoose.model("Complaint", complaintSchema);

module.exports = { Complaint, COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES, COMPLAINT_STATUSES };
