const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ACCOUNT_ROLES, DEFAULT_ACCOUNT_ROLE } = require("../../shared/types");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: [100, "Occupation cannot exceed 100 characters"],
      default: "",
    },
    familyMembers: {
      type: Number,
      min: [0, "Family members cannot be negative"],
      max: [50, "Family members cannot exceed 50"],
      default: null,
    },
    vehicles: {
      type: [String],
      default: [],
    },
    role: {
      type: [String],
      enum: ACCOUNT_ROLES,
      default: [DEFAULT_ACCOUNT_ROLE],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model("User", userSchema);

module.exports = { User };
