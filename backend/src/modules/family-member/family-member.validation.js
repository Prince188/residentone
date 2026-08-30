const { z } = require("zod");
const { FAMILY_ROLES } = require("./family-member.model");

const createFamilyMemberSchema = z.object({
  unitId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  relation: z.enum(FAMILY_ROLES).optional().default("other"),
  phone: z.string().trim().optional().default(""),
});

const updateFamilyMemberSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  relation: z.enum(FAMILY_ROLES).optional(),
  phone: z.string().trim().optional(),
});

module.exports = { createFamilyMemberSchema, updateFamilyMemberSchema };
