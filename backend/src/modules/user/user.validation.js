const { z } = require("zod");

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  occupation: z.string().max(100).optional(),
  familyMembers: z.coerce.number().int().min(0).max(50).optional().nullable(),
  vehicles: z.array(z.string().trim()).optional(),
});

module.exports = { updateProfileSchema };
