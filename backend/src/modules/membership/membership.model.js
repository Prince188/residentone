const mongoose = require("mongoose");
const { SOCIETY_ROLES } = require("../../shared/types");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
    },
    role: {
      type: String,
      enum: SOCIETY_ROLES,
      required: true,
    },
    units: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Unit",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, societyId: 1 }, { unique: true });
membershipSchema.index({ societyId: 1 });
membershipSchema.index({ userId: 1 });

tenantPlugin(membershipSchema);

const Membership = mongoose.model("Membership", membershipSchema);

module.exports = { Membership };
