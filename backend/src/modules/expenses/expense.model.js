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
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ societyId: 1, expenseDate: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
