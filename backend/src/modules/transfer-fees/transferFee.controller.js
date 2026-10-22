const transferFeeService = require("./transferFee.service");

class TransferFeeController {
  async create(req, res, next) {
    try {
      const societyId = req.societyId;
      const userId = req.userId || req.user?.id || req.user?._id;
      const record = await transferFeeService.create(societyId, userId, req.body);
      return res.status(201).json({
        success: true,
        message: "Transfer fee recorded successfully",
        data: record,
      });
    } catch (e) {
      next(e);
    }
  }

  async list(req, res, next) {
    try {
      const societyId = req.societyId;
      const records = await transferFeeService.list(societyId);
      return res.json({
        success: true,
        message: "Transfer fee records fetched successfully",
        data: records,
      });
    } catch (e) {
      next(e);
    }
  }

  async listMy(req, res, next) {
    try {
      const societyId = req.societyId;
      const membership = req.membership;
      const records = await transferFeeService.listMy(societyId, membership);
      return res.json({
        success: true,
        message: "My transfer fee records fetched successfully",
        data: records,
      });
    } catch (e) {
      next(e);
    }
  }

  async getReceipt(req, res, next) {
    try {
      const societyId = req.societyId;
      const { id } = req.params;
      const membership = req.membership;
      const receiptData = await transferFeeService.getReceipt(societyId, id, membership);
      return res.json({
        success: true,
        message: "Transfer fee receipt fetched successfully",
        data: receiptData,
      });
    } catch (e) {
      next(e);
    }
  }

  async exportExcel(req, res, next) {
    try {
      const societyId = req.societyId;
      const { from, to } = req.query;
      const buffer = await transferFeeService.generateExcelBuffer(societyId, { from, to });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Transfer_Fees_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      return res.send(buffer);
    } catch (e) {
      next(e);
    }
  }

  async cancel(req, res, next) {
    try {
      const societyId = req.societyId;
      const { id } = req.params;
      const userId = req.userId || req.user?.id || req.user?._id;
      const reason = req.body?.reason || req.query?.reason || "Transfer fee cancelled by admin";
      const record = await transferFeeService.cancel(societyId, id, userId, reason);

      // Dispatch resident push & in-app notification
      try {
        const { Unit } = require("../unit/unit.model");
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        const notificationService = require("../notification/notification.service");

        let recipientUserIds = [];
        let unitDoc = null;
        if (record.unitId) {
          unitDoc = await Unit.findById(record.unitId).select("ownerId tenantId label block").lean();
          recipientUserIds = [unitDoc?.ownerId, unitDoc?.tenantId].filter(Boolean).map(String);
        }
        if (record.createdBy) {
          recipientUserIds.push(String(record.createdBy));
        }
        recipientUserIds = [...new Set(recipientUserIds)];

        if (recipientUserIds.length > 0) {
          const adminName = req.user?.name || req.membership?.user?.name || "Society Admin";
          const amt = Number(record.amount || 0).toLocaleString("en-IN");
          const receiptNoStr = record.receiptNo ? ` (Receipt #${record.receiptNo})` : "";
          const houseLabel = unitDoc?.label ? ` for House ${unitDoc.label}` : "";
          const title = "⚠️ Transfer Fee Cancelled";
          const body = `Transfer fee of ₹${amt}${houseLabel}${receiptNoStr} was cancelled by ${adminName}. Reason: ${reason}`;

          for (const uid of recipientUserIds) {
            await notificationService.createNotification({
              societyId,
              userId: uid,
              title,
              body,
              type: "transfer_fee",
              link: "/transfer-fees",
              metadata: {
                feeId: String(record._id),
                receiptNo: record.receiptNo,
                reason,
                cancelledBy: adminName,
              },
            });
          }

          pushNotificationService.sendPushToUsers({
            userIds: recipientUserIds,
            title,
            body,
            data: { screen: "TransferFees" },
          });
        }
      } catch (_) {}

      return res.json({
        success: true,
        message: "Transfer fee cancelled successfully",
        data: record,
      });
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new TransferFeeController();
