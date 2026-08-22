const mongoose = require("mongoose");
const { SOCIETY_STATUSES, SOCIETY_TYPES } = require("../../shared/types");

const societySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Society name is required"],
      trim: true,
      maxlength: [200, "Society name cannot exceed 200 characters"],
    },
    societyType: {
      type: String,
      enum: SOCIETY_TYPES,
      default: "apartment",
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      trim: true,
    },
    totalUnits: {
      type: Number,
      min: [1, "Total units must be at least 1"],
      max: [100000, "Total units cannot exceed 100000"],
    },
    contactPersonName: {
      type: String,
      trim: true,
      maxlength: [100, "Contact person name cannot exceed 100 characters"],
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: SOCIETY_STATUSES,
      default: "pending",
      index: true,
    },
    source: {
      type: String,
      enum: ["public_registration", "manual"],
      default: "public_registration",
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
    },
    approvedAt: {
      type: Date,
    },
    societyAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

societySchema.index({ name: 1 });
societySchema.index({ city: 1 });

societySchema.pre("save", function () {
  this.isActive = this.status === "active";
});

const Society = mongoose.model("Society", societySchema);

module.exports = { Society };
