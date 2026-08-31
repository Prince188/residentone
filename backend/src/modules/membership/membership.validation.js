const { z } = require("zod");
const { SOCIETY_ROLES } = require("../../shared/types");

const addMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(SOCIETY_ROLES, { errorMap: () => ({ message: "Invalid role" }) }),
  unitIds: z.array(z.string()).optional(),
  assignedWings: z.array(z.string().min(1).max(10)).optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(SOCIETY_ROLES, { errorMap: () => ({ message: "Invalid role" }) }),
  assignedWings: z.array(z.string().min(1).max(10)).optional(),
});

module.exports = { addMemberSchema, updateRoleSchema };
