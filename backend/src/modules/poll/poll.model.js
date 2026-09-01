const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const POLL_TYPES = ["open", "secret"];
const POLL_STATUSES = ["active", "closed"];

const pollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Question is required"],
      trim: true,
      minlength: [5, "Question must be at least 5 characters"],
      maxlength: [500, "Question cannot exceed 500 characters"],
    },
    options: {
      type: [
        {
          text: {
            type: String,
            required: [true, "Option text is required"],
            trim: true,
            minlength: [1, "Option cannot be empty"],
            maxlength: [200, "Option cannot exceed 200 characters"],
          },
          votes: {
            type: Number,
            default: 0,
            min: 0,
          },
        },
      ],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length >= 2 && v.length <= 4;
        },
        message: "Poll must have 2 to 4 options",
      },
    },
    type: {
      type: String,
      enum: POLL_TYPES,
      default: "open",
      index: true,
    },
    status: {
      type: String,
      enum: POLL_STATUSES,
      default: "active",
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      index: true,
    },
    scope: {
      type: String,
      enum: ["society", "wing"],
      default: "society",
      index: true,
    },
    wing: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

pollSchema.index({ societyId: 1, status: 1, createdAt: -1 });
pollSchema.index({ societyId: 1, endDate: 1 });
pollSchema.index({ societyId: 1, isActive: 1 });

tenantPlugin(pollSchema);

// Helper to auto-close on read if endDate passed
pollSchema.methods.isExpired = function () {
  return this.endDate && new Date() > this.endDate;
};

const pollVoteSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll",
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
      index: true,
    },
    unitLabel: {
      type: String,
      default: null,
    },
    selectedOptionIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// One vote per flat (unit) per poll - MyGate style. Fallback unique per user if no unit.
pollVoteSchema.index({ societyId: 1, pollId: 1, unitId: 1 }, { unique: true, partialFilterExpression: { unitId: { $type: "objectId" } } });
pollVoteSchema.index({ societyId: 1, pollId: 1, userId: 1 }, { unique: true, partialFilterExpression: { unitId: null } });
pollVoteSchema.index({ societyId: 1, pollId: 1 });
pollVoteSchema.index({ pollId: 1, userId: 1 });

tenantPlugin(pollVoteSchema);

const Poll = mongoose.model("Poll", pollSchema);
const PollVote = mongoose.model("PollVote", pollVoteSchema);

module.exports = { Poll, PollVote, POLL_TYPES, POLL_STATUSES };
