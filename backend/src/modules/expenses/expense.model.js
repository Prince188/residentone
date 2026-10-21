const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
      index: true,
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: {
      type: String,
      default: null,
      trim: true,
    },
    createdByPhone: {
      type: String,
      default: null,
      trim: true,
    },
    createdByRole: {
      type: String,
      default: null,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["utilities", "salaries", "repairs_amc", "events", "office_supplies", "others"],
      default: "others",
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    expenseDate: {
      type: Date,
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: ["cash", "bank_transfer", "cheque", "upi"],
      default: "cash",
    },
    vendorName: {
      type: String,
      trim: true,
      default: "",
    },
    billUrl: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocietyEvent",
      default: null,
      index: true,
    },
    eventTag: {
      type: String,
      trim: true,
      default: "",
    },
    event: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledByName: {
      type: String,
      default: null,
      trim: true,
    },
    cancelledByPhone: {
      type: String,
      default: null,
      trim: true,
    },
    cancelledByRole: {
      type: String,
      default: null,
      trim: true,
    },
    cancellationReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ societyId: 1, expenseDate: -1 });
expenseSchema.index({ societyId: 1, category: 1, expenseDate: -1 });
expenseSchema.index({ societyId: 1, eventId: 1, expenseDate: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
