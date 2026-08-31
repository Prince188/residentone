const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const COLLECTION_CATEGORIES = ["festival", "event", "celebration", "repair", "welfare", "other"];
const COLLECTION_STATUSES = ["active", "closed"];

const collectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    category: {
      type: String,
      enum: COLLECTION_CATEGORIES,
      default: "festival",
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be at least ₹1"],
      max: [1000000, "Amount too large"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      index: true,
    },
    status: {
      type: String,
      enum: COLLECTION_STATUSES,
      default: "active",
      index: true,
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

collectionSchema.index({ societyId: 1, status: 1, createdAt: -1 });
collectionSchema.index({ societyId: 1, category: 1 });
collectionSchema.index({ societyId: 1, dueDate: 1 });

tenantPlugin(collectionSchema);

const collectionPaymentSchema = new mongoose.Schema(
  {
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
      index: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    fee: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paidOn: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      default: "Cash",
    },
    receiptNo: {
      type: String,
      default: null,
    },
    gatewayStatus: {
      type: String,
      enum: ["cash", "created", "paid"],
      default: "cash",
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

collectionPaymentSchema.index({ societyId: 1, collectionId: 1, unitId: 1 }, { unique: true });
collectionPaymentSchema.index({ societyId: 1, unitId: 1 });
collectionPaymentSchema.index({ collectionId: 1, isActive: 1 });

tenantPlugin(collectionPaymentSchema);

const Collection = mongoose.model("Collection", collectionSchema);
const CollectionPayment = mongoose.model("CollectionPayment", collectionPaymentSchema);

module.exports = { Collection, CollectionPayment, COLLECTION_CATEGORIES, COLLECTION_STATUSES };
