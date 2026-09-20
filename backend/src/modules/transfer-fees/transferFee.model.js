const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const transferFeeSchema = new mongoose.Schema(
  {
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
      index: true,
    },
    payerName: {
      type: String,
      required: [true, "Payer Name is required"],
      trim: true,
    },
    payerPhone: {
      type: String,
      trim: true,
      default: "",
    },
    payerRole: {
      type: String,
      enum: ["owner", "tenant"],
      default: "owner",
    },
    feeType: {
      type: String,
      enum: ["ownership_transfer", "tenant_move_in", "noc_fee", "parking_transfer", "other"],
      default: "ownership_transfer",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be at least ₹1"],
      max: [5000000, "Amount too large"],
    },
    collectedAt: {
      type: Date,
      required: [true, "Collected date is required"],
      default: Date.now,
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
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocietyEvent",
      default: null,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

transferFeeSchema.index({ societyId: 1, collectedAt: -1 });
transferFeeSchema.index({ societyId: 1, unitId: 1 });
transferFeeSchema.index({ societyId: 1, receiptNo: 1 }, { unique: true });
transferFeeSchema.index({ societyId: 1, createdAt: -1 });

tenantPlugin(transferFeeSchema);

const transferFeeCounterSchema = new mongoose.Schema(
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

transferFeeCounterSchema.index({ societyId: 1, yyyymmdd: 1 }, { unique: true });

const TransferFee = mongoose.model("TransferFee", transferFeeSchema);
const TransferFeeCounter = mongoose.model("TransferFeeCounter", transferFeeCounterSchema);

module.exports = { TransferFee, TransferFeeCounter };
