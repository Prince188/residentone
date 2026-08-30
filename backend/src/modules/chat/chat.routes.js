const express = require("express");
const chatController = require("./chat.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createGroupSchema, sendGroupMessageSchema, sendDirectMessageSchema, reactionSchema, pinSchema } = require("./chat.validation");
const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// Groups - all members can list and read/ send in their groups
router.get("/groups", (req, res, next) => chatController.listGroups(req, res, next));
router.get("/groups/:groupId/messages", (req, res, next) => chatController.getMessages(req, res, next));
router.post("/groups/:groupId/messages", validate(sendGroupMessageSchema), (req, res, next) => chatController.sendMessage(req, res, next));
router.delete("/groups/:groupId/messages/:messageId", (req, res, next) => chatController.deleteGroupMessage(req, res, next));
router.post("/groups/:groupId/messages/:messageId/react", validate(reactionSchema), (req, res, next) => chatController.reactGroupMessage(req, res, next));
router.post("/groups/:groupId/pin", validate(pinSchema), requirePermission("manage_amenities"), (req, res, next) => chatController.pinGroupMessage(req, res, next));
router.get("/groups/:groupId/pinned", (req, res, next) => chatController.getPinned(req, res, next));

// Create group - permission-based: manage_amenities (chat admin via Manage Permissions)
router.post("/groups", requirePermission("manage_amenities"), validate(createGroupSchema), (req, res, next) => chatController.createGroup(req, res, next));
router.post("/groups/:groupId/members", requirePermission("manage_amenities"), (req, res, next) => chatController.addMembers(req, res, next));
router.post("/groups/:groupId/members/remove", requirePermission("manage_amenities"), (req, res, next) => chatController.removeMembers(req, res, next));
router.get("/groups/:groupId/info", (req, res, next) => chatController.getGroupInfo(req, res, next));
router.post("/groups/:groupId/leave", (req, res, next) => chatController.leaveGroup(req, res, next));

// Direct admin chat
router.get("/direct/admins", (req, res, next) => chatController.listAdmins(req, res, next));
router.get("/direct/list", (req, res, next) => chatController.listDirectChats(req, res, next));
router.post("/direct/messages", validate(sendDirectMessageSchema), (req, res, next) => chatController.sendDirect(req, res, next));
router.get("/direct/:userId/messages", (req, res, next) => chatController.getDirectMessages(req, res, next));
router.delete("/direct/messages/:messageId", (req, res, next) => chatController.deleteDirectMessage(req, res, next));
router.post("/direct/messages/:messageId/react", validate(reactionSchema), (req, res, next) => chatController.reactDirectMessage(req, res, next));

module.exports = router;
