const { z } = require("zod");

const phoneSchema = z
  .string()
  .trim()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number cannot exceed 15 digits")
  .regex(/^[0-9+\-\s]+$/, "Phone number can only contain digits");

const checkOwnerSchema = z.object({
  phone: phoneSchema,
});

const vehicleSchema = z
  .string()
  .trim()
  .min(2, "Vehicle number must be at least 2 characters")
  .max(15, "Vehicle number cannot exceed 15 characters")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9 -]*$/,
    "Vehicle number can only contain letters, digits and dashes"
  )
  .transform((v) => v.toUpperCase());

const assignOwnerSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Name cannot exceed 100 characters")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  phone: phoneSchema,
  email: z
    .union([z.literal(""), z.string().email("Invalid email address")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  residentType: z.enum(["owner", "renter"]).default("owner"),
  vehicles: z.array(vehicleSchema).max(10, "Cannot add more than 10 vehicles").optional(),
  occupation: z
    .string()
    .trim()
    .max(100, "Occupation cannot exceed 100 characters")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  familyMembers: z.coerce
    .number()
    .int("Family members must be a whole number")
    .min(0, "Family members cannot be negative")
    .max(50, "Family members cannot exceed 50")
    .optional(),
});

const inviteLinkSchema = z.object({
  residentType: z.enum(["owner", "renter"]).default("owner"),
});

const inviteSubmitSchema = assignOwnerSchema;

const updateUnitSchema = z.object({
  label: z.string().trim().min(1, "House number is required").max(30).optional(),
  block: z.string().trim().max(30).optional().nullable(),
  floor: z.coerce.number().int().min(-5).max(200).optional().nullable(),
  doorNo: z.string().trim().max(20).optional().nullable(),
  propertyType: z.enum(["flat", "row_house", "villa", "plot", "shop", "office", "penthouse", "studio"]).optional(),
});

module.exports = {
  checkOwnerSchema,
  assignOwnerSchema,
  inviteLinkSchema,
  inviteSubmitSchema,
  updateUnitSchema,
};
