const express = require("express");
const { authenticate } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { notificationController } = require("./notification.controller");

const router = express.Router();

router.use(authenticate);
router.use(resolveSocietyContext);

router.get(
  "/",
  notificationController.getNotifications.bind(notificationController)
);

router.get(
  "/unread-count",
  notificationController.getUnreadCount.bind(notificationController)
);

router.patch(
  "/read-all",
  notificationController.markAllAsRead.bind(notificationController)
);

router.patch(
  "/:id/read",
  notificationController.markAsRead.bind(notificationController)
);

router.delete(
  "/clear-all",
  notificationController.clearAllNotifications.bind(notificationController)
);

router.delete(
  "/:id",
  notificationController.deleteNotification.bind(notificationController)
);

module.exports = router;
