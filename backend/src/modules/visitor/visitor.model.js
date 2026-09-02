const mongoose = require("mongoose");

const VISITOR_TYPES = ["guest", "delivery", "cab", "service", "other"];
const VISITOR_STATUSES = [
  "pending_approval",
  "approved",
  "rejected",
  "inside",
  "checked_out",
  "expired",
  "left_at_gate",
];

const visitorSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
      index: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
      index: true,
    },
    hostUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Visitor name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    visitorType: {
      type: String,
      enum: VISITOR_TYPES,
      default: "guest",
      index: true,
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    passcode: {
      type: String,
      trim: true,
      index: true,
    },
    passType: {
      type: String,
      enum: ["pre_approved", "walk_in"],
      default: "pre_approved",
    },
    status: {
      type: String,
      enum: VISITOR_STATUSES,
      default: "approved",
      index: true,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
      default: null,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
    parcelDetails: {
      isParcel: { type: Boolean, default: false },
      parcelCode: { type: String, default: "" },
      collectedAt: { type: Date, default: null },
      collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
  },
  { timestamps: true }
);

visitorSchema.index({ societyId: 1, status: 1, createdAt: -1 });
visitorSchema.index({ societyId: 1, passcode: 1 });
visitorSchema.index({ unitId: 1, createdAt: -1 });
visitorSchema.index({ hostUserId: 1, createdAt: -1 });

const Visitor = mongoose.model("Visitor", visitorSchema);

module.exports = {
  Visitor,
  VISITOR_TYPES,
  VISITOR_STATUSES,
};
