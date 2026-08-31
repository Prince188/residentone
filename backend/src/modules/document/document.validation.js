const { z } = require("zod");

const DOCUMENT_CATEGORIES = ["bill", "collection", "expense", "navratri", "other"];

const createDocumentSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
  category: z.enum(DOCUMENT_CATEGORIES).optional().default("other"),
  description: z.string().trim().max(500).optional().default(""),
});

module.exports = { createDocumentSchema, DOCUMENT_CATEGORIES };
