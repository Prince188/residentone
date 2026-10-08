const { AppConfig, ALLOWED_ICON_KEYS } = require("./app-config.model");
const { AppError } = require("../../shared/utils/errors");

class AppConfigService {
  async getOrCreateConfig() {
    let config = await AppConfig.findOne({ key: "global_app_config" });
    if (!config) {
      config = await AppConfig.create({
        key: "global_app_config",
        launcherIcon: {
          enabled: true,
          activeKey: "default",
          version: 1,
          updatedAt: new Date(),
          updatedBy: null,
        },
      });
    }
    return config;
  }

  async getMobileConfig() {
    const config = await this.getOrCreateConfig();
    return {
      launcherIcon: {
        enabled: config.launcherIcon?.enabled ?? true,
        activeKey: config.launcherIcon?.activeKey || "default",
        version: config.launcherIcon?.version || 1,
      },
    };
  }

  async getFullConfig() {
    const config = await this.getOrCreateConfig();
    const populated = await AppConfig.findById(config._id).populate(
      "launcherIcon.updatedBy",
      "name email"
    );
    return {
      launcherIcon: populated.launcherIcon,
      availableIcons: ALLOWED_ICON_KEYS,
    };
  }

  async updateLauncherIcon({ activeKey, enabled = true }, userId) {
    if (!activeKey || !ALLOWED_ICON_KEYS.includes(activeKey)) {
      throw new AppError(
        `Invalid icon key. Allowed keys: ${ALLOWED_ICON_KEYS.join(", ")}`,
        400
      );
    }

    const config = await this.getOrCreateConfig();
    const currentVersion = config.launcherIcon?.version || 1;
    const nextVersion = currentVersion + 1;

    config.launcherIcon = {
      enabled: Boolean(enabled),
      activeKey: activeKey,
      version: nextVersion,
      updatedAt: new Date(),
      updatedBy: userId || null,
    };

    await config.save();
    return this.getFullConfig();
  }
}

module.exports = new AppConfigService();
