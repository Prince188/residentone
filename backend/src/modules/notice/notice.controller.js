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
