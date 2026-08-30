const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const FAMILY_ROLES = ["spouse", "child", "parent", "sibling", "relative", "other"];

const familyMemberSchema = new mongoose.Schema(
  {
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

familyMemberSchema.index({ societyId: 1, unitId: 1 });
familyMemberSchema.index({ societyId: 1, addedBy: 1 });

tenantPlugin(familyMemberSchema);

const FamilyMember = mongoose.model("FamilyMember", familyMemberSchema);

module.exports = { FamilyMember, FAMILY_ROLES };
