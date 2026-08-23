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
});

const inviteLinkSchema = z.object({}).passthrough();

const inviteSubmitSchema = assignOwnerSchema;

module.exports = {
  checkOwnerSchema,
  assignOwnerSchema,
  inviteLinkSchema,
  inviteSubmitSchema,
};
