const mongoose = require("mongoose");
const { SUBSCRIPTION_PLANS, SUBSCRIPTION_BILLING } = require("../../shared/types");

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: SUBSCRIPTION_PLANS,
      required: true,
    },
    billingCycle: {
      type: String,
      enum: SUBSCRIPTION_BILLING,
      default: "monthly",
    },
    units: {
      type: Number,
      required: true,
      min: 1,
    },
    ratePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["paid", "pending", "failed", "refunded"],
      default: "paid",
      index: true,
    },
    gateway: {
      type: String,
      default: "Razorpay",
    },
    transactionId: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    periodStart: {
      type: Date,
    },
    periodEnd: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const SubscriptionPayment = mongoose.model("SubscriptionPayment", subscriptionPaymentSchema);

module.exports = { SubscriptionPayment };
