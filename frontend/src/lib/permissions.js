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
  { key: "manage_collections", label: "Manage Collections", desc: "Festival & occasion funds (Navratri, events, etc)", icon: "volunteer_activism" },
  { key: "manage_documents", label: "Manage Documents", desc: "Upload bills & sheets", icon: "folder_open" },
];

export const DEFAULT_ROLE_PERMISSIONS = {
  society_admin: PERMISSIONS.map((p) => p.key),
  super_admin: PERMISSIONS.map((p) => p.key),
  wing_admin: ["manage_houses", "manage_complaints", "create_notice", "create_poll", "create_survey", "manage_visitors", "manage_directory", "view_financials"],
  manager: ["manage_houses", "manage_maintenance", "manage_collections", "manage_documents", "create_notice", "manage_amenities", "manage_bookings", "create_poll", "create_survey", "manage_complaints", "manage_visitors", "view_financials", "manage_directory", "manage_committee"],
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

export function getMembershipRoles(membership) {
  if (!membership) return [];
  const primary = membership.role ? [membership.role] : [];
  const additional = Array.isArray(membership.additionalRoles) ? membership.additionalRoles : [];
  // legacy support: roles array
  const rolesArr = Array.isArray(membership.roles) ? membership.roles : [];
  return [...new Set([...primary, ...additional, ...rolesArr])];
}

export function hasPermissionForMembership(membership, permission, customPermissions) {
  const roles = getMembershipRoles(membership);
  if (roles.includes("society_admin") || roles.includes("super_admin")) return true;
  for (const r of roles) if (hasPermission(r, permission, customPermissions)) return true;
  return false;
}

export function isWingAdmin(membership) {
  return getMembershipRoles(membership).includes("wing_admin");
}

export function isPureWingAdmin(membership) {
  const roles = getMembershipRoles(membership);
  return roles.includes("wing_admin") && !roles.includes("society_admin") && !roles.includes("super_admin");
}

// Hook helper for React
export function useHasPermission(activeMembership, permission, customPermissions) {
  return hasPermissionForMembership(activeMembership, permission, customPermissions);
}
