const { z } = require("zod");

const createNoticeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title cannot exceed 150 characters"),
  body: z
    .string()
    .trim()
    .min(5, "Body must be at least 5 characters")
    .max(2000, "Body cannot exceed 2000 characters"),
});

module.exports = { createNoticeSchema };
