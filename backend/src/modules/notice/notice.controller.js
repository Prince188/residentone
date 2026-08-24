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
      res.status(201).json({ success: true, data: noticeService.mapNotice(notice.toObject()) });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NoticeController();
