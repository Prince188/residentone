const { Expo } = require('expo-server-sdk');
const { User } = require('../../modules/user/user.model');
const logger = require('../../config/logger');

const expo = new Expo();

/**
 * Service for dispatching Expo Push Notifications to mobile devices.
 * All dispatches are wrapped in non-blocking try-catch blocks to guarantee
 * zero API failures or database corruption if push delivery fails.
 */
class PushNotificationService {
  /**
   * Send a push notification to specific user IDs
   */
  async sendPushToUsers({ userIds = [], title, body, data = {}, categoryIdentifier = null }) {
    try {
      if (!userIds || !userIds.length || !title || !body) return;

      const uniqueUserIds = [...new Set(userIds.map((id) => String(id)))];
      const users = await User.find({
        _id: { $in: uniqueUserIds },
        $or: [
          { pushToken: { $ne: null } },
          { pushTokens: { $exists: true, $not: { $size: 0 } } },
        ],
      }).select('pushToken pushTokens').lean();

      const messages = [];

      for (const u of users) {
        const tokens = new Set();
        if (u.pushToken && Expo.isExpoPushToken(u.pushToken)) {
          tokens.add(u.pushToken);
        }
        if (Array.isArray(u.pushTokens)) {
          u.pushTokens.forEach((t) => {
            if (t && Expo.isExpoPushToken(t)) tokens.add(t);
          });
        }

        for (const token of tokens) {
          messages.push({
            to: token,
            sound: 'default',
            title,
            body,
            data: { ...data, title, body },
            categoryIdentifier,
            _displayInForeground: true,
          });
        }
      }

      if (!messages.length) return;

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          logger.warn('Expo push notification chunk send error:', error);
        }
      }
    } catch (err) {
      logger.warn('PushNotificationService sendPushToUsers error:', err);
    }
  }

  /**
   * Send a push notification to all active residents in a society
   */
  async sendPushToSociety({ societyId, userIds = null, excludeUserId = null, title, body, data = {}, categoryIdentifier = null }) {
    try {
      const { Membership } = require('../../modules/membership/membership.model');
      let recipients = userIds;

      if (!recipients || !recipients.length) {
        const query = { societyId, isActive: true };
        const memberships = await Membership.find(query).select('userId').lean();
        recipients = memberships.map((m) => String(m.userId));
      }

      if (excludeUserId) {
        const excludeStr = String(excludeUserId);
        recipients = recipients.filter((id) => String(id) !== excludeStr);
      }

      await this.sendPushToUsers({
        userIds: recipients,
        title,
        body,
        data,
        categoryIdentifier,
      });
    } catch (err) {
      logger.warn('PushNotificationService sendPushToSociety error:', err);
    }
  }
}

const pushNotificationService = new PushNotificationService();

module.exports = { pushNotificationService, PushNotificationService };
