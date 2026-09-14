const { z } = require("zod");
const { SOCIETY_ROLES } = require("../../shared/types");

const addMemberSchema = z
  .object({
    userId: z.string().min(1, "User ID is required"),
    role: z.enum(SOCIETY_ROLES, { errorMap: () => ({ message: "Invalid role" }) }).optional(),
    roles: z.array(z.enum(SOCIETY_ROLES)).optional(),
    unitIds: z.array(z.string()).optional(),
    assignedWings: z.array(z.string().min(1).max(10)).optional(),
  })
  .refine((data) => data.role || (Array.isArray(data.roles) && data.roles.length > 0), {
    message: "At least one role must be specified",
    path: ["role"],
  });

const updateRoleSchema = z
  .object({
    role: z.enum(SOCIETY_ROLES, { errorMap: () => ({ message: "Invalid role" }) }).optional(),
    roles: z.array(z.enum(SOCIETY_ROLES)).optional(),
    additionalRoles: z.array(z.enum(SOCIETY_ROLES)).optional(),
    assignedWings: z.array(z.string().min(1).max(10)).optional(),
    action: z.string().optional(),
    wing: z.string().optional(),
  })
  .refine(
    (data) =>
      data.role || (Array.isArray(data.roles) && data.roles.length > 0) || data.action,
    {
      message: "Role or action is required",
      path: ["role"],
    }
  );

module.exports = { addMemberSchema, updateRoleSchema };

