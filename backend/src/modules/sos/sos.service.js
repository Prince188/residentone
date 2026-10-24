const mongoose = require("mongoose");
const { SOSIncident } = require("./sos.model");
const { User } = require("../user/user.model");
const { Unit } = require("../unit/unit.model");
const { Membership } = require("../membership/membership.model");
const { notificationService } = require("../notification/notification.service");
const { pushNotificationService } = require("../../shared/services/pushNotification.service");
const socketHelper = require("../../socket");
const { AppError } = require("../../shared/utils/errors");
const logger = require("../../config/logger");

class SOSService {
  /**
   * Trigger an SOS Emergency Alert
   */
  async triggerSOS({ societyId, userId, unitId = null, emergencyType = "general", locationDescription = "" }) {
    if (!societyId || !userId) {
      throw new AppError("Society and User are required to trigger SOS", 400);
    }

    // Prevent spam: Check if this user already has an active or acknowledged SOS in this society
    const existingActive = await SOSIncident.findOne({
      societyId,
      userId,
      status: { $in: ["active", "acknowledged"] },
    }).lean();

    if (existingActive) {
      return existingActive;
    }

    // Get user details
    const user = await User.findById(userId).select("name phone").lean();
    if (!user) throw new AppError("User not found", 404);

    let resolvedUnitLabel = "";
    let finalUnitId = unitId;

    // If unitId was passed or if user has a membership with units, resolve flat label
    if (finalUnitId && mongoose.Types.ObjectId.isValid(finalUnitId)) {
      const u = await Unit.findById(finalUnitId).select("label doorNo block floor").lean();
      if (u) {
        resolvedUnitLabel = u.label || `Flat ${u.doorNo || ""}`.trim();
      }
    }

    if (!resolvedUnitLabel) {
      const membership = await Membership.findOne({
        societyId,
        userId,
        isActive: true,
      })
        .populate("units", "label doorNo block floor")
        .lean();

      if (membership?.units && membership.units.length > 0) {
        const u = membership.units[0];
        resolvedUnitLabel = u.label || `Flat ${u.doorNo || ""}`.trim();
        finalUnitId = u._id;
      }
    }

    const locDesc = locationDescription?.trim() || resolvedUnitLabel || "Society Premises";

    const incident = await SOSIncident.create({
      societyId,
      userId,
      userName: user.name || "Resident",
      userPhone: user.phone || "",
      unitId: finalUnitId || null,
      unitLabel: resolvedUnitLabel,
      emergencyType,
      status: "active",
      locationDescription: locDesc,
      triggeredAt: new Date(),
    });

    // Notify Security Guards, Staff, and Admins
    try {
      const responderMemberships = await Membership.find({
        societyId,
        isActive: true,
        role: {
          $in: [
            "security_guard",
            "staff",
            "manager",
            "society_admin",
            "super_admin",
            "committee_member",
            "wing_admin",
          ],
        },
      })
        .select("userId")
        .lean();

      const responderUserIds = [
        ...new Set(
          responderMemberships
            .map((m) => String(m.userId))
            .filter((id) => id !== String(userId))
        ),
      ];

      const typeLabel = emergencyType.toUpperCase();
      const alertTitle = `🚨 SOS ALERT: ${resolvedUnitLabel || user.name}`;
      const alertBody = `${typeLabel} Emergency reported by ${user.name} at ${locDesc}. Immediate response needed!`;

      // 1. In-App Notifications
      for (const responderId of responderUserIds) {
        try {
          await notificationService.createNotification({
            societyId,
            userId: responderId,
            title: alertTitle,
            body: alertBody,
            type: "emergency",
            metadata: {
              incidentId: incident._id,
              emergencyType,
              unitLabel: resolvedUnitLabel,
              userPhone: user.phone,
            },
          });
        } catch (notifErr) {
          logger.warn("SOS in-app notification error:", notifErr);
        }
      }

      // 2. High-Priority Push Notifications
      await pushNotificationService.sendPushToUsers({
        userIds: responderUserIds,
        title: alertTitle,
        body: alertBody,
        data: {
          type: "sos",
          incidentId: incident._id.toString(),
          emergencyType,
          unitLabel: resolvedUnitLabel,
          userPhone: user.phone,
        },
        categoryIdentifier: "emergency",
      });

      // 3. Real-time Socket Broadcast to Society
      if (socketHelper.emitToSociety) {
        socketHelper.emitToSociety(String(societyId), "sos:alert", incident.toObject());
      }
    } catch (broadcastErr) {
      logger.error("Failed to broadcast SOS incident notifications:", broadcastErr);
    }

    return incident;
  }

  /**
   * Get all active / acknowledged SOS incidents for a society
   */
  async getActiveIncidents(societyId) {
    return SOSIncident.find({
      societyId,
      status: { $in: ["active", "acknowledged"] },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get active SOS triggered by the logged-in user
   */
  async getMyActiveSOS(societyId, userId) {
    return SOSIncident.findOne({
      societyId,
      userId,
      status: { $in: ["active", "acknowledged"] },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Guard or Admin acknowledges the incident
   */
  async acknowledgeSOS(incidentId, responderUserId, societyId) {
    const incident = await SOSIncident.findOne({
      _id: incidentId,
      societyId,
    });

    if (!incident) {
      throw new AppError("SOS Incident not found", 404);
    }

    if (incident.status !== "active") {
      throw new AppError(`Incident is already ${incident.status}`, 400);
    }

    const responder = await User.findById(responderUserId).select("name phone").lean();
    const membership = await Membership.findOne({
      societyId,
      userId: responderUserId,
      isActive: true,
    }).select("role").lean();

    incident.status = "acknowledged";
    incident.acknowledgedBy = {
      userId: responderUserId,
      name: responder?.name || "Security Team",
      role: membership?.role || "Guard",
      phone: responder?.phone || "",
      acknowledgedAt: new Date(),
    };

    await incident.save();

    // Notify the resident who triggered it
    try {
      const ackTitle = "✅ Emergency Help Is On The Way!";
      const ackBody = `${incident.acknowledgedBy.name} (${incident.acknowledgedBy.role}) has acknowledged your alert and is responding.`;

      await notificationService.createNotification({
        societyId,
        userId: incident.userId,
        title: ackTitle,
        body: ackBody,
        type: "emergency",
        metadata: {
          incidentId: incident._id,
          acknowledgedBy: incident.acknowledgedBy,
        },
      });

      await pushNotificationService.sendPushToUsers({
        userIds: [incident.userId.toString()],
        title: ackTitle,
        body: ackBody,
        data: {
          type: "sos_ack",
          incidentId: incident._id.toString(),
        },
        categoryIdentifier: "emergency",
      });

      if (socketHelper.emitToSociety) {
        socketHelper.emitToSociety(String(societyId), "sos:acknowledged", incident.toObject());
      }
    } catch (err) {
      logger.warn("Failed to notify resident of SOS acknowledgment:", err);
    }

    return incident;
  }

  /**
   * Resolve an incident or mark it as false alarm
   */
  async resolveSOS(incidentId, resolverUserId, societyId, { resolutionNote = "", isFalseAlarm = false }) {
    const incident = await SOSIncident.findOne({
      _id: incidentId,
      societyId,
    });

    if (!incident) {
      throw new AppError("SOS Incident not found", 404);
    }

    const resolver = await User.findById(resolverUserId).select("name").lean();
    const membership = await Membership.findOne({
      societyId,
      userId: resolverUserId,
      isActive: true,
    }).select("role").lean();

    const newStatus = isFalseAlarm ? "false_alarm" : "resolved";

    incident.status = newStatus;
    incident.resolvedBy = {
      userId: resolverUserId,
      name: resolver?.name || "Resident / Admin",
      role: membership?.role || "resident",
      resolvedAt: new Date(),
      resolutionNote: resolutionNote?.trim() || (isFalseAlarm ? "Marked as false alarm" : "Issue safely resolved"),
      isFalseAlarm: Boolean(isFalseAlarm),
    };

    await incident.save();

    if (socketHelper.emitToSociety) {
      socketHelper.emitToSociety(String(societyId), "sos:resolved", incident.toObject());
    }

    return incident;
  }

  /**
   * Get paginated incident history
   */
  async getHistory(societyId, { page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (p - 1) * lim;

    const [items, total] = await Promise.all([
      SOSIncident.find({ societyId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      SOSIncident.countDocuments({ societyId }),
    ]);

    return {
      items,
      total,
      page: p,
      pages: Math.ceil(total / lim),
    };
  }
}

const sosService = new SOSService();
module.exports = { sosService, SOSService };
