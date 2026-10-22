const collectionService = require("./collection.service");
const auditLogService = require("../audit-log/audit-log.service");

class CollectionController {
  async create(req, res, next) {
    try {
      const collection = await collectionService.create(req.societyId, req.userId, req.body);
      try {
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        pushNotificationService.sendPushToSociety({
          societyId: req.societyId,
          title: `🎉 New Contribution Fund: ${req.body.title || 'Collection Fund'}`,
          body: `Contribution of ₹${Number(req.body.amount || 0).toLocaleString('en-IN')} requested.`,
          data: { screen: "CollectionUnitPay", collectionId: String(collection._id || collection.id) },
        });
      } catch (_) {}

      auditLogService.recordActivity({
        societyId: req.societyId,
        userId: req.userId,
        req,
        action: "COLLECTION_FUND_CREATED",
        entityType: "Collection",
        entityId: collection._id || collection.id,
        details: {
          title: req.body?.title,
          amount: req.body?.amount,
          category: req.body?.category,
        },
      });

      res.status(201).json({ success: true, data: collectionService.mapCollection({ ...collection.toObject(), createdBy: { name: "You" } }) });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      // If query ?my=1, return with myUnits status (for resident)
      if (req.query.my === "1" || req.query.my === "true") {
        const rawList = await require("./collection.model").Collection.find({ societyId: req.societyId, isActive: true }).sort({ createdAt: -1 }).lean();
        const mappedMy = await collectionService.getMyCollections(req.societyId, req.membership, rawList);
        return res.json({ success: true, data: mappedMy });
      }
      const result = await collectionService.list(req.societyId, req.query);
      res.json({
        success: true,
        data: result.items || result,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await collectionService.getById(req.societyId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getUnits(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.id);
      const result = await collectionService.getCollectionUnits(req.societyId, collection, req.query);
      res.json({
        success: true,
        data: result.items || result,
        counts: result.counts || { all: 0, paid: 0, pending: 0 },
        stats: result.stats || {},
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnitDetail(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.collectionId);
      const detail = await collectionService.getUnitDetail(req.societyId, collection, req.params.unitId, req.membership);
      res.json({ success: true, data: detail });
    } catch (error) {
      next(error);
    }
  }

  async recordPayment(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.collectionId);
      const payment = await collectionService.recordPayment(req.societyId, collection, req.params.unitId, req.userId, req.body);

      auditLogService.recordActivity({
        societyId: req.societyId,
        userId: req.userId,
        req,
        action: "COLLECTION_PAYMENT_RECORDED",
        entityType: "Collection",
        entityId: req.params.collectionId,
        details: {
          unitId: req.params.unitId,
          amount: req.body?.amount,
          paymentMethod: req.body?.paymentMethod || "offline",
          collectionTitle: collection?.title,
        },
      });

      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  async removePayment(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.collectionId);
      const reason = req.body?.reason || req.query?.reason || "Payment cancelled by admin";
      const result = await collectionService.removePayment(req.societyId, collection, req.params.unitId, req.userId, reason);

      auditLogService.recordActivity({
        societyId: req.societyId,
        userId: req.userId,
        req,
        action: "COLLECTION_PAYMENT_REMOVED",
        entityType: "Collection",
        entityId: req.params.collectionId,
        details: {
          unitId: req.params.unitId,
          collectionTitle: collection?.title,
          receiptNo: result?.receiptNo,
          amount: result?.totalAmount || result?.amount,
          reason,
        },
      });

      // Dispatch resident push & in-app notification
      try {
        const { Unit } = require("../unit/unit.model");
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        const notificationService = require("../notification/notification.service");

        const unitDoc = await Unit.findById(req.params.unitId).select("ownerId tenantId label block").lean();
        const recipientUserIds = [unitDoc?.ownerId, unitDoc?.tenantId].filter(Boolean).map(String);

        if (recipientUserIds.length > 0) {
          const adminName = req.user?.name || req.membership?.user?.name || "Society Admin";
          const amt = Number(result?.totalAmount || result?.amount || 0).toLocaleString("en-IN");
          const fundTitle = collection?.title || "Community Fund";
          const houseLabel = `House ${unitDoc?.label || "Unit"}${unitDoc?.block ? ` · Block ${unitDoc.block}` : ""}`;
          const title = "⚠️ Collection Payment Marked Pending";
          const body = `Payment of ₹${amt} for "${fundTitle}" (${houseLabel}) was marked as pending by ${adminName}. Reason: ${reason}`;

          for (const uid of recipientUserIds) {
            await notificationService.createNotification({
              societyId: req.societyId,
              userId: uid,
              title,
              body,
              type: "collection",
              link: `/collections/${req.params.collectionId}`,
              metadata: {
                collectionId: String(req.params.collectionId),
                unitId: String(req.params.unitId),
                receiptNo: result?.receiptNo,
                reason,
                cancelledBy: adminName,
              },
            });
          }

          pushNotificationService.sendPushToUsers({
            userIds: recipientUserIds,
            title,
            body,
            data: {
              screen: "CollectionUnitPay",
              collectionId: String(req.params.collectionId),
              unitId: String(req.params.unitId),
            },
          });
        }
      } catch (_) {}

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createOrder(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.collectionId);
      const order = await collectionService.createRazorpayOrder(req.societyId, collection, req.params.unitId, req.userId);
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  async verifyPayment(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.collectionId);
      const payment = await collectionService.verifyRazorpayPayment(req.societyId, collection, req.params.unitId, req.userId, req.body);
      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  async getReceipt(req, res, next) {
    try {
      const collection = await collectionService.getRawById(req.societyId, req.params.collectionId);
      const receipt = await collectionService.getReceipt(
        req.societyId,
        collection,
        req.params.unitId,
        req.membership
      );
      res.json({ success: true, data: receipt });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = await collectionService.update(req.societyId, req.params.id, req.body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async close(req, res, next) {
    try {
      const col = await collectionService.closeCollection(req.societyId, req.params.id);
      res.json({ success: true, data: collectionService.mapCollection({ ...col.toObject(), createdBy: col.createdBy }) });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const col = await collectionService.deleteCollection(req.societyId, req.params.id);
      res.json({ success: true, data: { id: col._id } });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req, res, next) {
    try {
      const { from, to } = req.query;
      const collection = await collectionService.getRawById(req.societyId, req.params.id);
      const buffer = await collectionService.generateExcelBuffer(req.societyId, collection, { from, to });

      const safeTitle = (collection.title || "collection")
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .slice(0, 60) || "collection";
      const dateTag = from && to ? `${from}_to_${to}` : from ? `from_${from}` : to ? `to_${to}` : new Date().toISOString().slice(0, 10);
      const filename = `${safeTitle}_${dateTag}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CollectionController();
