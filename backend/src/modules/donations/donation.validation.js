const { z } = require("zod");

const createDonationSchema = z.object({
  unitId: z.string().min(1, "House is required"),
  amount: z.coerce.number().min(1, "Amount must be at least ₹1").max(1000000, "Amount too large"),
  purpose: z.string().trim().min(3, "Purpose must be at least 3 characters").max(500, "Purpose cannot exceed 500 characters"),
  event: z.string().trim().max(100, "Event cannot exceed 100 characters").optional().default(""),
  collectedAt: z.coerce.date({ message: "Invalid date" }).refine((d) => d <= new Date(), { message: "Date cannot be in the future" }),
  // legacy alias for frontend that sends dueDate or date
  dueDate: z.coerce.date().optional(),
  date: z.coerce.date().optional(),
});

module.exports = { createDonationSchema };
