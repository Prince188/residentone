export const RESIDENT_NAV_SECTIONS = [
  {
    id: "main",
    label: "Main",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: "dashboard" },
      { label: "Notices", to: "/notices", icon: "campaign" },
      { label: "Complaints", to: "/complaints", icon: "report_problem" },
      { label: "Visitors", to: "/visitors", icon: "badge" },
      { label: "Amenities", to: "/amenities", icon: "pool" },
      { label: "Documents", to: "/documents", icon: "folder_open" },
    ],
  },
  {
    id: "finances",
    label: "Finances & Treasury",
    items: [
      { label: "Maintenance Dues", to: "/maintenance", icon: "build" },
      { label: "Collections", to: "/collections/pay", icon: "handshake" },
      { label: "Donations", to: "/donations", icon: "volunteer_activism" },
      { label: "Expenses & Ledgers", to: "/expenses", icon: "payments" },
      { label: "Transfer Fees", to: "/transfer-fees", icon: "real_estate_agent" },
      { label: "Society Wallet", to: "/wallet", icon: "account_balance_wallet" },
      { label: "Verify Receipt", to: "/verify", icon: "verified" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { label: "My Unit", to: "/my-unit", icon: "home_work" },
      { label: "Vehicles", to: "/vehicles", icon: "directions_car" },
      { label: "Emergency", to: "/emergency-contacts", icon: "emergency" },
      { label: "Help & Support", to: "/help", icon: "help" },
    ],
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
