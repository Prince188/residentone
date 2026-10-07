const { z } = require("zod");

const createDocumentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  category: z.string().optional().default("general"),
  description: z.string().trim().max(1000).optional().default(""),
});

module.exports = { createDocumentSchema };
