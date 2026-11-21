const SOCIETY_ROLES = [
  "super_admin",
  "society_admin",
  "wing_admin",
  "committee_member",
  "manager",
  "treasurer",
  "accountant",
  "helpdesk_manager",
  "auditor",
  "owner",
  "tenant",
  "resident",
  "staff",
  "security_guard",
];

const ACCOUNT_ROLES = ["resident", "society_admin", "super_admin"];

const DEFAULT_ACCOUNT_ROLE = "resident";

const SOCIETY_STATUSES = ["pending", "active", "rejected", "suspended", "archived", "trial", "churned"];

const SOCIETY_TYPES = ["apartment", "row_house", "mixed"];

const PROPERTY_TYPES = [
  "flat",
  "row_house",
  "villa",
  "penthouse",
  "studio",
  "shop",
  "office",
  "plot",
  "bungalow",
  "duplex",
  "other",
];

const SUBSCRIPTION_PLANS = ["standard", "starter", "professional", "enterprise"];

const SUBSCRIPTION_BILLING = ["semi_annual", "yearly", "monthly", "half_yearly", "6months"];

const SUBSCRIPTION_BASE_UNITS = 200;
const SUBSCRIPTION_OVERAGE_RATE = 2; // ₹2/unit/month

const SUBSCRIPTION_PRICING = {
  semi_annual: { months: 6, basePrice: 2100, label: "6 Months" },
  yearly: { months: 12, basePrice: 4000, label: "12 Months" },
};

const PLAN_RATES = {
  standard: 0,
  starter: 6,
  professional: 10,
  enterprise: 15,
};

const ROLE_HIERARCHY = {
  super_admin: 100,
  society_admin: 80,
  wing_admin: 65,
  committee_member: 60,
  manager: 55,
  treasurer: 50,
  accountant: 45,
  helpdesk_manager: 43,
  auditor: 40,
  owner: 40,
  tenant: 20,
  resident: 10,
  security_guard: 15,
  staff: 10,
};

module.exports = {
  SOCIETY_ROLES,
  ROLE_HIERARCHY,
  ACCOUNT_ROLES,
  DEFAULT_ACCOUNT_ROLE,
  PROPERTY_TYPES,
  SOCIETY_STATUSES,
  SOCIETY_TYPES,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_BILLING,
  SUBSCRIPTION_BASE_UNITS,
  SUBSCRIPTION_OVERAGE_RATE,
  SUBSCRIPTION_PRICING,
  PLAN_RATES,
};
