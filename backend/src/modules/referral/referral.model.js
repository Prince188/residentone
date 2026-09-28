const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
  {
    referrerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referredSociety: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
    },
    referralCodeUsed: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["REGISTERED", "PAID"],
      default: "REGISTERED",
    },
    discountAmountGiven: {
      type: Number,
      default: 0,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    giftStatus: {
      type: String,
      enum: ["NOT_ELIGIBLE", "PENDING_GIFT", "GIFT_DISPATCHED", "GIFT_DELIVERED"],
      default: "NOT_ELIGIBLE",
    },
    giftDetails: {
      type: String,
      default: "",
    },
    courierOrTrackingNotes: {
      type: String,
      default: "",
    },
    giftDispatchedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Referral = mongoose.model("Referral", referralSchema);

module.exports = { Referral };
