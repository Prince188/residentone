const { z } = require("zod");
const { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES, COMPLAINT_STATUSES } = require("./complaint.model");

const createComplaintSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title cannot exceed 150 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  category: z.enum(COMPLAINT_CATEGORIES).optional().default("other"),
  priority: z.enum(COMPLAINT_PRIORITIES).optional().default("medium"),
  isPublic: z.boolean().optional().default(false),
  unitId: z.string().optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES),
});

const assignComplaintSchema = z.object({
  assignedTo: z.string().min(1, "Assigned user is required").nullable(),
});

const listQuerySchema = z.object({
  status: z.enum(COMPLAINT_STATUSES).optional(),
  category: z.enum(COMPLAINT_CATEGORIES).optional(),
  priority: z.enum(COMPLAINT_PRIORITIES).optional(),
  q: z.string().optional(),
  isPublic: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

module.exports = {
  createComplaintSchema,
  updateStatusSchema,
  assignComplaintSchema,
  listQuerySchema,
};
