const { z } = require("zod");

const createAmenitySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional().default(""),
  category: z.string().trim().optional().default("general"),
  type: z.enum(["free", "paid"]).optional().default("free"),
  capacity: z.coerce.number().int().min(1).max(100).optional().default(1),
  price: z.coerce.number().min(0).optional().default(0),
  bookingMode: z.enum(["slot", "full_day"]).optional().default("slot"),
  slots: z.array(z.string().trim().min(1)).min(1, "At least one slot required").optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
});

const updateAmenitySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().optional(),
  type: z.enum(["free", "paid"]).optional(),
  capacity: z.coerce.number().int().min(1).max(100).optional(),
  price: z.coerce.number().min(0).optional(),
  bookingMode: z.enum(["slot", "full_day"]).optional(),
  slots: z.array(z.string().trim().min(1)).min(1).optional(),
  isActive: z.boolean().optional(),
});

const bookAmenitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  slot: z.string().trim().min(1, "Slot is required").optional().default("full_day"),
});

module.exports = { createAmenitySchema, updateAmenitySchema, bookAmenitySchema };
