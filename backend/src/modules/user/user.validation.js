const { z } = require("zod");

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
});

module.exports = { updateProfileSchema };
