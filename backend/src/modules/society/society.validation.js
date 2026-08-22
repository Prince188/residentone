const { z } = require("zod");

const createSocietySchema = z.object({
  name: z.string().min(1, "Society name is required").max(200),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(1, "Pincode is required"),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

const updateSocietySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  pincode: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

module.exports = { createSocietySchema, updateSocietySchema };
