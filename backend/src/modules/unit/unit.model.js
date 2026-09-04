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
    unitType: {
      type: String,
      trim: true,
      default: "2bhk",
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
    tenantId: {
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
    inviteResidentType: {
      type: String,
      enum: ["owner", "renter"],
      default: "owner",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

unitSchema.index({ label: 1 });
unitSchema.index({ societyId: 1, label: 1 }, { unique: true });
unitSchema.index(
  { inviteToken: 1 },
  {
    unique: true,
    partialFilterExpression: { inviteToken: { $type: "string" } },
  }
);

tenantPlugin(unitSchema);

const Unit = mongoose.model("Unit", unitSchema);

module.exports = { Unit };
