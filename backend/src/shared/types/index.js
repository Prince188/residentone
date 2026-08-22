const SOCIETY_ROLES = [
  "super_admin",
  "society_admin",
  "committee_member",
  "owner",
  "tenant",
  "staff",
  "security_guard",
];

const ACCOUNT_ROLES = ["resident"];

const DEFAULT_ACCOUNT_ROLE = "resident";

const PROPERTY_TYPES = ["flat", "row_house"];

const ROLE_HIERARCHY = {
  super_admin: 100,
  society_admin: 80,
  committee_member: 60,
  owner: 40,
  tenant: 20,
  security_guard: 15,
  staff: 10,
};

module.exports = {
  SOCIETY_ROLES,
  ROLE_HIERARCHY,
  ACCOUNT_ROLES,
  DEFAULT_ACCOUNT_ROLE,
  PROPERTY_TYPES,
};
