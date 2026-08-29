const { z } = require("zod");

const createGroupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name cannot exceed 80 characters"),
  description: z.string().trim().max(300).optional().default(""),
  memberIds: z.array(z.string().min(1)).min(1, "Add at least 1 member").max(200),
});

const sendGroupMessageSchema = z.object({
  text: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message cannot exceed 2000 characters"),
  replyTo: z.string().optional().nullable(),
});

const sendDirectMessageSchema = z.object({
  receiverId: z.string().min(1, "Receiver is required"),
  text: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message cannot exceed 2000 characters"),
  replyTo: z.string().optional().nullable(),
});

const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(10),
});

const pinSchema = z.object({
  messageId: z.string().min(1),
});

module.exports = { createGroupSchema, sendGroupMessageSchema, sendDirectMessageSchema, reactionSchema, pinSchema };
