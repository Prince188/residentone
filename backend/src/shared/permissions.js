const PERMISSIONS = [
  { key: "manage_committee", label: "Manage Committee", desc: "Add / remove roles" },
  { key: "manage_houses", label: "Manage Houses", desc: "Assign owner / renter" },
  { key: "manage_maintenance", label: "Manage Maintenance", desc: "Billing & dues" },
  { key: "manage_collections", label: "Manage Collections", desc: "Festival & occasion funds (Navratri, events, etc)" },
  { key: "collect_transfer_fees", label: "Collect Transfer Fees", desc: "Flat ownership transfer fees" },
  { key: "manage_expenses", label: "Manage Expenses", desc: "Society expenses & vendor payouts" },
  { key: "manage_wallet", label: "Society Wallet", desc: "Wallet balance & transactions" },
  { key: "create_notice", label: "Create Notice", desc: "Publish notices" },
  { key: "manage_amenities", label: "Manage Amenities", desc: "Facility setup & rules" },
  { key: "create_poll", label: "Create Poll", desc: "Voting" },
  { key: "create_survey", label: "Create Survey", desc: "Feedback" },
  { key: "manage_complaints", label: "Manage Complaints", desc: "Resolve complaints" },
  { key: "manage_visitors", label: "Manage Visitors", desc: "Gate & visitors" },
  { key: "view_financials", label: "View Financials", desc: "Reports, dues & audits" },
  { key: "collect_donations", label: "Collect Donations", desc: "Cash festival donations (Navratri, Ganpati etc)" },
  { key: "manage_documents", label: "Manage Documents", desc: "Upload bills & sheets" },
  { key: "manage_staff", label: "Manage Staff", desc: "Add / remove guards & staff" },
];

const DEFAULT_ROLE_PERMISSIONS = {
  society_admin: PERMISSIONS.map((p) => p.key),
  super_admin: PERMISSIONS.map((p) => p.key),
  wing_admin: [],
  manager: [],
  treasurer: [],
  accountant: [],
  helpdesk_manager: [],
  auditor: [],
  committee_member: [],
  owner: [],
  tenant: [],
  resident: [],
  staff: [],
  security_guard: [],
};

function getPermissionsForRole(role, customPermissions) {
  if (customPermissions && customPermissions[role]) {
    return customPermissions[role];
  }
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
}

function hasPermission(role, permission, customPermissions) {
  if (!role || !permission) return false;
  // society_admin and super_admin always have all
  if (["society_admin", "super_admin"].includes(role)) return true;
  const perms = getPermissionsForRole(role, customPermissions);
  return perms.includes(permission);
}

function getMembershipRoles(membership) {
  if (!membership) return [];
  const primary = membership.role ? [membership.role] : [];
  const additional = Array.isArray(membership.additionalRoles) ? membership.additionalRoles : [];
  return [...primary, ...additional];
}

function hasPermissionForMembership(membership, permission, customPermissions) {
  const roles = getMembershipRoles(membership);
  if (roles.includes("society_admin") || roles.includes("super_admin")) return true;
  for (const r of roles) {
    if (hasPermission(r, permission, customPermissions)) return true;
  }
  return false;
}

function isWingAdmin(membership) {
  return getMembershipRoles(membership).includes("wing_admin");
}

module.exports = { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, getPermissionsForRole, hasPermission, getMembershipRoles, hasPermissionForMembership, isWingAdmin };
