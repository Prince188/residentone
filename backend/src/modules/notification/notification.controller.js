const { notificationService } = require("./notification.service");

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const { page, limit, unreadOnly, type, search } = req.query;
      const result = await notificationService.getNotifications({
        societyId: req.societyId,
        userId: req.userId,
        page,
        limit,
        unreadOnly,
        type,
        search,
      });

      res.status(200).json({
        success: true,
        data: result.notifications,
        unreadCount: result.unreadCount,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const result = await notificationService.getUnreadCount({
        societyId: req.societyId,
        userId: req.userId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const notification = await notificationService.markAsRead({
        societyId: req.societyId,
        userId: req.userId,
        notificationId: id,
      });

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead({
        societyId: req.societyId,
        userId: req.userId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      const { id } = req.params;
      const result = await notificationService.deleteNotification({
        societyId: req.societyId,
        userId: req.userId,
        notificationId: id,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async clearAllNotifications(req, res, next) {
    try {
      const { readOnly } = req.query;
      const result = await notificationService.clearAllNotifications({
        societyId: req.societyId,
        userId: req.userId,
        readOnly: readOnly === "true" || readOnly === true,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

const notificationController = new NotificationController();

module.exports = { notificationController, NotificationController };
