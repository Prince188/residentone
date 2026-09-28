const mongoose = require("mongoose");

const referralSettingSchema = new mongoose.Schema(
  {
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      default: "FLAT",
    },
    discountValue: {
      type: Number,
      default: 500, // Default ₹500 discount for society onboarding when referred
    },
    isReferralActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const ReferralSetting = mongoose.model("ReferralSetting", referralSettingSchema);

module.exports = { ReferralSetting };
