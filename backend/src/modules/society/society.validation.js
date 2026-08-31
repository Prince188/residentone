const { z } = require("zod");
const { SOCIETY_TYPES } = require("../../shared/types");

const pincodeSchema = z
  .string()
  .regex(/^\d{6}$/, "Pincode must be a valid 6-digit code");

const phoneSchema = z
  .string()
  .regex(/^[+\d][\d\s-]{6,14}$/, "Enter a valid mobile number");

const registrationBaseSchema = z.object({
  societyName: z.string().min(1, "Society name is required").max(200),
  societyType: z.enum(SOCIETY_TYPES).default("apartment"),
  address: z.string().min(1, "Address is required").max(300),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  pincode: pincodeSchema,
  totalUnits: z.coerce
    .number()
    .int("Number of units must be a whole number")
    .min(1, "Number of units must be at least 1")
    .max(100000, "Number of units cannot exceed 100000"),
  contactName: z.string().min(1, "Contact person name is required").max(100),
  contactMobile: phoneSchema,
  contactEmail: z.string().email("Invalid email address"),
});

const structureWingSchema = z.object({
  name: z.string().min(1).max(10),
  floors: z.coerce.number().int().min(1).max(100),
  hasGround: z.boolean().optional().default(false),
  groundFlats: z.coerce.number().int().min(0).max(50).optional(),
  defaultPerFloor: z.coerce.number().int().min(0).max(50).optional(),
  numberingMode: z.enum(["sequential", "floor_based"]).optional(),
  perFloorMap: z.record(z.coerce.number().int().min(0).max(50)).optional(),
});

const structureSchema = z.object({
  wings: z.array(structureWingSchema).min(1).max(26),
  numberingMode: z.enum(["sequential", "floor_based"]).optional(),
}).optional();

const publicRegistrationSchema = registrationBaseSchema.extend({
  structure: structureSchema,
});

const manualCreateSchema = registrationBaseSchema.extend({
  structure: structureSchema,
});

const updateSocietySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  societyType: z.enum(SOCIETY_TYPES).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  pincode: pincodeSchema.optional(),
  totalUnits: z.coerce.number().int().min(1).optional(),
  contactPersonName: z.string().min(1).max(100).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: phoneSchema.optional(),
});
const rejectSocietySchema = z.object({
  reason: z
    .string()
    .min(3, "Rejection reason is required")
    .max(500, "Rejection reason cannot exceed 500 characters"),
});

const updatePermissionsSchema = z.object({
  permissions: z.record(z.array(z.string())),
});

module.exports = {
  publicRegistrationSchema,
  manualCreateSchema,
  updateSocietySchema,
  rejectSocietySchema,
  updatePermissionsSchema,
};
