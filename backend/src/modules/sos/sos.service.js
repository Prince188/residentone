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

const SOS_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes auto-cancel timeout (120,000 ms)

class SOSService {
  /**
   * Automatically cancel an incident after 2 minutes timeout if not cancelled by user
   */
  async autoCancelIncident(incidentId) {
    if (!incidentId) return null;
    try {
      const incident = await SOSIncident.findById(incidentId);
      if (!incident) return null;
      if (incident.status !== "active" && incident.status !== "acknowledged") {
        return incident; // Already resolved
      }

      incident.status = "resolved";
      incident.resolvedBy = {
        userId: incident.userId,
        name: "System (Auto-Timeout)",
        role: "system",
        resolvedAt: new Date(),
        resolutionNote: "Alarm cancelled automatically after 2 minutes",
        isFalseAlarm: false,
        isAutoCancelled: true,
      };

      await incident.save();

      if (incident.societyId && socketHelper.emitToSociety) {
        socketHelper.emitToSociety(String(incident.societyId), "sos:resolved", incident.toObject());
      }
      logger.info(`[SOS] Incident ${incident._id} auto-cancelled after 2 minutes`);
      return incident;
    } catch (err) {
      logger.error("[SOS] Error auto-cancelling incident:", err);
      return null;
    }
  }

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
    });

    if (existingActive) {
      const elapsed = Date.now() - new Date(existingActive.triggeredAt || existingActive.createdAt).getTime();
      if (elapsed >= SOS_TIMEOUT_MS) {
        // Stale incident from >2 mins ago: auto-cancel it and allow fresh dispatch
        await this.autoCancelIncident(existingActive._id);
      } else {
        return existingActive.toObject ? existingActive.toObject() : existingActive;
      }
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

    // Auto-cancel after 2 minutes timeout if not cancelled by user or guard
    setTimeout(() => {
      this.autoCancelIncident(incident._id).catch(() => {});
    }, SOS_TIMEOUT_MS);

    return incident;
  }

  /**
   * Get all active / acknowledged SOS incidents for a society
   */
  async getActiveIncidents(societyId) {
    const incidents = await SOSIncident.find({
      societyId,
      status: { $in: ["active", "acknowledged"] },
    }).sort({ createdAt: -1 });

    const activeList = [];
    for (const inc of incidents) {
      const elapsed = Date.now() - new Date(inc.triggeredAt || inc.createdAt).getTime();
      if (elapsed >= SOS_TIMEOUT_MS) {
        this.autoCancelIncident(inc._id).catch(() => {});
      } else {
        activeList.push(inc.toObject ? inc.toObject() : inc);
      }
    }
    return activeList;
  }

  /**
   * Get active SOS triggered by the logged-in user
   */
  async getMyActiveSOS(societyId, userId) {
    // Auto-cancel any expired (>2 min) active incidents in society for this user
    await SOSIncident.updateMany(
      {
        societyId,
        userId,
        status: { $in: ["active", "acknowledged"] },
        createdAt: { $lt: new Date(Date.now() - SOS_TIMEOUT_MS) },
      },
      {
        $set: {
          status: "resolved",
          resolvedBy: {
            userId,
            name: "System (Auto-Timeout)",
            role: "system",
            resolvedAt: new Date(),
            resolutionNote: "Alarm cancelled automatically after 2 minutes",
            isFalseAlarm: false,
            isAutoCancelled: true,
          },
        },
      }
    ).catch((e) => logger.warn("[SOS] Error expiring stale incidents:", e));

    const incident = await SOSIncident.findOne({
      societyId,
      userId,
      status: { $in: ["active", "acknowledged"] },
    }).sort({ createdAt: -1 });

    if (!incident) return null;

    const elapsed = Date.now() - new Date(incident.triggeredAt || incident.createdAt).getTime();
    if (elapsed >= SOS_TIMEOUT_MS) {
      await this.autoCancelIncident(incident._id);
      return null;
    }

    return incident.toObject ? incident.toObject() : incident;
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
   * Resolve an incident or mark it as false alarm (I AM SAFE / FALSE ALARM)
   */
  async resolveSOS(incidentId, resolverUserId, societyId, body = {}) {
    const isFalseAlarm = Boolean(
      body.isFalseAlarm === true ||
      body.isFalseAlarm === "true" ||
      body.falseAlarm === true ||
      body.falseAlarm === "true"
    );
    const resolutionNote = body.resolutionNote || body.note || "";

    let incident = null;
    if (incidentId && mongoose.Types.ObjectId.isValid(incidentId)) {
      if (societyId) {
        incident = await SOSIncident.findOne({ _id: incidentId, societyId });
      }
      if (!incident) {
        incident = await SOSIncident.findById(incidentId);
      }
    }

    // Fallback: If not found by ID or no ID provided, look up user's active SOS
    if (!incident && resolverUserId) {
      incident = await SOSIncident.findOne({
        userId: resolverUserId,
        status: { $in: ["active", "acknowledged"] },
      }).sort({ createdAt: -1 });
    }

    if (!incident) {
      throw new AppError("SOS Incident not found or already closed", 404);
    }

    // If incident is already closed, return it gracefully
    if (incident.status === "resolved" || incident.status === "false_alarm") {
      return incident;
    }

    const resolver = await User.findById(resolverUserId).select("name").lean();
    let membership = null;
    const targetSocietyId = societyId || incident.societyId;
    if (targetSocietyId) {
      membership = await Membership.findOne({
        societyId: targetSocietyId,
        userId: resolverUserId,
        isActive: true,
      }).select("role").lean();
    }

    const isOwner = String(incident.userId) === String(resolverUserId);
    const isAdminOrGuard = membership && [
      "super_admin",
      "society_admin",
      "security_guard",
      "staff",
      "manager",
      "wing_admin",
      "committee_member",
    ].includes(membership.role);

    if (!isOwner && !isAdminOrGuard) {
      throw new AppError("Only the resident who triggered SOS or on-duty security/admin can close this alert", 403);
    }

    const newStatus = isFalseAlarm ? "false_alarm" : "resolved";

    incident.status = newStatus;
    incident.resolvedBy = {
      userId: resolverUserId,
      name: resolver?.name || (isOwner ? "Resident" : "Admin"),
      role: membership?.role || (isOwner ? "resident" : "admin"),
      resolvedAt: new Date(),
      resolutionNote: resolutionNote?.trim() || (isFalseAlarm ? "Marked as false alarm by resident" : "Emergency resolved safely (I Am Safe)"),
      isFalseAlarm: Boolean(isFalseAlarm),
    };

    await incident.save();

    // Clean up any other duplicate/lingering active incidents for this resident in the society
    await SOSIncident.updateMany(
      {
        societyId: targetSocietyId,
        userId: incident.userId,
        status: { $in: ["active", "acknowledged"] },
        _id: { $ne: incident._id },
      },
      {
        $set: {
          status: newStatus,
          resolvedBy: incident.resolvedBy,
        },
      }
    ).catch((e) => logger.warn("[SOS] Error resolving duplicate incidents:", e));

    if (targetSocietyId && socketHelper.emitToSociety) {
      socketHelper.emitToSociety(String(targetSocietyId), "sos:resolved", incident.toObject());
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
