const { z } = require("zod");
const { SOCIETY_ROLES } = require("../../shared/types");

const addMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(SOCIETY_ROLES, { errorMap: () => ({ message: "Invalid role" }) }),
  unitIds: z.array(z.string()).optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(SOCIETY_ROLES, { errorMap: () => ({ message: "Invalid role" }) }),
});

module.exports = { addMemberSchema, updateRoleSchema };
