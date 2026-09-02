const { Notice } = require("./notice.model");
const { AppError } = require("../../shared/utils/errors");

class NoticeService {
  async create(societyId, userId, data) {
    const notice = await Notice.create({
      societyId,
      createdBy: userId,
      title: data.title,
      body: data.body,
    });
    try {
      const s = require("../../socket");
      if (s.emitToSociety) s.emitToSociety(String(societyId), "notice:change", { action: "create", id: notice._id });
      const { notificationService } = require("../notification/notification.service");
      notificationService.broadcastNotification({
        societyId,
        excludeUserId: userId,
        title: "New Notice Published",
        body: notice.title,
        type: "notice",
        link: "/notices",
        metadata: { noticeId: String(notice._id) },
      }).catch(() => {});
    } catch (_) {}
    return notice;
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
    const notice = await Notice.findOne({ _id: id, societyId, isActive: true })
      .populate("createdBy", "name")
      .lean();
    if (!notice) throw new AppError("Notice not found", 404);
    return notice;
  }

  async update(societyId, id, data) {
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.body !== undefined) updateData.body = data.body;

    const notice = await Notice.findOneAndUpdate(
      { _id: id, societyId, isActive: true },
      { $set: updateData },
      { new: true }
    ).populate("createdBy", "name");

    if (!notice) throw new AppError("Notice not found", 404);

    try {
      const s = require("../../socket");
      if (s.emitToSociety) s.emitToSociety(String(societyId), "notice:change", { action: "update", id: notice._id });
    } catch (_) {}

    return notice;
  }

  async remove(societyId, id) {
    const notice = await Notice.findOneAndUpdate(
      { _id: id, societyId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!notice) throw new AppError("Notice not found", 404);

    try {
      const s = require("../../socket");
      if (s.emitToSociety) s.emitToSociety(String(societyId), "notice:change", { action: "delete", id: notice._id });
    } catch (_) {}

    return { id, deleted: true };
  }
}

module.exports = new NoticeService();
