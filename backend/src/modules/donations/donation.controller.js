const donationService = require("./donation.service");

class DonationController {
  async create(req, res, next) {
    try {
      const donation = await donationService.create(req.societyId, req.userId, req.body);
      try {
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        pushNotificationService.sendPushToUsers({
          userIds: [req.userId],
          title: "🙏 Donation Received",
          body: `Thank you! Your donation of ₹${Number(req.body.amount || 0).toLocaleString('en-IN')} has been recorded.`,
          data: { screen: "Donations" },
        });
      } catch (_) {}
      res.status(201).json({ success: true, data: donation });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const result = await donationService.list(req.societyId, req.query);
      res.json({
        success: true,
        data: result.items || result,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async listMy(req, res, next) {
    try {
      const result = await donationService.listMy(req.societyId, req.membership, req.query);
      res.json({
        success: true,
        data: result.items || result,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReceipt(req, res, next) {
    try {
      const receipt = await donationService.getReceipt(req.societyId, req.params.id, req.membership);
      res.json({ success: true, data: receipt });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req, res, next) {
    try {
      const buffer = await donationService.generateExcelBuffer(req.societyId, req.query);
      const { from, to } = req.query;
      const dateTag = from && to ? `${from}_to_${to}` : from ? `from_${from}` : to ? `to_${to}` : new Date().toISOString().slice(0, 10);
      const filename = `donations_${dateTag}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const reason = req.body?.reason || req.query?.reason || "Donation cancelled by admin";
      const donation = await donationService.cancel(req.societyId, req.params.id, req.userId, reason);

      // Dispatch donor push & in-app notification
      try {
        const { Unit } = require("../unit/unit.model");
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        const notificationService = require("../notification/notification.service");

        let recipientUserIds = [];
        if (donation.unitId) {
          const unitDoc = await Unit.findById(donation.unitId).select("ownerId tenantId label block").lean();
          recipientUserIds = [unitDoc?.ownerId, unitDoc?.tenantId].filter(Boolean).map(String);
        }
        if (donation.createdBy) {
          recipientUserIds.push(String(donation.createdBy));
        }
        recipientUserIds = [...new Set(recipientUserIds)];

        if (recipientUserIds.length > 0) {
          const adminName = req.user?.name || req.membership?.user?.name || "Society Admin";
          const amt = Number(donation.amount || 0).toLocaleString("en-IN");
          const receiptNoStr = donation.receiptNo ? ` (Receipt #${donation.receiptNo})` : "";
          const title = "⚠️ Donation Cancelled";
          const body = `Donation of ₹${amt}${receiptNoStr} was cancelled by ${adminName}. Reason: ${reason}`;

          for (const uid of recipientUserIds) {
            await notificationService.createNotification({
              societyId: req.societyId,
              userId: uid,
              title,
              body,
              type: "donation",
              link: "/donations",
              metadata: {
                donationId: String(donation._id),
                receiptNo: donation.receiptNo,
                reason,
                cancelledBy: adminName,
              },
            });
          }

          pushNotificationService.sendPushToUsers({
            userIds: recipientUserIds,
            title,
            body,
            data: { screen: "Donations" },
          });
        }
      } catch (_) {}

      res.json({ success: true, message: "Donation cancelled successfully", data: donation });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DonationController();
