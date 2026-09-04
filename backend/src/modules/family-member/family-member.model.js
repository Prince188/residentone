const mongoose = require("mongoose");

const FAMILY_ROLES = ["spouse", "child", "parent", "sibling", "relative", "other"];

const familyMemberSchema = new mongoose.Schema(
  {
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      default: null,
      index: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      required: false,
      default: null,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    relation: {
      type: String,
      enum: FAMILY_ROLES,
      default: "other",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: [100, "Occupation cannot exceed 100 characters"],
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

familyMemberSchema.index({ addedBy: 1, isActive: 1 });
familyMemberSchema.index({ societyId: 1, unitId: 1 });
familyMemberSchema.index({ societyId: 1, addedBy: 1 });

const FamilyMember = mongoose.model("FamilyMember", familyMemberSchema);

module.exports = { FamilyMember, FAMILY_ROLES };
