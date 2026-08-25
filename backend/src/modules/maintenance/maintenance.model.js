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
      min: [1, "Amount must be at least 1"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
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

cycleSchema.index({ societyId: 1, month: 1, year: 1 }, { unique: true });
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
      enum: ["UPI", "Cash", "Bank Transfer", "Other"],
      default: "UPI",
    },
    receiptNo: {
      type: String,
      trim: true,
    },
    recordedBy: {
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

paymentSchema.index({ cycleId: 1, unitId: 1 }, { unique: true });
paymentSchema.index({ unitId: 1 });

tenantPlugin(paymentSchema);

const MaintenanceCycle = mongoose.model("MaintenanceCycle", cycleSchema);
const MaintenancePayment = mongoose.model("MaintenancePayment", paymentSchema);

module.exports = { MaintenanceCycle, MaintenancePayment };
