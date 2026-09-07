const { z } = require("zod");
const { FAMILY_ROLES } = require("./family-member.model");

const relationSchema = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase())
  .refine((v) => FAMILY_ROLES.includes(v), {
    message: `Relation must be one of: ${FAMILY_ROLES.join(", ")}`,
  });

const createFamilyMemberSchema = z.object({
  unitId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  relation: relationSchema.optional().default("other"),
  phone: z.string().trim().optional().default(""),
  occupation: z.string().trim().max(100, "Occupation cannot exceed 100 characters").optional().default(""),
});

const updateFamilyMemberSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  relation: relationSchema.optional(),
  phone: z.string().trim().optional(),
  occupation: z.string().trim().max(100, "Occupation cannot exceed 100 characters").optional(),
});

module.exports = { createFamilyMemberSchema, updateFamilyMemberSchema };
