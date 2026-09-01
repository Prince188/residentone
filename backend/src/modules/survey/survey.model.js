const mongoose = require("mongoose");
const { tenantPlugin } = require("../../shared/plugins/tenant.plugin");

const SURVEY_QUESTION_TYPES = ["single", "multiple", "text", "rating"];
const SURVEY_STATUSES = ["active", "closed"];

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
      minlength: [5, "Question must be at least 5 characters"],
      maxlength: [300, "Question cannot exceed 300 characters"],
    },
    type: {
      type: String,
      enum: SURVEY_QUESTION_TYPES,
      required: true,
      default: "single",
    },
    options: {
      type: [
        {
          text: {
            type: String,
            trim: true,
            minlength: [1, "Option cannot be empty"],
            maxlength: [100, "Option cannot exceed 100 characters"],
          },
        },
      ],
      default: undefined,
      validate: {
        validator: function (v) {
          if (this.type === "text" || this.type === "rating") return !v || v.length === 0;
          return Array.isArray(v) && v.length >= 2 && v.length <= 4;
        },
        message: "Choice questions need 2-4 options, text/rating need no options",
      },
    },
  },
  { _id: true }
);

const surveySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    questions: {
      type: [questionSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length >= 1 && v.length <= 10;
        },
        message: "Survey must have 1 to 10 questions",
      },
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      index: true,
    },
    status: {
      type: String,
      enum: SURVEY_STATUSES,
      default: "active",
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
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

surveySchema.index({ societyId: 1, status: 1, createdAt: -1 });
surveySchema.index({ societyId: 1, endDate: 1 });
tenantPlugin(surveySchema);

const responseSchema = new mongoose.Schema(
  {
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Survey",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      default: null,
    },
    unitLabel: {
      type: String,
      default: null,
    },
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        selectedOptions: { type: [Number], default: [] },
        textAnswer: { type: String, trim: true, maxlength: 500, default: "" },
        rating: { type: Number, min: 1, max: 5 },
        _id: false,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

responseSchema.index({ societyId: 1, surveyId: 1, unitId: 1 }, { unique: true, partialFilterExpression: { unitId: { $type: "objectId" } } });
responseSchema.index({ societyId: 1, surveyId: 1, userId: 1 }, { unique: true, partialFilterExpression: { unitId: null } });
responseSchema.index({ surveyId: 1, createdAt: 1 });
tenantPlugin(responseSchema);

const Survey = mongoose.model("Survey", surveySchema);
const SurveyResponse = mongoose.model("SurveyResponse", responseSchema);

module.exports = { Survey, SurveyResponse, SURVEY_QUESTION_TYPES, SURVEY_STATUSES };
