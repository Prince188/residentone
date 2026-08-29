const chatService = require("./chat.service");

class ChatController {
  async createGroup(req, res, next) {
    try {
      const group = await chatService.createGroup(req.societyId, req.userId, req.body);
      res.status(201).json({ success: true, data: { id: group._id, name: group.name, members: group.members } });
    } catch (error) {
      next(error);
    }
  }

  async listGroups(req, res, next) {
    try {
      const groups = await chatService.listGroups(req.societyId, req.userId);
      res.json({ success: true, data: groups });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const messages = await chatService.getGroupMessages(req.societyId, req.params.groupId, req.userId, limit);
      res.json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const msg = await chatService.sendGroupMessage(req.societyId, req.params.groupId, req.userId, req.body.text, req.body.replyTo || null);
      res.status(201).json({ success: true, data: { id: msg._id, text: msg.text, createdAt: msg.createdAt } });
    } catch (error) {
      next(error);
    }
  }

  async addMembers(req, res, next) {
    try {
      const group = await chatService.addMembers(req.societyId, req.params.groupId, req.userId, req.body.memberIds || []);
      res.json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  }

  async removeMembers(req, res, next) {
    try {
      const group = await chatService.removeMembers(req.societyId, req.params.groupId, req.userId, req.body.memberIds || []);
      res.json({ success: true, data: group });
    } catch (error) {
      next(error);
    }
  }

  async getGroupInfo(req, res, next) {
    try {
      const info = await chatService.getGroupInfo(req.societyId, req.params.groupId, req.userId);
      res.json({ success: true, data: info });
    } catch (error) {
      next(error);
    }
  }

  async leaveGroup(req, res, next) {
    try {
      await chatService.leaveGroup(req.societyId, req.params.groupId, req.userId);
      res.json({ success: true, data: { message: "Left group" } });
    } catch (error) {
      next(error);
    }
  }

  async listAdmins(req, res, next) {
    try {
      const admins = await chatService.listAdmins(req.societyId);
      res.json({ success: true, data: admins });
    } catch (error) {
      next(error);
    }
  }

  async sendDirect(req, res, next) {
    try {
      const msg = await chatService.sendDirectMessage(req.societyId, req.userId, req.body.receiverId, req.body.text, req.body.replyTo || null);
      res.status(201).json({ success: true, data: { id: msg._id, text: msg.text } });
    } catch (error) {
      next(error);
    }
  }

  async getDirectMessages(req, res, next) {
    try {
      const otherId = req.params.userId;
      const msgs = await chatService.getDirectMessages(req.societyId, req.userId, otherId);
      res.json({ success: true, data: msgs });
    } catch (error) {
      next(error);
    }
  }

  async listDirectChats(req, res, next) {
    try {
      const chats = await chatService.listDirectChats(req.societyId, req.userId);
      res.json({ success: true, data: chats });
    } catch (error) {
      next(error);
    }
  }

  async deleteGroupMessage(req, res, next) {
    try {
      await chatService.deleteGroupMessage(req.societyId, req.params.groupId, req.params.messageId, req.userId);
      res.json({ success: true, data: { message: "Deleted" } });
    } catch (error) { next(error); }
  }

  async reactGroupMessage(req, res, next) {
    try {
      await chatService.reactGroupMessage(req.societyId, req.params.groupId, req.params.messageId, req.userId, req.body.emoji);
      res.json({ success: true, data: { message: "Reacted" } });
    } catch (error) { next(error); }
  }

  async pinGroupMessage(req, res, next) {
    try {
      const group = await chatService.pinGroupMessage(req.societyId, req.params.groupId, req.body.messageId, req.userId);
      res.json({ success: true, data: group });
    } catch (error) { next(error); }
  }

  async getPinned(req, res, next) {
    try {
      const pinned = await chatService.getPinnedMessage(req.societyId, req.params.groupId);
      res.json({ success: true, data: pinned });
    } catch (error) { next(error); }
  }

  async deleteDirectMessage(req, res, next) {
    try {
      await chatService.deleteDirectMessage(req.societyId, req.params.messageId, req.userId);
      res.json({ success: true, data: { message: "Deleted" } });
    } catch (error) { next(error); }
  }

  async reactDirectMessage(req, res, next) {
    try {
      await chatService.reactDirectMessage(req.societyId, req.params.messageId, req.userId, req.body.emoji);
      res.json({ success: true, data: { message: "Reacted" } });
    } catch (error) { next(error); }
  }
}

module.exports = new ChatController();
