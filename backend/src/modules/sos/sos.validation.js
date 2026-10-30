const { z } = require("zod");
const { SOS_EMERGENCY_TYPES } = require("./sos.model");

const triggerSOSSchema = z.object({
  emergencyType: z.enum(SOS_EMERGENCY_TYPES).default("general"),
  locationDescription: z.string().max(300).optional().default(""),
  unitId: z.string().optional().nullable(),
});

const resolveSOSSchema = z.object({
  resolutionNote: z.string().max(500).optional().default(""),
  note: z.string().max(500).optional().default(""),
  isFalseAlarm: z.union([z.boolean(), z.string()]).optional().default(false),
  falseAlarm: z.union([z.boolean(), z.string()]).optional().default(false),
});

module.exports = {
  triggerSOSSchema,
  resolveSOSSchema,
};
