const mongoose = require("mongoose");
const { PROPERTY_TYPES } = require("../../shared/types");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const unitSchema = new mongoose.Schema(
  {
    propertyType: {
      type: String,
      enum: PROPERTY_TYPES,
      required: true,
    },
    label: {
      type: String,
      required: [true, "Unit label is required"],
      trim: true,
      maxlength: [100, "Unit label cannot exceed 100 characters"],
    },
    block: {
      type: String,
      trim: true,
    },
    floor: {
      type: String,
      trim: true,
    },
    doorNo: {
      type: String,
      required: [true, "Door number is required"],
      trim: true,
    },
    unitNumber: {
      type: Number,
      default: null,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    inviteToken: {
      type: String,
      default: null,
    },
    inviteExpiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

unitSchema.index({ label: 1 });
unitSchema.index({ inviteToken: 1 }, { unique: true, sparse: true });

tenantPlugin(unitSchema);

const Unit = mongoose.model("Unit", unitSchema);

module.exports = { Unit };
