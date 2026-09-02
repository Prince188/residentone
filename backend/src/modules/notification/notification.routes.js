const express = require("express");
const { authenticate } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { notificationController } = require("./notification.controller");
const {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
  clearNotificationsQuerySchema,
} = require("./notification.validation");

const router = express.Router();

router.use(authenticate);
router.use(resolveSocietyContext);

router.get(
  "/",
  validate(getNotificationsQuerySchema),
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
  validate(notificationIdParamSchema),
  notificationController.markAsRead.bind(notificationController)
);

router.delete(
  "/clear-all",
  validate(clearNotificationsQuerySchema),
  notificationController.clearAllNotifications.bind(notificationController)
);

router.delete(
  "/:id",
  validate(notificationIdParamSchema),
  notificationController.deleteNotification.bind(notificationController)
);

module.exports = router;
