const mongoose = require("mongoose");
const { Notification } = require("./notification.model");
const { Membership } = require("../membership/membership.model");
const { AppError } = require("../../shared/utils/errors");
const socketHelper = require("../../socket");
const logger = require("../../config/logger");

class NotificationService {
  mapNotification(doc) {
    if (!doc) return null;
    const n = doc.toObject ? doc.toObject() : doc;
    return {
      id: String(n._id),
      title: n.title,
      body: n.body,
      type: n.type || "system",
      link: n.link || null,
      isRead: Boolean(n.isRead),
      readAt: n.readAt || null,
      metadata: n.metadata || {},
      societyId: String(n.societyId),
      userId: String(n.userId),
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    };
  }

  async createNotification({
    societyId,
    userId,
    title,
    body,
    type = "system",
    link = null,
    metadata = {},
  }) {
    if (!societyId || !userId || !title || !body) {
      throw new AppError("societyId, userId, title, and body are required", 400);
    }

    const doc = await Notification.create({
      societyId,
      userId,
      title,
      body,
      type,
      link,
      metadata,
    });

    const mapped = this.mapNotification(doc);

    try {
      if (socketHelper.emitToUser) {
        socketHelper.emitToUser(String(userId), "notification:new", mapped);
      }
    } catch (err) {
      logger.warn(`Failed to emit real-time notification to user ${userId}:`, err);
    }

    return mapped;
  }

  async broadcastNotification({
    societyId,
    userIds = null,
    excludeUserId = null,
    targetRoles = null,
    title,
    body,
    type = "system",
    link = null,
    metadata = {},
  }) {
    if (!societyId || !title || !body) {
      throw new AppError("societyId, title, and body are required", 400);
    }

    let recipients = userIds;

    if (!recipients || !recipients.length) {
      const query = { societyId, isActive: true };
      if (targetRoles && targetRoles.length) {
        query.role = { $in: targetRoles };
      }
      const memberships = await Membership.find(query).select("userId").lean();
      recipients = memberships.map((m) => String(m.userId));
    }

    if (excludeUserId) {
      const excludeStr = String(excludeUserId);
      recipients = recipients.filter((id) => String(id) !== excludeStr);
    }

    // Deduplicate recipients
    const uniqueRecipients = [...new Set(recipients.map((id) => String(id)))];
    if (uniqueRecipients.length === 0) {
      return { count: 0 };
    }

    const docsToInsert = uniqueRecipients.map((uid) => ({
      societyId,
      userId: uid,
      title,
      body,
      type,
      link,
      metadata,
      isRead: false,
    }));

    // Perform bulk insert
    await Notification.insertMany(docsToInsert);

    // Emit broadcast event to society room and to target user sockets
    try {
      const previewPayload = {
        societyId: String(societyId),
        title,
        body,
        type,
        link,
        metadata,
        createdAt: new Date(),
      };

      if (socketHelper.emitToSociety) {
        socketHelper.emitToSociety(String(societyId), "notification:broadcast", previewPayload);
      }
    } catch (err) {
      logger.warn(`Failed to broadcast socket notification for society ${societyId}:`, err);
    }

    return { count: uniqueRecipients.length };
  }

  async getNotifications({
    societyId,
    userId,
    page = 1,
    limit = 20,
    unreadOnly = false,
    type = null,
    search = "",
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {
      societyId,
      userId,
    };

    if (unreadOnly === true || unreadOnly === "true") {
      query.isRead = false;
    }

    if (type && type !== "all") {
      query.type = type;
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: { $regex: s, $options: "i" } },
        { body: { $regex: s, $options: "i" } },
      ];
    }

    const [docs, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ societyId, userId, isRead: false }),
    ]);

    return {
      notifications: docs.map((d) => this.mapNotification(d)),
      unreadCount,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  async getUnreadCount({ societyId, userId }) {
    const count = await Notification.countDocuments({
      societyId,
      userId,
      isRead: false,
    });
    return { unreadCount: count };
  }

  async markAsRead({ societyId, userId, notificationId }) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new AppError("Invalid notification ID", 400);
    }

    const doc = await Notification.findOneAndUpdate(
      { _id: notificationId, societyId, userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    ).lean();

    if (!doc) {
      throw new AppError("Notification not found", 404);
    }

    return this.mapNotification(doc);
  }

  async markAllAsRead({ societyId, userId }) {
    const result = await Notification.updateMany(
      { societyId, userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return { updatedCount: result.modifiedCount || 0 };
  }

  async deleteNotification({ societyId, userId, notificationId }) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new AppError("Invalid notification ID", 400);
    }

    const doc = await Notification.findOneAndDelete({
      _id: notificationId,
      societyId,
      userId,
    }).lean();

    if (!doc) {
      throw new AppError("Notification not found", 404);
    }

    return { success: true };
  }

  async clearAllNotifications({ societyId, userId, readOnly = false }) {
    const query = { societyId, userId };
    if (readOnly) {
      query.isRead = true;
    }

    const result = await Notification.deleteMany(query);
    return { deletedCount: result.deletedCount || 0 };
  }
}

const notificationService = new NotificationService();

module.exports = { notificationService, NotificationService };
