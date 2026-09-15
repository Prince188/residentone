const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const donationSchema = new mongoose.Schema(
  {
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be at least ₹1"],
      max: [1000000, "Amount too large"],
    },
    purpose: {
      type: String,
      required: [true, "Purpose is required"],
      trim: true,
      minlength: [3, "Purpose must be at least 3 characters"],
      maxlength: [500, "Purpose cannot exceed 500 characters"],
    },
    event: {
      type: String,
      trim: true,
      maxlength: [100, "Event cannot exceed 100 characters"],
      default: "",
    },
    collectedAt: {
      type: Date,
      required: [true, "Collected date is required"],
      index: true,
    },
    receiptNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    method: {
      type: String,
      default: "Cash",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

donationSchema.index({ societyId: 1, collectedAt: -1 });
donationSchema.index({ societyId: 1, unitId: 1 });
donationSchema.index({ societyId: 1, receiptNo: 1 }, { unique: true });
donationSchema.index({ societyId: 1, createdAt: -1 });

tenantPlugin(donationSchema);

const donationCounterSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
      index: true,
    },
    yyyymmdd: {
      type: String,
      required: true,
      index: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

donationCounterSchema.index({ societyId: 1, yyyymmdd: 1 }, { unique: true });

const Donation = mongoose.model("Donation", donationSchema);
const DonationCounter = mongoose.model("DonationCounter", donationCounterSchema);

module.exports = { Donation, DonationCounter };
