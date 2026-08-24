const { Notice } = require("./notice.model");
const { AppError } = require("../../shared/utils/errors");

class NoticeService {
  async create(societyId, userId, data) {
    return Notice.create({
      societyId,
      createdBy: userId,
      title: data.title,
      body: data.body,
    });
  }

  async listForSociety(societyId, limit) {
    const query = Notice.find({ societyId, isActive: true })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    if (limit) query.limit(limit);
    return query.lean();
  }

  mapNotice(notice) {
    return {
      id: notice._id,
      title: notice.title,
      body: notice.body,
      createdAt: notice.createdAt,
      authorName: notice.createdBy?.name || "Society Admin",
    };
  }

  async getById(societyId, id) {
    const notice = await Notice.findOne({ _id: id, societyId })
      .populate("createdBy", "name")
      .lean();
    if (!notice) throw new AppError("Notice not found", 404);
    return notice;
  }
}

module.exports = new NoticeService();
