const { ChatGroup, ChatMessage, DirectMessage, ChatRead } = require("./chat.model");
const { Membership } = require("../membership/membership.model");
const { AppError } = require("../../shared/utils/errors");
const { Society } = require("../society/society.model");
const { hasPermission } = require("../../shared/permissions");

async function hasChatAdminPermission(societyId, role) {
  if (["super_admin", "society_admin"].includes(role)) return true;
  try {
    const society = await Society.findById(societyId).select("rolePermissions").lean();
    return hasPermission(role, "manage_amenities", society?.rolePermissions);
  } catch {
    return false;
  }
}

class ChatService {
  async isAdmin(societyId, userId) {
    const membership = await Membership.findOne({ societyId, userId, isActive: true }).lean();
    if (!membership) return false;
    const roles = [membership.role, ...(membership.additionalRoles || [])];
    if (roles.includes("super_admin") || roles.includes("society_admin")) return true;
    for (const r of roles) {
      if (await hasChatAdminPermission(societyId, r)) return true;
    }
    return false;
  }

  async ensureMember(societyId, groupId, userId) {
    const group = await ChatGroup.findOne({ _id: groupId, societyId, isActive: true }).lean();
    if (!group) throw new AppError("Group not found", 404);
    const isMember = group.members.some((m) => String(m) === String(userId));
    if (!isMember) throw new AppError("You are not a member of this group", 403);
    return group;
  }

  async createGroup(societyId, adminId, data) {
    const mongoose = require("mongoose");
    const rawIds = [...new Set((data.memberIds || []).map(String))];
    if (!rawIds.includes(String(adminId))) rawIds.push(String(adminId));

    const memberIds = [];
    const fmIds = [];
    for (const id of rawIds) {
      if (id.startsWith("fm-")) {
        fmIds.push(id.replace(/^fm-/, ""));
      } else if (mongoose.Types.ObjectId.isValid(id)) {
        memberIds.push(id);
      }
    }

    if (fmIds.length > 0) {
      try {
        const { FamilyMember } = require("../family-member/family-member.model");
        const fms = await FamilyMember.find({ _id: { $in: fmIds }, isActive: true }).select("phone addedBy").lean();
        const { User } = require("../user/user.model");
        for (const fm of fms) {
          let foundUserId = null;
          if (fm.phone) {
            const u = await User.findOne({ phone: fm.phone }).select("_id").lean();
            if (u) foundUserId = String(u._id);
          }
          if (!foundUserId && fm.addedBy) {
            foundUserId = String(fm.addedBy);
          }
          if (foundUserId && !memberIds.includes(foundUserId)) {
            memberIds.push(foundUserId);
          }
        }
      } catch (_) {}
    }

    const memberships = await Membership.find({ societyId, userId: { $in: memberIds }, isActive: true }).lean();
    const validUserIds = new Set(memberships.map((m) => String(m.userId)));
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

  async updateGroup(societyId, groupId, adminId, data) {
    const isAdmin = await this.isAdmin(societyId, adminId);
    if (!isAdmin) throw new AppError("Only society admins can edit group details", 403);
    const group = await ChatGroup.findOne({ _id: groupId, societyId, isActive: true });
    if (!group) throw new AppError("Group not found", 404);
    if (data.name !== undefined) group.name = data.name.trim();
    if (data.description !== undefined) group.description = (data.description || "").trim();
    await group.save();
    try {
      const socketHelper = require("../../socket");
      socketHelper.emitToSociety(String(societyId), "chat:change", { groupId: group._id, action: "update" });
    } catch (_) {}
    return group;
  }

  async deleteGroup(societyId, groupId, adminId) {
    const group = await ChatGroup.findOne({ _id: groupId, societyId, isActive: true });
    if (!group) throw new AppError("Group not found", 404);
    const isAdmin = await this.isAdmin(societyId, adminId);
    const isCreator = String(group.createdBy) === String(adminId);
    if (!isAdmin && !isCreator) throw new AppError("Only society admins or group creator can delete group channels", 403);
    group.isActive = false;
    await group.save();
    try {
      const socketHelper = require("../../socket");
      socketHelper.emitToSociety(String(societyId), "chat:change", { groupId: group._id, action: "delete" });
    } catch (_) {}
    return { id: group._id, deleted: true };
  }

  async listGroups(societyId, userId) {
    const groups = await ChatGroup.find({ societyId, members: userId, isActive: true })
      .populate("createdBy", "name")
      .populate("members", "name")
      .sort({ updatedAt: -1 })
      .lean();

    const mongoose = require("mongoose");
    const sObjectId = mongoose.Types.ObjectId.isValid(societyId) ? new mongoose.Types.ObjectId(societyId) : societyId;
    const uObjectId = (userId && mongoose.Types.ObjectId.isValid(userId)) ? new mongoose.Types.ObjectId(userId) : userId;

    // Attach last message preview
    const groupIds = groups.map((g) => g._id);
    const lastMessages = groupIds.length
      ? await ChatMessage.aggregate([
          { $match: { societyId: sObjectId, groupId: { $in: groupIds }, isActive: true } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: "$groupId", lastText: { $first: "$text" }, lastAt: { $first: "$createdAt" } } },
        ])
      : [];
    const lastMap = new Map(lastMessages.map((m) => [String(m._id), m]));

    // Query user read markers
    const readDocs = (groupIds.length && uObjectId)
      ? await ChatRead.find({ societyId: sObjectId, userId: uObjectId, groupId: { $in: groupIds } }).lean()
      : [];
    const readMap = new Map(readDocs.map((r) => [String(r.groupId), r.lastReadAt]));

    // Calculate unread count per group
    const unreadCounts = await Promise.all(
      groups.map(async (g) => {
        const gid = String(g._id);
        const lastRead = readMap.get(gid);
        const gObjectId = mongoose.Types.ObjectId.isValid(g._id) ? new mongoose.Types.ObjectId(g._id) : g._id;
        const query = {
          societyId: sObjectId,
          groupId: gObjectId,
          isActive: true,
        };
        if (uObjectId) {
          query.senderId = { $ne: uObjectId };
        }
        if (lastRead) {
          query.createdAt = { $gt: lastRead };
        }
        const count = await ChatMessage.countDocuments(query);
        return [gid, count];
      })
    );
    const unreadMap = new Map(unreadCounts);

    return groups.map((g) => ({
      id: g._id,
      name: g.name,
      description: g.description,
      memberCount: (g.members || []).length,
      createdByName: g.createdBy?.name || "Admin",
      updatedAt: g.updatedAt,
      lastMessage: lastMap.get(String(g._id))?.lastText || null,
      lastAt: lastMap.get(String(g._id))?.lastAt || g.updatedAt,
      unreadCount: unreadMap.get(String(g._id)) || 0,
    }));
  }

  async getGroupMessages(societyId, groupId, userId, limit = 50) {
    await this.ensureMember(societyId, groupId, userId);
    // Mark group messages as read up to current timestamp
    try {
      const mongoose = require("mongoose");
      const sId = mongoose.Types.ObjectId.isValid(societyId) ? new mongoose.Types.ObjectId(societyId) : societyId;
      const uId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
      const gId = mongoose.Types.ObjectId.isValid(groupId) ? new mongoose.Types.ObjectId(groupId) : groupId;
      await ChatRead.updateOne(
        { societyId: sId, userId: uId, groupId: gId },
        { $set: { lastReadAt: new Date() } },
        { upsert: true }
      );
    } catch (_) {}
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

    // Populate sender names and society flat numbers from User and Membership models
    const senderIds = messages.map((m) => m.senderId?._id || m.senderId).filter(Boolean);
    const [senderUsers, senderMems] = await Promise.all([
      require("../user/user.model").User.find({ _id: { $in: senderIds } }).select("name").lean(),
      require("../membership/membership.model").Membership.find({ societyId, userId: { $in: senderIds }, isActive: true }).select("userId flat houseNumber").lean(),
    ]);
    const senderUserMap = new Map(senderUsers.map((u) => [String(u._id), u.name]));
    const senderFlatMap = new Map(senderMems.map((m) => [String(m.userId), m.flat || m.houseNumber || ""]));

    return messages.map((m) => {
      const sId = String(m.senderId?._id || m.senderId);
      const name = (typeof m.senderId === "object" && m.senderId?.name) ? m.senderId.name : (senderUserMap.get(sId) || "Resident");
      const flat = senderFlatMap.get(sId) || "";
      return {
        id: m._id,
        text: m.isDeleted ? "This message was deleted" : m.text,
        senderId: sId,
        senderName: name,
        senderFlat: flat,
        name,
        flat,
        createdAt: m.createdAt,
        isDeleted: m.isDeleted,
        replyTo: m.replyTo ? { id: m.replyTo._id, text: m.isDeleted ? "" : m.replyTo.text, senderName: replyNames[String(m.replyTo.senderId)] || "Member" } : null,
        reactions: m.reactions || [],
        isPinned: String(group?.pinnedMessageId) === String(m._id),
      };
    });
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
    const mongoose = require("mongoose");
    const rawIds = [...new Set((memberIds || []).map(String))];
    const ids = [];
    const fmIds = [];
    for (const id of rawIds) {
      if (id.startsWith("fm-")) {
        fmIds.push(id.replace(/^fm-/, ""));
      } else if (mongoose.Types.ObjectId.isValid(id)) {
        ids.push(id);
      }
    }

    if (fmIds.length > 0) {
      try {
        const { FamilyMember } = require("../family-member/family-member.model");
        const fms = await FamilyMember.find({ _id: { $in: fmIds }, isActive: true }).select("phone addedBy").lean();
        const { User } = require("../user/user.model");
        for (const fm of fms) {
          let foundUserId = null;
          if (fm.phone) {
            const u = await User.findOne({ phone: fm.phone }).select("_id").lean();
            if (u) foundUserId = String(u._id);
          }
          if (!foundUserId && fm.addedBy) {
            foundUserId = String(fm.addedBy);
          }
          if (foundUserId && !ids.includes(foundUserId)) {
            ids.push(foundUserId);
          }
        }
      } catch (_) {}
    }

    const memberships = await Membership.find({ societyId, userId: { $in: ids }, isActive: true }).lean();
    const valid = memberships.map((m) => String(m.userId));
    if (valid.length > 0) {
      await ChatGroup.updateOne({ _id: groupId }, { $addToSet: { members: { $each: valid } } });
    }
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

  // Direct 1-on-1 chat between society members
  async sendDirectMessage(societyId, senderId, receiverId, text, replyTo = null) {
    if (String(senderId) === String(receiverId)) throw new AppError("Cannot message yourself", 400);
    const [senderMem, receiverMem] = await Promise.all([
      Membership.findOne({ societyId, userId: senderId, isActive: true }).lean(),
      Membership.findOne({ societyId, userId: receiverId, isActive: true }).lean(),
    ]);
    if (!senderMem) throw new AppError("Sender is not a society member", 403);
    if (!receiverMem) throw new AppError("Receiver is not a society member", 404);
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
    if (!userMem) throw new AppError("You are not a society member", 403);
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

  async listAdmins(societyId, userId = null) {
    const allMemberships = await Membership.find({ societyId, isActive: true }).populate("userId", "name").lean();
    const society = await Society.findById(societyId).select("rolePermissions").lean();
    const admins = allMemberships.filter((m) => hasPermission(m.role, "manage_amenities", society?.rolePermissions) || ["super_admin", "society_admin"].includes(m.role));
    // Fallback: if no one has manage_amenities, still return super_admin/society_admin
    const result = admins.length ? admins : allMemberships.filter((m) => ["super_admin", "society_admin"].includes(m.role));

    let unreadMap = new Map();
    if (userId) {
      const mongoose = require("mongoose");
      const unreadFromAdmins = await DirectMessage.aggregate([
        {
          $match: {
            societyId: new mongoose.Types.ObjectId(societyId),
            receiverId: new mongoose.Types.ObjectId(userId),
            isRead: false,
            isActive: true,
          },
        },
        {
          $group: {
            _id: "$senderId",
            unreadCount: { $sum: 1 },
          },
        },
      ]);
      unreadMap = new Map(unreadFromAdmins.map((u) => [String(u._id), u.unreadCount]));
    }

    return result.map((m) => ({
      id: m.userId._id,
      name: m.userId.name,
      role: m.role,
      unreadCount: unreadMap.get(String(m.userId._id)) || 0,
    }));
  }

  async getPinnedMessage(societyId, groupId) {
    const group = await ChatGroup.findOne({ _id: groupId, societyId }).select("pinnedMessageId").lean();
    if (!group?.pinnedMessageId) return null;
    const msg = await ChatMessage.findOne({ _id: group.pinnedMessageId, societyId }).populate("senderId", "name").lean();
    if (!msg) return null;
    return { id: msg._id, text: msg.text, senderName: msg.senderId?.name || "Admin" };
  }

  async listDirectChats(societyId, userId) {
    const mongoose = require("mongoose");
    const uObjectId = new mongoose.Types.ObjectId(userId);
    const sObjectId = new mongoose.Types.ObjectId(societyId);

    // Find all direct message conversations where this user participated
    const msgs = await DirectMessage.aggregate([
      {
        $match: {
          societyId: sObjectId,
          isActive: true,
          $or: [
            { senderId: uObjectId },
            { receiverId: uObjectId },
            { senderId: String(userId) },
            { receiverId: String(userId) },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $or: [{ $eq: ["$senderId", uObjectId] }, { $eq: ["$senderId", String(userId)] }] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastText: { $first: "$text" },
          lastAt: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $or: [{ $eq: ["$receiverId", uObjectId] }, { $eq: ["$receiverId", String(userId)] }] },
                    { $eq: ["$isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastAt: -1 } },
    ]);

    const otherIds = msgs.map((m) => m._id);
    if (otherIds.length === 0) return [];

    const [users, memberships] = await Promise.all([
      require("../user/user.model").User.find({ _id: { $in: otherIds } }).select("name phone").lean(),
      require("../membership/membership.model").Membership.find({ societyId: sObjectId, userId: { $in: otherIds }, isActive: true }).select("userId role flat houseNumber").lean(),
    ]);

    const nameMap = new Map(users.map((u) => [String(u._id), u.name]));
    const memMap = new Map(memberships.map((m) => [String(m.userId), m]));

    return msgs.map((m) => {
      const otherIdStr = String(m._id);
      const mem = memMap.get(otherIdStr);
      return {
        userId: m._id,
        id: m._id,
        name: nameMap.get(otherIdStr) || "Resident",
        role: mem?.role || "Resident",
        flat: mem?.flat || mem?.houseNumber || "",
        lastText: m.lastText,
        lastAt: m.lastAt,
        unreadCount: m.unreadCount || 0,
      };
    });
  }
}

module.exports = new ChatService();
