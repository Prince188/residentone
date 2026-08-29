const { z } = require("zod");

const questionSchema = z.object({
  text: z.string().trim().min(5, "Question must be at least 5 characters").max(300),
  type: z.enum(["single", "multiple", "text", "rating"]),
  options: z.array(z.string().trim().min(1).max(100)).optional().default([]),
}).superRefine((q, ctx) => {
  if ((q.type === "text" || q.type === "rating") && q.options && q.options.length > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Text/Rating question must have no options", path: ["options"] });
  }
  if ((q.type === "single" || q.type === "multiple") && (!q.options || q.options.length < 2 || q.options.length > 4)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choice questions need 2-4 options", path: ["options"] });
  }
  if ((q.type === "single" || q.type === "multiple") && q.options) {
    const lower = q.options.map((o) => o.trim().toLowerCase());
    if (new Set(lower).size !== lower.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Options must be unique", path: ["options"] });
    }
  }
});

const createSurveySchema = z.object({
  title: z.string().trim().min(5).max(150),
  description: z.string().trim().max(500).optional().default(""),
  endDate: z.string().refine((v) => !isNaN(Date.parse(v)), { message: "Invalid end date" }).refine((v) => new Date(v) > new Date(), { message: "End date must be in future" }),
  questions: z.array(questionSchema).min(1, "At least 1 question").max(10, "Max 10 questions"),
});

const submitSurveySchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1),
    selectedOptions: z.array(z.number().int().min(0).max(10)).optional().default([]),
    textAnswer: z.string().trim().max(500).optional().default(""),
    rating: z.number().int().min(1).max(5).optional(),
  })).min(1),
});

module.exports = { createSurveySchema, submitSurveySchema };
