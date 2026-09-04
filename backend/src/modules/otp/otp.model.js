const mongoose = require("mongoose");

const OTP_CHANNELS = ["email", "sms"];
const OTP_PURPOSES = [
  "login_otp",
  "registration_otp",
  "visitor_passcode",
  "gate_entry",
  "society_verification",
  "password_reset",
  "alert",
  "general",
];
const OTP_STATUSES = ["delivered", "sent", "failed"];

const otpLogSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: OTP_CHANNELS,
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: OTP_PURPOSES,
      default: "general",
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    recipientName: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: OTP_STATUSES,
      default: "delivered",
      index: true,
    },
    societyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    provider: {
      type: String,
      default: "System Gateway",
      trim: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

otpLogSchema.index({ createdAt: -1 });
otpLogSchema.index({ channel: 1, status: 1 });
otpLogSchema.index({ purpose: 1, createdAt: -1 });

const OtpLog = mongoose.model("OtpLog", otpLogSchema);

module.exports = {
  OtpLog,
  OTP_CHANNELS,
  OTP_PURPOSES,
  OTP_STATUSES,
};
