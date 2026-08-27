const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const amenitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Amenity name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "general",
    },
    // free or paid
    type: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },
    capacity: {
      type: Number,
      min: [1, "Capacity must be at least 1"],
      default: 1,
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
      default: 0,
    },
    // e.g., ["06:00-07:00", "07:00-08:00"] - ignored if bookingMode is full_day
    slots: {
      type: [String],
      default: ["06:00-07:00", "07:00-08:00", "08:00-09:00", "18:00-19:00", "19:00-20:00"],
    },
    // slot = hourly slots, full_day = whole day booking (e.g., Clubhouse)
    bookingMode: {
      type: String,
      enum: ["slot", "full_day"],
      default: "slot",
    },
    openTime: {
      type: String,
      default: "06:00",
    },
    closeTime: {
      type: String,
      default: "22:00",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

amenitySchema.index({ societyId: 1, name: 1 });
amenitySchema.index({ societyId: 1, isActive: 1 });

tenantPlugin(amenitySchema);

const bookingSchema = new mongoose.Schema(
  {
    amenityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Amenity",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      default: null,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    slot: {
      type: String, // e.g., "06:00-07:00" or "full_day" for whole day
      required: true,
      default: "full_day",
    },
    status: {
      type: String,
      enum: ["booked", "cancelled"],
      default: "booked",
    },
    // For paid amenities
    amount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ societyId: 1, amenityId: 1, date: 1, slot: 1 });
bookingSchema.index({ societyId: 1, userId: 1 });
bookingSchema.index({ amenityId: 1, date: 1 });

tenantPlugin(bookingSchema);

const Amenity = mongoose.model("Amenity", amenitySchema);
const Booking = mongoose.model("Booking", bookingSchema);

module.exports = { Amenity, Booking };
