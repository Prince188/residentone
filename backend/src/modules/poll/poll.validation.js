const { z } = require("zod");

const createPollSchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, "Question must be at least 5 characters")
    .max(500, "Question cannot exceed 500 characters"),
  options: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Option cannot be empty")
        .max(200, "Option cannot exceed 200 characters")
    )
    .min(2, "At least 2 options required")
    .max(4, "Maximum 4 options allowed")
    .refine((arr) => new Set(arr.map((o) => o.trim().toLowerCase())).size === arr.length, {
      message: "Options must be unique",
    }),
  type: z.enum(["open", "secret"]).default("open").optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" })
    .refine((val) => new Date(val) > new Date(), { message: "End date must be in future" }),
});

const votePollSchema = z.object({
  selectedOptionIndex: z.number().int().min(0).max(3),
});

module.exports = { createPollSchema, votePollSchema };
