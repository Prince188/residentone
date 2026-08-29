const { ChatGroup, ChatMessage, DirectMessage } = require("./chat.model");
const { Membership } = require("../membership/membership.model");
const { AppError } = require("../../shared/utils/errors");

class ChatService {
  async isAdmin(societyId, userId) {
    const membership = await Membership.findOne({ societyId, userId, isActive: true }).lean();
    if (!membership) return false;
    return ["super_admin", "society_admin"].includes(membership.role);
  }

  async ensureMember(societyId, groupId, userId) {
    const group = await ChatGroup.findOne({ _id: groupId, societyId, isActive: true }).lean();
    if (!group) throw new AppError("Group not found", 404);
    const isMember = group.members.some((m) => String(m) === String(userId));
    if (!isMember) throw new AppError("You are not a member of this group", 403);
    return group;
  }

  async createGroup(societyId, adminId, data) {
    // Validate all members belong to society
    const memberIds = [...new Set(data.memberIds.map(String))];
    // Ensure admin is included
    if (!memberIds.includes(String(adminId))) memberIds.push(String(adminId));

    const memberships = await Membership.find({ societyId, userId: { $in: memberIds }, isActive: true }).lean();
    const validUserIds = new Set(memberships.map((m) => String(m.userId)));
    // Filter to only valid society members
    const filteredMembers = memberIds.filter((id) => validUserIds.has(String(id)));
    if (filteredMembers.length === 0) throw new AppError("No valid society members for group", 400);

    const group = await ChatGroup.create({
      societyId,
      name: data.name.trim(),
      description: (data.description || "").trim(),
      createdBy: adminId,
      members: filteredMembers,
    });

    try {
      const socketHelper = require("../../socket");
      socketHelper.emitToSociety(String(societyId), "chat:change", { groupId: group._id, action: "create" });
    } catch (_) {}

    return group;
  }

  async listGroups(societyId, userId) {
    const groups = await ChatGroup.find({ societyId, members: userId, isActive: true })
      .populate("createdBy", "name")
      .populate("members", "name")
      .sort({ updatedAt: -1 })
      .lean();

    // Attach last message preview (optional)
    const groupIds = groups.map((g) => g._id);
    const lastMessages = groupIds.length
      ? await ChatMessage.aggregate([
          { $match: { societyId: groups[0]?.societyId, groupId: { $in: groupIds }, isActive: true } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: "$groupId", lastText: { $first: "$text" }, lastAt: { $first: "$createdAt" } } },
        ])
      : [];
    const lastMap = new Map(lastMessages.map((m) => [String(m._id), m]));

    return groups.map((g) => ({
      id: g._id,
      name: g.name,
      description: g.description,
      memberCount: (g.members || []).length,
      createdByName: g.createdBy?.name || "Admin",
      updatedAt: g.updatedAt,
      lastMessage: lastMap.get(String(g._id))?.lastText || null,
      lastAt: lastMap.get(String(g._id))?.lastAt || g.updatedAt,
    }));
  }

  async getGroupMessages(societyId, groupId, userId, limit = 50) {
    await this.ensureMember(societyId, groupId, userId);
    const group = await ChatGroup.findOne({ _id: groupId, societyId }).select("pinnedMessageId").lean();
    const messages = await ChatMessage.find({ societyId, groupId, isActive: true })
      .populate("senderId", "name")
      .populate("replyTo", "text senderId")
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
    // Populate reply sender names
    const replyIds = messages.filter((m) => m.replyTo).map((m) => m.replyTo.senderId).filter(Boolean);
    let replyNames = {};
    if (replyIds.length) {
      const users = await require("../user/user.model").User.find({ _id: { $in: replyIds } }).select("name").lean();
      replyNames = Object.fromEntries(users.map((u) => [String(u._id), u.name]));
    }
    return messages.map((m) => ({
      id: m._id,
      text: m.isDeleted ? "This message was deleted" : m.text,
      senderId: m.senderId?._id || m.senderId,
      senderName: m.senderId?.name || "Member",
      createdAt: m.createdAt,
      isDeleted: m.isDeleted,
      replyTo: m.replyTo ? { id: m.replyTo._id, text: m.isDeleted ? "" : m.replyTo.text, senderName: replyNames[String(m.replyTo.senderId)] || "Member" } : null,
      reactions: m.reactions || [],
      isPinned: String(group?.pinnedMessageId) === String(m._id),
    }));
  }

  async sendGroupMessage(societyId, groupId, senderId, text, replyTo = null) {
    await this.ensureMember(societyId, groupId, senderId);
    const payload = { societyId, groupId, senderId, text: text.trim() };
    if (replyTo) {
      const parent = await ChatMessage.findOne({ _id: replyTo, groupId, societyId }).lean();
      if (parent) payload.replyTo = replyTo;
    }
    const msg = await ChatMessage.create(payload);
    await ChatGroup.updateOne({ _id: groupId }, { $set: { updatedAt: new Date() } });
    try {
      const socketHelper = require("../../socket");
      socketHelper.emitToSociety(String(societyId), "chat:change", { groupId, action: "message" });
      const io = socketHelper.getIO?.();
      if (io) io.to(`chat:${groupId}`).emit("chat:message", { groupId, message: { id: msg._id, text: msg.text, senderId } });
    } catch (_) {}
    return msg;
  }

  async deleteGroupMessage(societyId, groupId, messageId, requesterId) {
    const msg = await ChatMessage.findOne({ _id: messageId, groupId, societyId });
    if (!msg) throw new AppError("Message not found", 404);
    const isOwner = String(msg.senderId) === String(requesterId);
    const isAdmin = await this.isAdmin(societyId, requesterId);
    if (!isOwner && !isAdmin) throw new AppError("Only sender or admin can delete", 403);
    msg.isDeleted = true;
    msg.text = "This message was deleted";
    await msg.save();
    try { const s = require("../../socket"); s.emitToSociety(String(societyId), "chat:change", { groupId, action: "delete" }); } catch (_) {}
    return msg;
  }

  async reactGroupMessage(societyId, groupId, messageId, userId, emoji) {
    await this.ensureMember(societyId, groupId, userId);
    const msg = await ChatMessage.findOne({ _id: messageId, groupId, societyId });
    if (!msg) throw new AppError("Message not found", 404);
    // Remove existing reaction by same user then add
    msg.reactions = (msg.reactions || []).filter((r) => String(r.userId) !== String(userId));
    msg.reactions.push({ userId, emoji });
    await msg.save();
    try { const s = require("../../socket"); s.emitToSociety(String(societyId), "chat:change", { groupId, action: "react" }); } catch (_) {}
    return msg;
  }

  async pinGroupMessage(societyId, groupId, messageId, adminId) {
    if (!(await this.isAdmin(societyId, adminId))) throw new AppError("Only admin can pin", 403);
    const msg = await ChatMessage.findOne({ _id: messageId, groupId, societyId });
    if (!msg) throw new AppError("Message not found", 404);
    const group = await ChatGroup.findOne({ _id: groupId, societyId });
    if (!group) throw new AppError("Group not found", 404);
    if (String(group.pinnedMessageId) === String(messageId)) {
      group.pinnedMessageId = null;
    } else {
      group.pinnedMessageId = messageId;
    }
    await group.save();
    try { const s = require("../../socket"); s.emitToSociety(String(societyId), "chat:change", { groupId, action: "pin" }); } catch (_) {}
    return group;
  }

  async addMembers(societyId, groupId, adminId, memberIds) {
    const group = await ChatGroup.findOne({ _id: groupId, societyId, isActive: true });
    if (!group) throw new AppError("Group not found", 404);
    if (String(group.createdBy) !== String(adminId) && !(await this.isAdmin(societyId, adminId))) {
      throw new AppError("Only group owner or society admin can add members", 403);
    }
    const ids = [...new Set(memberIds.map(String))];
    const memberships = await Membership.find({ societyId, userId: { $in: ids }, isActive: true }).lean();
    const valid = memberships.map((m) => String(m.userId));
    await ChatGroup.updateOne({ _id: groupId }, { $addToSet: { members: { $each: valid } } });
    try { const s = require("../../socket"); s.emitToSociety(String(societyId), "chat:change", { groupId, action: "add" }); } catch (_) {}
    return ChatGroup.findById(groupId).lean();
  }

  async removeMembers(societyId, groupId, adminId, memberIds) {
    const group = await ChatGroup.findOne({ _id: groupId, societyId, isActive: true });
    if (!group) throw new AppError("Group not found", 404);
    if (String(group.createdBy) !== String(adminId) && !(await this.isAdmin(societyId, adminId))) {
      throw new AppError("Only group owner or society admin can remove members", 403);
    }
    const ids = [...new Set(memberIds.map(String))];
    // Prevent removing last admin? ensure at least 1 member remains
    if (group.members.length - ids.length < 1) throw new AppError("Cannot remove all members", 400);
    await ChatGroup.updateOne({ _id: groupId }, { $pull: { members: { $in: ids } } });
    try { const s = require("../../socket"); s.emitToSociety(String(societyId), "chat:change", { groupId, action: "remove" }); } catch (_) {}
    return ChatGroup.findById(groupId).lean();
  }

  async getGroupInfo(societyId, groupId, userId) {
    await this.ensureMember(societyId, groupId, userId);
    const group = await ChatGroup.findOne({ _id: groupId, societyId, isActive: true })
      .populate("createdBy", "name")
      .populate("members", "name phone")
      .lean();
    if (!group) throw new AppError("Group not found", 404);
    return {
      id: group._id,
      name: group.name,
      description: group.description,
      createdBy: group.createdBy?._id || group.createdBy,
      createdByName: group.createdBy?.name || "Admin",
      createdAt: group.createdAt,
      members: (group.members || []).map((m) => ({ id: m._id, name: m.name, phoneMasked: m.phone ? String(m.phone).slice(0,2) + "XXXX" + String(m.phone).slice(-2) : null })),
    };
  }

  async leaveGroup(societyId, groupId, userId) {
    const group = await ChatGroup.findOne({ _id: groupId, societyId, isActive: true });
    if (!group) throw new AppError("Group not found", 404);
    const isMember = group.members.some((m) => String(m) === String(userId));
    if (!isMember) throw new AppError("You are not a member", 403);
    // Admin/creator can leave too, but group stays if others remain
    await ChatGroup.updateOne({ _id: groupId }, { $pull: { members: userId } });
    try { const s = require("../../socket"); s.emitToSociety(String(societyId), "chat:change", { groupId, action: "leave" }); } catch (_) {}
    return true;
  }

  // Direct admin chat - resident <-> admin only
  async sendDirectMessage(societyId, senderId, receiverId, text, replyTo = null) {
    if (String(senderId) === String(receiverId)) throw new AppError("Cannot message yourself", 400);
    const [senderMem, receiverMem] = await Promise.all([
      Membership.findOne({ societyId, userId: senderId, isActive: true }).lean(),
      Membership.findOne({ societyId, userId: receiverId, isActive: true }).lean(),
    ]);
    if (!senderMem) throw new AppError("Sender is not a society member", 403);
    if (!receiverMem) throw new AppError("Receiver is not a society member", 404);
    const senderIsAdmin = ["super_admin", "society_admin"].includes(senderMem.role);
    const receiverIsAdmin = ["super_admin", "society_admin"].includes(receiverMem.role);
    if (!senderIsAdmin && !receiverIsAdmin) throw new AppError("Personal chat is only allowed with society admin", 403);
    const payload = { societyId, senderId, receiverId, text: text.trim() };
    if (replyTo) {
      const parent = await DirectMessage.findOne({ _id: replyTo, societyId }).lean();
      if (parent) payload.replyTo = replyTo;
    }
    const msg = await DirectMessage.create(payload);
    try {
      const socketHelper = require("../../socket");
      socketHelper.emitToUser(String(receiverId), "chat:direct", { from: senderId, text: text.trim() });
      socketHelper.emitToUser(String(senderId), "chat:direct", { to: receiverId, text: text.trim() });
    } catch (_) {}
    return msg;
  }

  async deleteDirectMessage(societyId, messageId, requesterId) {
    const msg = await DirectMessage.findOne({ _id: messageId, societyId });
    if (!msg) throw new AppError("Message not found", 404);
    const isOwner = String(msg.senderId) === String(requesterId);
    const isAdmin = await this.isAdmin(societyId, requesterId);
    if (!isOwner && !isAdmin) throw new AppError("Only sender or admin can delete", 403);
    msg.isDeleted = true;
    msg.text = "This message was deleted";
    await msg.save();
    try { const s = require("../../socket"); s.emitToUser(String(msg.receiverId), "chat:direct", { action: "delete" }); s.emitToUser(String(msg.senderId), "chat:direct", { action: "delete" }); } catch (_) {}
    return msg;
  }

  async reactDirectMessage(societyId, messageId, userId, emoji) {
    const msg = await DirectMessage.findOne({ _id: messageId, societyId });
    if (!msg) throw new AppError("Message not found", 404);
    if (String(msg.senderId) !== String(userId) && String(msg.receiverId) !== String(userId)) throw new AppError("Not participant", 403);
    msg.reactions = (msg.reactions || []).filter((r) => String(r.userId) !== String(userId));
    msg.reactions.push({ userId, emoji });
    await msg.save();
    try { const s = require("../../socket"); s.emitToUser(String(msg.receiverId), "chat:direct", { action: "react" }); s.emitToUser(String(msg.senderId), "chat:direct", { action: "react" }); } catch (_) {}
    return msg;
  }

  async getDirectMessages(societyId, userId, otherUserId, limit = 50) {
    const otherMem = await Membership.findOne({ societyId, userId: otherUserId, isActive: true }).lean();
    if (!otherMem) throw new AppError("User not found in society", 404);
    const userMem = await Membership.findOne({ societyId, userId, isActive: true }).lean();
    const userIsAdmin = userMem && ["super_admin", "society_admin"].includes(userMem.role);
    const otherIsAdmin = ["super_admin", "society_admin"].includes(otherMem.role);
    if (!userIsAdmin && !otherIsAdmin) throw new AppError("Personal chat only with admin", 403);
    const msgs = await DirectMessage.find({
      societyId,
      isActive: true,
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    })
      .populate("replyTo", "text senderId")
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();
    await DirectMessage.updateMany({ societyId, senderId: otherUserId, receiverId: userId, isRead: false }, { isRead: true });
    // Populate reply names
    const replyIds = msgs.filter((m) => m.replyTo).map((m) => m.replyTo.senderId).filter(Boolean);
    let replyNames = {};
    if (replyIds.length) {
      const users = await require("../user/user.model").User.find({ _id: { $in: replyIds } }).select("name").lean();
      replyNames = Object.fromEntries(users.map((u) => [String(u._id), u.name]));
    }
    return msgs.map((m) => ({
      id: m._id,
      text: m.isDeleted ? "This message was deleted" : m.text,
      senderId: m.senderId,
      receiverId: m.receiverId,
      isMine: String(m.senderId) === String(userId),
      isRead: m.isRead,
      isDeleted: m.isDeleted,
      replyTo: m.replyTo ? { id: m.replyTo._id, text: m.replyTo.text, senderName: replyNames[String(m.replyTo.senderId)] || "Member" } : null,
      reactions: m.reactions || [],
      createdAt: m.createdAt,
    }));
  }

  async listAdmins(societyId) {
    const admins = await Membership.find({ societyId, role: { $in: ["super_admin", "society_admin"] }, isActive: true })
      .populate("userId", "name")
      .lean();
    return admins.map((m) => ({ id: m.userId._id, name: m.userId.name, role: m.role }));
  }

  async getPinnedMessage(societyId, groupId) {
    const group = await ChatGroup.findOne({ _id: groupId, societyId }).select("pinnedMessageId").lean();
    if (!group?.pinnedMessageId) return null;
    const msg = await ChatMessage.findOne({ _id: group.pinnedMessageId, societyId }).populate("senderId", "name").lean();
    if (!msg) return null;
    return { id: msg._id, text: msg.text, senderName: msg.senderId?.name || "Admin" };
  }

  async listDirectChats(societyId, userId) {
    // Return list of admins for resident, or all residents who messaged admin for admin
    const userMem = await Membership.findOne({ societyId, userId, isActive: true }).lean();
    const isAdmin = userMem && ["super_admin", "society_admin"].includes(userMem.role);
    if (isAdmin) {
      // Admin sees all direct chats where they are participant
      const msgs = await DirectMessage.aggregate([
        { $match: { societyId: userMem.societyId, isActive: true, $or: [{ senderId: userId }, { receiverId: userId }] } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: { $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"] }, lastText: { $first: "$text" }, lastAt: { $first: "$createdAt" } } },
      ]);
      // Need to populate names
      const otherIds = msgs.map((m) => m._id);
      if (otherIds.length === 0) return [];
      const users = await require("../user/user.model").User.find({ _id: { $in: otherIds } }).select("name").lean();
      const nameMap = new Map(users.map((u) => [String(u._id), u.name]));
      return msgs.map((m) => ({ userId: m._id, name: nameMap.get(String(m._id)) || "Resident", lastText: m.lastText, lastAt: m.lastAt }));
    } else {
      // Resident sees only admins
      return this.listAdmins(societyId);
    }
  }
}

module.exports = new ChatService();
