const { z } = require("zod");

const createCycleSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce
    .number()
    .int()
    .min(2020, "Year must be 2020 or later")
    .max(2100),
  // Keep amount for backward compat, but also support owner/renter split
  amount: z.coerce.number().positive().optional(),
  ownerAmount: z.coerce.number().min(0, "Owner amount cannot be negative").optional(),
  renterAmount: z.coerce.number().min(0, "Renter amount cannot be negative").optional(),
  dueDate: z.coerce.date(),
}).superRefine((data, ctx) => {
  const hasOwner = data.ownerAmount !== undefined && data.ownerAmount !== null;
  const hasRenter = data.renterAmount !== undefined && data.renterAmount !== null;
  const hasAmount = data.amount !== undefined && data.amount !== null;
  if (!hasOwner && !hasRenter && !hasAmount) {
    ctx.addIssue({ code: "custom", message: "Provide amount or ownerAmount/renterAmount", path: ["amount"] });
  }
  if (hasAmount && !hasOwner && !hasRenter) {
    // ok - old single amount
  }
  if ((hasOwner && data.ownerAmount <= 0) || (hasRenter && data.renterAmount !== undefined && data.renterAmount < 0)) {
    // validated by zod min
  }
});

const paySchema = z.object({
  paidOn: z.coerce.date().optional(),
  method: z.enum(["UPI", "Cash", "Bank Transfer", "Other", "Razorpay"]).optional(),
});

module.exports = { createCycleSchema, paySchema };
