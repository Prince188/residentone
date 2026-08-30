const mongoose = require("mongoose");

const badgeSeenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      default: null,
      index: true,
    },
    feature: {
      type: String,
      required: true,
      index: true,
    },
    lastSeenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

badgeSeenSchema.index({ userId: 1, societyId: 1, feature: 1 }, { unique: true });
badgeSeenSchema.index({ userId: 1, societyId: 1 });

const BadgeSeen = mongoose.model("BadgeSeen", badgeSeenSchema);

module.exports = { BadgeSeen };
