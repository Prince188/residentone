const { z } = require("zod");

const COLLECTION_CATEGORIES = ["festival", "event", "celebration", "repair", "welfare", "other"];

const createCollectionSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().trim().max(1000).optional().default(""),
  category: z.enum(COLLECTION_CATEGORIES).optional().default("festival"),
  amount: z.coerce.number().min(1, "Amount must be at least ₹1").max(1000000),
  dueDate: z.coerce.date({ message: "Invalid due date" }),
});

const payCollectionSchema = z.object({
  method: z.string().trim().max(50).optional().default("Cash"),
  paidOn: z.coerce.date().optional(),
});

module.exports = { createCollectionSchema, payCollectionSchema, COLLECTION_CATEGORIES };
