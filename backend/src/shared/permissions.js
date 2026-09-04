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
  { key: "manage_staff", label: "Manage Staff", desc: "Add / remove guards & staff" },
];

const DEFAULT_ROLE_PERMISSIONS = {
  society_admin: PERMISSIONS.map((p) => p.key),
  super_admin: PERMISSIONS.map((p) => p.key),
  wing_admin: ["manage_houses", "manage_maintenance", "manage_complaints", "create_notice", "create_poll", "create_survey", "manage_visitors", "manage_directory", "view_financials", "manage_staff"],
  manager: ["manage_houses", "manage_maintenance", "create_notice", "manage_amenities", "manage_bookings", "create_poll", "create_survey", "manage_complaints", "manage_visitors", "view_financials", "manage_directory", "manage_committee", "manage_collections", "manage_documents", "manage_staff"],
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
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] || [];
  if (customPermissions && customPermissions[role]) {
    // If role is wing_admin, ensure new base capabilities like manage_maintenance are always preserved even if society had old saved permissions
    if (role === "wing_admin" && defaults.includes("manage_maintenance") && !customPermissions[role].includes("manage_maintenance")) {
      return [...customPermissions[role], "manage_maintenance"];
    }
    return customPermissions[role];
  }
  return defaults;
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
