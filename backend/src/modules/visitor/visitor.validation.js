const { z } = require("zod");
const { VISITOR_TYPES } = require("./visitor.model");

const preApproveVisitorSchema = z.object({
  unitId: z.string().min(1, "House / Unit is required"),
  name: z.string().min(2, "Visitor name must be at least 2 characters").max(100),
  phone: z.string().min(5, "Valid phone number is required").max(20),
  visitorType: z.enum(VISITOR_TYPES).default("guest"),
  company: z.string().max(100).optional().default(""),
  vehicleNumber: z.string().max(20).optional().default(""),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().max(500).optional().default(""),
});

const walkInVisitorSchema = z.object({
  unitId: z.string().min(1, "House / Unit is required"),
  name: z.string().min(2, "Visitor name is required").max(100),
  phone: z.string().min(5, "Phone number is required").max(20),
  visitorType: z.enum(VISITOR_TYPES).default("guest"),
  company: z.string().max(100).optional().default(""),
  vehicleNumber: z.string().max(20).optional().default(""),
  notes: z.string().max(500).optional().default(""),
  isParcel: z.boolean().optional().default(false),
});

const verifyPasscodeSchema = z.object({
  passcode: z.string().min(4, "Enter valid passcode").max(10),
});

const respondApprovalSchema = z.object({
  action: z.enum([
    "approve",
    "approved",
    "reject",
    "rejected",
    "deny",
    "denied",
    "leave_at_gate",
    "gate",
  ]),
});

const checkOutSchema = z.object({
  notes: z.string().max(500).optional().default(""),
});

const queryVisitorsSchema = z.object({
  status: z.string().optional(),
  visitorType: z.string().optional(),
  unitId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const logParcelSchema = z.object({
  unitId: z.string().min(1, "Destination house is required"),
  company: z.string().max(100).optional().default("Delivery"),
  name: z.string().max(100).optional().default("Courier Delivery"),
  phone: z.string().max(20).optional().default(""),
  notes: z.string().max(500).optional().default(""),
  packageCount: z.coerce.number().int().min(1).max(50).optional().default(1),
});

const verifyPickupSchema = z.object({
  parcelCode: z.string().min(3, "Enter valid pickup PIN").max(10),
});

module.exports = {
  preApproveVisitorSchema,
  walkInVisitorSchema,
  verifyPasscodeSchema,
  respondApprovalSchema,
  checkOutSchema,
  queryVisitorsSchema,
  logParcelSchema,
  verifyPickupSchema,
};
