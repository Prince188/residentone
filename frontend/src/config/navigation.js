export const RESIDENT_NAV_SECTIONS = [
  {
    id: "main",
    label: "Main",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: "dashboard" },
      { label: "Maintenance", to: "/maintenance", icon: "build" },
      { label: "Complaints", to: "/complaints", icon: "report_problem" },
      { label: "Visitors", to: "/visitors", icon: "badge" },
      { label: "Notices", to: "/notices", icon: "campaign" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [{ label: "Help & Support", to: "/help", icon: "help" }],
  },
];

export const ADMIN_NAV_SECTIONS = [
  {
    id: "main",
    label: "Main",
    items: [{ label: "Dashboard", to: "/dashboard", icon: "dashboard" }],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      { label: "Societies", to: "/admin/societies", icon: "apartment" },
      {
        label: "Pending Approvals",
        to: "/admin/societies/pending",
        icon: "pending_actions",
      },
      {
        label: "User Management",
        to: "/admin/users",
        icon: "manage_accounts",
      },
      {
        label: "Referrals & Gifts 🎁",
        to: "/admin/referrals",
        icon: "card_giftcard",
      },
      {
        label: "Coupon Codes",
        to: "/admin/coupons",
        icon: "confirmation_number",
      },
      {
        label: "App Launcher Icon",
        to: "/admin/app-icon",
        icon: "palette",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [{ label: "Help & Support", to: "/help", icon: "help" }],
  },
];

