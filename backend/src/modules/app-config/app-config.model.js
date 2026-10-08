const mongoose = require("mongoose");

const ALLOWED_ICON_KEYS = [
  "default",
  "diwali",
  "navratri",
  "new_year",
  "anniversary",
  "independence_day",
  "republic_day",
  "holi",
  "christmas",
];

const appConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global_app_config",
      unique: true,
      index: true,
    },
    launcherIcon: {
      enabled: {
        type: Boolean,
        default: true,
      },
      activeKey: {
        type: String,
        enum: ALLOWED_ICON_KEYS,
        default: "default",
      },
      version: {
        type: Number,
        default: 1,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  { timestamps: true }
);

const AppConfig = mongoose.model("AppConfig", appConfigSchema);

module.exports = {
  AppConfig,
  ALLOWED_ICON_KEYS,
};
