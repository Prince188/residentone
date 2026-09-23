const noticeService = require("./notice.service");

class NoticeController {
  async list(req, res, next) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : null;
      const notices = await noticeService.listForSociety(req.societyId, limit);
      res.json({
        success: true,
        data: notices.map((n) => noticeService.mapNotice(n)),
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const notice = await noticeService.create(
        req.societyId,
        req.userId,
        req.body
      );
      const mapped = noticeService.mapNotice(notice.toObject ? notice.toObject() : notice);
      try {
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        pushNotificationService.sendPushToSociety({
          societyId: req.societyId,
          title: `📢 New Notice: ${req.body.title || 'Society Notice'}`,
          body: String(req.body.content || req.body.body || 'A new society notice has been published.').slice(0, 120),
          data: { screen: "NoticeDetail", noticeId: String(mapped.id || notice._id) },
        });
      } catch (_) {}
      res.status(201).json({ success: true, data: mapped });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const notice = await noticeService.update(
        req.societyId,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: noticeService.mapNotice(notice.toObject ? notice.toObject() : notice) });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const result = await noticeService.remove(
        req.societyId,
        req.params.id
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NoticeController();
