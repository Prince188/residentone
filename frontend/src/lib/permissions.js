export const PERMISSIONS = [
  { key: "manage_committee", label: "Manage Committee", desc: "Add / remove roles", icon: "groups" },
  { key: "manage_houses", label: "Manage Houses", desc: "Assign owner / renter", icon: "home" },
  { key: "manage_maintenance", label: "Manage Maintenance", desc: "Billing & dues", icon: "request_quote" },
  { key: "create_notice", label: "Create Notice", desc: "Publish notices", icon: "campaign" },
  { key: "manage_amenities", label: "Manage Amenities", desc: "Facility setup", icon: "event_available" },
  { key: "manage_bookings", label: "Manage Bookings", desc: "Approve amenities", icon: "event" },
  { key: "create_poll", label: "Create Poll", desc: "Voting", icon: "how_to_vote" },
  { key: "create_survey", label: "Create Survey", desc: "Feedback", icon: "assignment" },
  { key: "manage_complaints", label: "Manage Complaints", desc: "Resolve complaints", icon: "report" },
  { key: "manage_visitors", label: "Manage Visitors", desc: "Gate & visitors", icon: "badge" },
  { key: "view_financials", label: "View Financials", desc: "Reports, dues", icon: "account_balance" },
  { key: "manage_directory", label: "View Directory", desc: "Resident list", icon: "contacts" },
];

export const DEFAULT_ROLE_PERMISSIONS = {
  society_admin: PERMISSIONS.map((p) => p.key),
  super_admin: PERMISSIONS.map((p) => p.key),
  manager: ["manage_houses", "manage_maintenance", "create_notice", "manage_amenities", "manage_bookings", "create_poll", "create_survey", "manage_complaints", "manage_visitors", "view_financials", "manage_directory", "manage_committee"],
  treasurer: ["manage_maintenance", "view_financials", "manage_directory"],
  accountant: ["manage_maintenance", "view_financials"],
  helpdesk_manager: ["manage_complaints", "manage_visitors", "manage_directory"],
  auditor: ["view_financials", "manage_directory"],
  committee_member: ["create_notice", "create_poll", "create_survey", "manage_directory"],
  owner: ["manage_directory"],
  tenant: ["manage_directory"],
  resident: ["manage_directory"],
  staff: ["manage_directory"],
  security_guard: ["manage_visitors", "manage_directory"],
};

export function getPermissionsForRole(role, customPermissions) {
  if (customPermissions && customPermissions[role]) return customPermissions[role];
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role, permission, customPermissions) {
  if (!role || !permission) return false;
  if (["society_admin", "super_admin"].includes(role)) return true;
  const perms = getPermissionsForRole(role, customPermissions);
  return perms.includes(permission);
}

// Hook helper for React
export function useHasPermission(activeMembership, permission, customPermissions) {
  const role = activeMembership?.role;
  return hasPermission(role, permission, customPermissions);
}
