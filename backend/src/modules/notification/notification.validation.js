const { z } = require("zod");
const { NOTIFICATION_TYPES } = require("./notification.model");

const getNotificationsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    unreadOnly: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
    type: z.enum([...NOTIFICATION_TYPES, "all"]).optional(),
    search: z.string().max(100).optional(),
  }),
});

const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Notification ID is required"),
  }),
});

const clearNotificationsQuerySchema = z.object({
  query: z.object({
    readOnly: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
  }),
});

module.exports = {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
  clearNotificationsQuerySchema,
};
