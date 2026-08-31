const PERMISSIONS = [
  { key: "manage_committee", label: "Manage Committee", desc: "Add / remove roles" },
  { key: "manage_houses", label: "Manage Houses", desc: "Assign owner / renter" },
  { key: "manage_maintenance", label: "Manage Maintenance", desc: "Billing & dues" },
  { key: "create_notice", label: "Create Notice", desc: "Publish notices" },
  { key: "manage_amenities", label: "Manage Amenities", desc: "Facility setup" },
  { key: "manage_bookings", label: "Manage Bookings", desc: "Approve amenities" },
  { key: "create_poll", label: "Create Poll", desc: "Voting" },
  { key: "create_survey", label: "Create Survey", desc: "Feedback" },
  { key: "manage_complaints", label: "Manage Complaints", desc: "Resolve complaints" },
  { key: "manage_visitors", label: "Manage Visitors", desc: "Gate & visitors" },
  { key: "view_financials", label: "View Financials", desc: "Reports, dues" },
  { key: "manage_directory", label: "View Directory", desc: "Resident list" },
  { key: "manage_collections", label: "Manage Collections", desc: "Festival & occasion funds (Navratri, events, etc)" },
  { key: "manage_documents", label: "Manage Documents", desc: "Upload bills & sheets" },
];

const DEFAULT_ROLE_PERMISSIONS = {
  society_admin: PERMISSIONS.map((p) => p.key),
  super_admin: PERMISSIONS.map((p) => p.key),
  wing_admin: ["manage_houses", "manage_complaints", "create_notice", "manage_visitors", "manage_directory", "view_financials"],
  manager: ["manage_houses", "manage_maintenance", "create_notice", "manage_amenities", "manage_bookings", "create_poll", "create_survey", "manage_complaints", "manage_visitors", "view_financials", "manage_directory", "manage_committee", "manage_collections", "manage_documents"],
  treasurer: ["manage_maintenance", "manage_collections", "manage_documents", "view_financials", "manage_directory"],
  accountant: ["manage_maintenance", "manage_collections", "manage_documents", "view_financials"],
  helpdesk_manager: ["manage_complaints", "manage_visitors", "manage_directory"],
  auditor: ["view_financials", "manage_directory"],
  committee_member: ["create_notice", "create_poll", "create_survey", "manage_directory"],
  owner: ["manage_directory"],
  tenant: ["manage_directory"],
  resident: ["manage_directory"],
  staff: ["manage_directory"],
  security_guard: ["manage_visitors", "manage_directory"],
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

module.exports = { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, getPermissionsForRole, hasPermission };
