const appConfigService = require("./app-config.service");

class AppConfigController {
  async getMobileConfig(req, res, next) {
    try {
      const data = await appConfigService.getMobileConfig();
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAdminConfig(req, res, next) {
    try {
      const data = await appConfigService.getFullConfig();
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLauncherIcon(req, res, next) {
    try {
      const { activeKey, enabled } = req.body;
      const data = await appConfigService.updateLauncherIcon(
        { activeKey, enabled },
        req.user?._id
      );
      res.json({
        success: true,
        message: "Launcher icon configuration updated successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AppConfigController();
