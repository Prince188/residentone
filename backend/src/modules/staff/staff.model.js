const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const STAFF_TYPES = [
  "security_guard",
  "technician",
  "housekeeping",
  "gardener",
  "office",
  "other",
];

const staffSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    staffType: {
      type: String,
      enum: STAFF_TYPES,
      default: "security_guard",
      required: true,
    },
    gate: {
      type: String,
      trim: true,
      default: "Main Gate",
    },
    shift: {
      type: String,
      trim: true,
      default: "Day Shift (8 AM - 8 PM)",
    },
    department: {
      type: String,
      trim: true,
      default: "Security",
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
  {
    timestamps: true,
  }
);

staffSchema.plugin(tenantPlugin);

const Staff = mongoose.model("Staff", staffSchema);

module.exports = {
  Staff,
  STAFF_TYPES,
};
