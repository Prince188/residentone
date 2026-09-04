const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const cycleSchema = new mongoose.Schema(
  {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Maintenance amount is required"],
      min: [0, "Amount cannot be negative"],
      default: 0,
    },
    ownerAmount: {
      type: Number,
      min: [0, "Owner amount cannot be negative"],
      default: null,
    },
    renterAmount: {
      type: Number,
      min: [0, "Renter amount cannot be negative"],
      default: null,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    durationMonths: {
      type: Number,
      default: 1,
      min: [1, "Duration must be at least 1 month"],
    },
    lateCharge: {
      type: Number,
      default: 0,
      min: [0, "Late charge cannot be negative"],
    },
    wing: {
      type: String,
      trim: true,
      default: null,
    },
    bhkRates: [
      {
        bhkType: { type: String, required: true },
        ownerAmount: { type: Number, required: true, min: 0 },
        renterAmount: { type: Number, required: true, min: 0 },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

cycleSchema.index({ societyId: 1, wing: 1, month: 1, year: 1 }, { unique: true });
cycleSchema.index({ societyId: 1, year: -1, month: -1 });

tenantPlugin(cycleSchema);

const paymentSchema = new mongoose.Schema(
  {
    cycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaintenanceCycle",
      required: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
    },
    paidOn: {
      type: Date,
      required: [true, "Paid date is required"],
    },
    method: {
      type: String,
      enum: ["UPI", "Cash", "Bank Transfer", "Other", "Razorpay"],
      default: "UPI",
    },
    receiptNo: {
      type: String,
      trim: true,
    },
    // Amount details for Razorpay flow (passed fee to resident)
    amount: {
      type: Number,
      default: null,
    },
    fee: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: null,
    },
    // Razorpay gateway fields (null for cash/manual)
    razorpayOrderId: {
      type: String,
      default: null,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    gatewayStatus: {
      type: String,
      enum: ["cash", "created", "paid", "failed"],
      default: "cash",
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    advanceMonths: {
      type: Number,
      default: 1,
      min: [1, "Advance months at least 1"],
    },
    isAdvance: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ cycleId: 1, unitId: 1 }, { unique: true });
paymentSchema.index({ unitId: 1 });

tenantPlugin(paymentSchema);

const MaintenanceCycle = mongoose.model("MaintenanceCycle", cycleSchema);
const MaintenancePayment = mongoose.model("MaintenancePayment", paymentSchema);

module.exports = { MaintenanceCycle, MaintenancePayment };
