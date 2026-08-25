const { z } = require("zod");

const createCycleSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce
    .number()
    .int()
    .min(2020, "Year must be 2020 or later")
    .max(2100),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  dueDate: z.coerce.date(),
});

const paySchema = z.object({
  paidOn: z.coerce.date().optional(),
  method: z.enum(["UPI", "Cash", "Bank Transfer", "Other"]).optional(),
});

module.exports = { createCycleSchema, paySchema };
