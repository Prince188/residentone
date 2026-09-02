import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, {
  selectActiveSociety,
  selectActiveMembership,
  selectPrimaryUnit,
} from "../../stores/society.store";
import { getNotices, timeAgo } from "../../lib/notices";
import { formatAmount, formatDate, getLatestCycle } from "../../lib/maintenance";
import { getSocietyStats, listSocieties, SOCIETY_TYPE_LABELS } from "../../lib/societies";
import { getVisitorStats, getVisitors, getGateParcels } from "../../lib/visitors";
import StatusBadge from "../../components/ui/StatusBadge";
import api from "../../lib/api";
import { hasPermissionForMembership, getMembershipRoles } from "../../lib/permissions";
import { getBadges } from "../../lib/dashboard";

const superAdminCards = [
  { icon: "apartment", label: "Societies Directory", to: "/admin/societies", desc: "View, filter and manage all societies" },
  { icon: "pending_actions", label: "Pending Approvals", to: "/admin/societies/pending", desc: "Review incoming registrations", badgeKey: "pending" },
  { icon: "add_business", label: "Provision Society", to: "/admin/societies/new", desc: "Manually onboard a new society" },
];

const adminCards = [
  { icon: "apartment", label: "Manage Houses", to: "/houses" },
  { icon: "domain", label: "Manage Society", to: "/society/manage", perm: "manage_society" },
  { icon: "meeting_room", label: "Manage Wing", to: "/wing/manage" },
  { icon: "request_quote", label: "Manage Maintenance", to: "/dues" },
  { icon: "volunteer_activism", label: "Manage Collections", to: "/collections/manage" },
  { icon: "edit_square", label: "Create Notice", to: "/notices/new" },
  { icon: "event_available", label: "Manage Amenities", to: "/amenities/manage" },
  { icon: "how_to_vote", label: "Create Poll", to: "/polls/new" },
  { icon: "assignment", label: "Create Survey", to: "/surveys/new" },
  { icon: "groups", label: "Manage Committee", to: "/committee" },
  { icon: "shield_person", label: "Manage Staff", to: "/staff" },
];

const generalCards = [
  { icon: "payments", label: "Pay Maintenance", to: "/maintenance" },
  { icon: "volunteer_activism", label: "Collections", to: "/collections/pay" },
  { icon: "home_work", label: "My Unit", to: "/my-unit" },
  { icon: "group_add", label: "Add Members", to: "/family-members" },
  { icon: "campaign", label: "Notices", to: "/notices" },
  { icon: "badge", label: "Visitors", to: "/visitors" },
  { icon: "report_problem", label: "Complaints", to: "/complaints", badgeKey: "complaints" },
  { icon: "pool", label: "Amenities", to: "/amenities" },
  { icon: "how_to_vote", label: "Polls", to: "/polls", badgeKey: "polls" },
  { icon: "assignment", label: "Surveys", to: "/surveys", badgeKey: "surveys" },
  { icon: "chat", label: "Chat", to: "/chat" },
  { icon: "folder_open", label: "Documents", to: "/documents" },
  { icon: "emergency", label: "Emergency", to: "/emergency-contacts" },
  { icon: "groups", label: "Directory", to: "/directory" },
  { icon: "directions_car", label: "Vehicles", to: "/vehicles" },
];

const CARD_TINTS = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const ROLE_TITLES = {
  super_admin: "Super Admin",
  society_admin: "Society Admin",
  wing_admin: "Wing Admin",
  manager: "Manager",
  treasurer: "Treasurer",
  accountant: "Accountant",
  helpdesk_manager: "Helpdesk Manager",
  auditor: "Auditor",
  committee_member: "Committee Member",
  owner: "Owner",
  tenant: "Tenant",
  staff: "Staff",
  security_guard: "Security",
};

function RolePill({ role, isSuper }) {
  const label = isSuper ? "Super Admin" : ROLE_TITLES[role] || "Resident";
  const isPrivileged = isSuper || ["society_admin", "super_admin", "wing_admin", "manager", "treasurer", "accountant", "helpdesk_manager", "auditor", "committee_member"].includes(role);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-label-sm font-semibold shadow-sm ${
        isPrivileged
          ? "bg-white text-primary"
          : "bg-white/20 text-white backdrop-blur-sm"
      }`}
    >
      <span className="material-symbols-outlined text-[15px]">
        {isSuper ? "verified_user" : isPrivileged ? "shield_person" : "person"}
      </span>
      {label}
    </span>
  );
}

function SectionTitle({ children, subtitle }) {
  return (
    <div className="flex flex-col">
      <h2 className="flex items-center gap-2 text-body-md font-bold text-on-surface sm:text-body-lg">
        <span aria-hidden="true" className="h-4 w-1 rounded-full bg-primary shrink-0" />
        {children}
      </h2>
      {subtitle && <p className="mt-0.5 text-label-sm text-on-surface-variant pl-3">{subtitle}</p>}
    </div>
  );
}

function SquareCard({ icon, label, to, tint, badge, isLocked }) {
  const showBadge = !isLocked && badge != null && Number(badge) > 0;
  const display = showBadge ? (Number(badge) > 99 ? "99+" : String(badge)) : null;

  if (isLocked) {
    return (
      <div
        title="Locked: Society is frozen. Please contact the admin."
        className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-low p-3 opacity-60 cursor-not-allowed select-none transition-all shadow-none"
      >
        <span className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-error text-on-error shadow-sm ring-2 ring-surface-container-lowest">
          <span className="material-symbols-outlined text-[12px]">lock</span>
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-high text-outline shadow-none sm:h-12 sm:w-12">
          <span className="material-symbols-outlined text-[22px] sm:text-[26px]">{icon}</span>
        </span>
        <span className="flex h-[2.5em] w-full items-start justify-center overflow-hidden px-0.5 text-center text-[11px] font-semibold leading-tight text-on-surface-variant line-clamp-2 sm:text-[13px]">
          {label}
        </span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 no-underline transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:bg-surface-container-low hover:shadow-lg active:translate-y-0"
    >
      {showBadge && (
        <span className="absolute -right-1.5 -top-1.5 z-10 flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-[11px] font-bold leading-none text-on-error shadow-md ring-2 ring-surface-container-lowest">
          {display}
        </span>
      )}
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-110 group-active:scale-95 sm:h-12 sm:w-12 ${tint}`}
      >
        <span className="material-symbols-outlined text-[22px] sm:text-[26px]">{icon}</span>
      </span>
      <span className="flex h-[2.5em] w-full items-start justify-center overflow-hidden px-0.5 text-center text-[11px] font-semibold leading-tight text-on-surface line-clamp-2 sm:text-[13px]">
        {label}
      </span>
    </Link>
  );
}

function CardSection({ title, cards, variant = "general", badges, isLocked = false }) {
  const cols =
    cards.length <= 4
      ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
      : "grid-cols-3 sm:grid-cols-5 lg:grid-cols-8";
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div className={`mt-2 grid gap-2.5 sm:mt-3 sm:gap-3 ${cols}`}>
        {cards.map((card, index) => (
          <SquareCard
            key={card.label}
            {...card}
            isLocked={isLocked}
            badge={card.badgeKey ? badges?.[card.badgeKey] : 0}
            tint={
              variant === "admin"
                ? "bg-primary/10 text-primary"
                : CARD_TINTS[index % CARD_TINTS.length]
            }
          />
        ))}
      </div>
    </section>
  );
}

function NoticeItem({ title, body, createdAt, featured }) {
  return (
    <article
      className={`relative flex gap-3 overflow-hidden rounded-xl border p-4 pl-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        featured
          ? "border-primary bg-primary-fixed/40"
          : "border-outline-variant bg-surface-container-lowest hover:border-primary/40"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 ${
          featured ? "bg-primary" : "bg-outline-variant"
        }`}
      />
      <span
        className={`material-symbols-outlined mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full text-[18px] ${
          featured ? "bg-primary text-on-primary" : "bg-secondary-fixed text-primary"
        }`}
      >
        campaign
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-body-sm font-semibold text-on-surface sm:text-body-md">{title}</h3>
          <span className="shrink-0 text-[11px] text-outline sm:text-label-sm">{timeAgo(createdAt)}</span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-label-sm text-on-surface-variant sm:line-clamp-none sm:text-body-sm">
          {body}
        </p>
      </div>
    </article>
  );
}

/**
 * Super Admin Structured Platform Dashboard View
 * Well-organized layout with:
 * 1. Hero header with quick primary action buttons
 * 2. Top-level 4-card KPI metric grid
 * 3. Two-column operational section:
 *    - Left: Pending Approval queue & Recent Societies Table
 *    - Right: Quick Management actions, Society Status Distribution & Platform Health
 */
function SuperAdminDashboardView({ user }) {
  const firstName = user?.name?.split(" ")[0] || "Super Admin";
  const enterSocietyAsSuperAdmin = useSocietyStore((state) => state.enterSocietyAsSuperAdmin);

  const statsQuery = useQuery({
    queryKey: ["superadmin-society-stats"],
    queryFn: async () => (await getSocietyStats()).data.data,
  });
  const stats = statsQuery.data || { total: 0, pending: 0, active: 0, rejected: 0, suspended: 0, archived: 0, totalUnits: 0, totalUsers: 0 };

  const pendingSocietiesQuery = useQuery({
    queryKey: ["superadmin-pending-societies"],
    queryFn: async () => (await listSocieties({ status: "pending", limit: 5 })).data.data,
  });
  const pendingSocieties = pendingSocietiesQuery.data || [];

  const recentSocietiesQuery = useQuery({
    queryKey: ["superadmin-recent-societies"],
    queryFn: async () => (await listSocieties({ limit: 6 })).data.data,
  });
  const recentSocieties = recentSocietiesQuery.data || [];

  const activePercent = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
  const pendingPercent = stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0;
  const suspendedPercent = stats.total > 0 ? Math.round((stats.suspended / stats.total) * 100) : 0;
  const archivedPercent = stats.total > 0 ? Math.round(((stats.archived || 0) / stats.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-7">
      {/* 1. Header & Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed p-6 text-white shadow-lg sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/5" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                {getGreeting()}
              </span>
              <span className="text-white/40">·</span>
              <RolePill isSuper={true} />
            </div>
            <h1 className="text-headline-md font-bold leading-tight sm:text-headline-lg">
              {firstName}
            </h1>
            <p className="text-body-sm text-white/80 sm:text-body-md max-w-xl">
              Platform Operations, Society Approvals & Multi-Tenant Infrastructure Control Center.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/societies/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-label-md font-bold text-primary shadow-sm no-underline transition-all hover:bg-white/90 hover:shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">add_business</span>
              Onboard Society
            </Link>
            <Link
              to="/admin/societies"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2.5 text-label-md font-semibold text-white backdrop-blur-sm no-underline transition-all hover:bg-white/25"
            >
              <span className="material-symbols-outlined text-[20px]">apartment</span>
              All Societies
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Key Metric KPI Cards (Top 4 Structured Cards) */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Societies */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-medium text-on-surface-variant">Total Societies</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[22px]">domain</span>
              </span>
            </div>
            <p className="mt-3 text-headline-md font-bold text-on-surface">
              {statsQuery.isLoading ? "..." : stats.total}
            </p>
            <div className="mt-2 flex items-center gap-2 text-label-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1 font-semibold text-on-surface">
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                {stats.active} Active
              </span>
              <span>·</span>
              <span>{stats.suspended} Suspended</span>
            </div>
          </div>

          {/* Pending Review Approvals */}
          <Link
            to="/admin/societies/pending"
            className="group rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 no-underline shadow-sm transition-all hover:border-primary/50 hover:bg-surface-container-low hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-label-md font-medium text-on-surface-variant">Pending Approvals</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-[22px]">pending_actions</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-headline-md font-bold text-on-surface">
                {statsQuery.isLoading ? "..." : stats.pending}
              </p>
              {stats.pending > 0 && (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-white uppercase">
                  Action Required
                </span>
              )}
            </div>
            <p className="mt-2 text-label-sm text-on-surface-variant">
              {stats.pending > 0 ? "Awaiting super-admin verification" : "All registrations reviewed"}
            </p>
          </Link>

          {/* Total Managed Flats / Units */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-medium text-on-surface-variant">Total Housing Units</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[22px]">apartment</span>
              </span>
            </div>
            <p className="mt-3 text-headline-md font-bold text-on-surface">
              {statsQuery.isLoading ? "..." : (stats.totalUnits ?? "-")}
            </p>
            <p className="mt-2 text-label-sm text-on-surface-variant">
              Flats & villas across all societies
            </p>
          </div>

          {/* Total Registered Platform Users */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-medium text-on-surface-variant">Registered Users</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[22px]">group</span>
              </span>
            </div>
            <p className="mt-3 text-headline-md font-bold text-on-surface">
              {statsQuery.isLoading ? "..." : (stats.totalUsers ?? "-")}
            </p>
            <p className="mt-2 text-label-sm text-on-surface-variant">
              Admins, residents, and staff accounts
            </p>
          </div>
        </div>
      </section>

      {/* 3. Main Operational Section (Two Column Layout: 8 / 4 Grid) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Pending Approvals Queue + Recent Societies Table */}
        <div className="space-y-6 lg:col-span-8">
          {/* Pending Approvals Review Section */}
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <SectionTitle subtitle="Registration requests awaiting verification & credential issuance">
                Pending Society Registrations
              </SectionTitle>
              <Link
                to="/admin/societies/pending"
                className="inline-flex items-center gap-1 text-label-sm font-semibold text-primary no-underline hover:underline"
              >
                View all ({stats.pending})
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {pendingSocietiesQuery.isLoading ? (
                <div className="h-24 animate-pulse rounded-xl bg-surface-container-high" />
              ) : pendingSocieties.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
                  <span className="material-symbols-outlined text-[32px] text-outline">verified</span>
                  <p className="mt-2 text-body-sm font-semibold text-on-surface">All caught up!</p>
                  <p className="text-label-sm text-on-surface-variant">
                    There are no pending society applications requiring review at this time.
                  </p>
                </div>
              ) : (
                pendingSocieties.map((society) => (
                  <div
                    key={society.id || society._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-all hover:border-primary/50 hover:bg-surface-container-low"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-body-md font-bold text-on-surface">
                          {society.name}
                        </h3>
                        <StatusBadge status="pending" />
                      </div>
                      <p className="text-label-sm text-on-surface-variant truncate">
                        {society.city}, {society.state} · {society.totalUnits} Units ({SOCIETY_TYPE_LABELS[society.societyType] || "Apartment"})
                      </p>
                      <p className="text-[12px] text-outline">
                        Contact: <span className="font-semibold text-on-surface">{society.contactPersonName}</span> · {society.contactPhone}
                      </p>
                    </div>

                    <Link
                      to={`/admin/societies/${society.id || society._id}`}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-label-md font-semibold text-on-primary no-underline shadow-sm transition-all hover:bg-primary/90 active:scale-95"
                    >
                      Review & Approve
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Recent Societies Platform Directory Table */}
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <SectionTitle subtitle="Overview of newly registered and active societies">
                Registered Societies
              </SectionTitle>
              <Link
                to="/admin/societies"
                className="inline-flex items-center gap-1 text-label-sm font-semibold text-primary no-underline hover:underline"
              >
                Full directory
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant">
              <div className="divide-y divide-outline-variant">
                {recentSocietiesQuery.isLoading ? (
                  <div className="p-6 text-center text-body-sm text-outline">Loading societies...</div>
                ) : recentSocieties.length === 0 ? (
                  <div className="p-6 text-center text-body-sm text-on-surface-variant">
                    No societies registered yet.
                  </div>
                ) : (
                  recentSocieties.map((soc) => (
                    <div
                      key={soc.id || soc._id}
                      className="group flex items-center justify-between p-3.5 sm:p-4 text-on-surface transition-colors hover:bg-surface-container-low"
                    >
                      <div className="min-w-0 pr-3 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/societies/${soc.id || soc._id}`}
                            className="truncate text-body-sm sm:text-body-md font-bold text-on-surface group-hover:text-primary no-underline"
                          >
                            {soc.name}
                          </Link>
                          <StatusBadge status={soc.status} />
                        </div>
                        <p className="text-label-sm text-on-surface-variant truncate">
                          {soc.city}, {soc.state} · {SOCIETY_TYPE_LABELS[soc.societyType] || "Apartment"} · {soc.totalUnits} Units
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {soc.status === "active" && (
                          <button
                            type="button"
                            onClick={() => enterSocietyAsSuperAdmin(soc)}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-label-sm font-semibold text-primary hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                            title="Manage this society as Super Admin"
                          >
                            <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
                            Manage
                          </button>
                        )}
                        <Link
                          to={`/admin/societies/${soc.id || soc._id}`}
                          className="text-label-md text-on-surface-variant hover:text-primary no-underline font-medium"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column (4 cols): Quick Operations, Status Breakdown & Infrastructure Info */}
        <div className="space-y-6 lg:col-span-4">
          {/* Quick Management Actions Cards */}
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm">
            <SectionTitle subtitle="Platform controls & shortcuts">
              Administration Tools
            </SectionTitle>
            <div className="mt-4 space-y-2.5">
              {superAdminCards.map((card) => {
                const hasBadge = card.badgeKey === "pending" && stats.pending > 0;
                return (
                  <Link
                    key={card.label}
                    to={card.to}
                    className="group flex items-center gap-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 no-underline transition-all hover:border-primary/50 hover:bg-surface-container-low"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                      <span className="material-symbols-outlined text-[22px]">{card.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-body-sm font-bold text-on-surface">{card.label}</h4>
                        {hasBadge && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                            {stats.pending}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-on-surface-variant truncate">{card.desc}</p>
                    </div>
                    <span className="material-symbols-outlined text-outline text-[18px] transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
                      arrow_forward
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Platform Distribution & Status Breakdown */}
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm">
            <SectionTitle subtitle="Status distribution across platform">
              Society Status Ratio
            </SectionTitle>
            <div className="mt-4 space-y-4">
              {/* Progress visual bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container flex">
                <div style={{ width: `${activePercent}%` }} className="bg-primary h-full transition-all duration-500" title={`Active: ${activePercent}%`} />
                <div style={{ width: `${pendingPercent}%` }} className="bg-outline h-full transition-all duration-500" title={`Pending: ${pendingPercent}%`} />
                <div style={{ width: `${suspendedPercent}%` }} className="bg-error h-full transition-all duration-500" title={`Suspended: ${suspendedPercent}%`} />
                <div style={{ width: `${archivedPercent}%` }} className="bg-surface-container-highest h-full transition-all duration-500" title={`Archived: ${archivedPercent}%`} />
              </div>

              <div className="space-y-2.5 divide-y divide-outline-variant/60 text-label-sm">
                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-2 text-on-surface-variant">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    Active Operational
                  </span>
                  <span className="font-bold text-on-surface">{stats.active} ({activePercent}%)</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-2 text-on-surface-variant">
                    <span className="h-2.5 w-2.5 rounded-full bg-outline" />
                    Pending Verification
                  </span>
                  <span className="font-bold text-on-surface">{stats.pending} ({pendingPercent}%)</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-2 text-on-surface-variant">
                    <span className="h-2.5 w-2.5 rounded-full bg-error" />
                    Suspended / Frozen
                  </span>
                  <span className="font-bold text-on-surface">{stats.suspended} ({suspendedPercent}%)</span>
                </div>
                {Boolean(stats.archived > 0) && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="flex items-center gap-2 text-on-surface-variant">
                      <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest border border-outline-variant" />
                      Archived / Soft-Deleted
                    </span>
                    <span className="font-bold text-on-surface">{stats.archived} ({archivedPercent}%)</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Infrastructure Health Card */}
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">dns</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-body-sm font-bold text-on-surface">Platform Infrastructure</h4>
                <p className="text-[11px] text-on-surface-variant">Multi-Tenant MongoDB & Socket Cluster</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-container-low px-3 py-2 text-[12px]">
              <span className="text-on-surface-variant">Security & RBAC</span>
              <span className="font-bold text-primary">14 Permissions Active</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Security Guard Main Station Dashboard View
 */
function SecurityGuardDashboardView({ user, activeSociety, noticesQuery, recentNotices }) {
  const firstName = user?.name?.split(" ")[0] || "Security Officer";

  const statsQuery = useQuery({
    queryKey: ["visitor-stats", activeSociety?.id],
    queryFn: async () => (await getVisitorStats()).data.data,
    enabled: Boolean(activeSociety?.id),
    refetchInterval: 10000,
  });
  const stats = statsQuery.data || { inside: 0, expected: 0, pending: 0, todayTotal: 0 };

  const recentInsideQuery = useQuery({
    queryKey: ["visitors", activeSociety?.id, "inside"],
    queryFn: async () => (await getVisitors({ status: "inside", limit: 6 })).data.data,
    enabled: Boolean(activeSociety?.id),
    refetchInterval: 10000,
  });
  const recentInside = recentInsideQuery.data || [];

  const guardActionCards = [
    { icon: "shield", label: "Gate Terminal", to: "/visitors/terminal", desc: "Open full touch PIN numpad & scanner", primary: true },
    { icon: "badge", label: "Visitor Hub", to: "/visitors", desc: "Gate pass history, approvals & logbook" },
    { icon: "groups", label: "Resident Directory", to: "/directory", desc: "Search flat numbers & call residents" },
    { icon: "directions_car", label: "Vehicle Lookup", to: "/vehicles", desc: "Verify registered resident number plates" },
    { icon: "emergency", label: "Emergency & SOS", to: "/emergency-contacts", desc: "Police, Fire, Ambulance & Society Desk" },
    { icon: "campaign", label: "Gate Notices", to: "/notices", desc: "Important instructions from committee" },
    { icon: "chat", label: "Intercom & Chat", to: "/chat", desc: "Message society admins or residents" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Guard Hero Station */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 px-6 py-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-label-sm font-bold text-emerald-300 backdrop-blur-md">
              <span className="material-symbols-outlined text-[16px]">shield</span>
              <span>Main Security Gate Station</span>
            </div>
            <h1 className="text-headline-sm sm:text-headline-md font-extrabold tracking-tight">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-body-sm text-white/80">
              {activeSociety?.name || "Society Gate"} · Digital Visitor & Gatekeeping Desk
            </p>
          </div>

          <Link
            to="/visitors/terminal"
            className="inline-flex items-center gap-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-6 py-4 text-title-sm font-extrabold text-slate-950 shadow-lg transition-transform active:scale-95 no-underline"
          >
            <span className="material-symbols-outlined text-[24px]">dialpad</span>
            <span>OPEN GATE TERMINAL</span>
          </Link>
        </div>
      </section>

      {/* 4-KPI Live Status Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Link
          to="/visitors/terminal"
          className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm no-underline hover:border-emerald-400 transition-all hover:shadow-md block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-outline">Inside Society</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">sensor_door</span>
          </div>
          <p className="mt-2 text-[32px] font-black tracking-tight text-emerald-600">{stats.inside}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Visitors currently inside</p>
        </Link>

        <Link
          to="/visitors/terminal"
          className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm no-underline hover:border-primary/50 transition-all hover:shadow-md block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-outline">Expected Today</span>
            <span className="material-symbols-outlined text-primary text-[20px]">event_upcoming</span>
          </div>
          <p className="mt-2 text-[32px] font-black tracking-tight text-primary">{stats.expected}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Pre-approved guest passes</p>
        </Link>

        <Link
          to="/visitors"
          className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm no-underline hover:border-amber-400 transition-all hover:shadow-md block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-outline">Gate Approvals</span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">pending</span>
          </div>
          <p className="mt-2 text-[32px] font-black tracking-tight text-amber-600">{stats.pending}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Walk-ins awaiting resident</p>
        </Link>

        <Link
          to="/visitors"
          className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm no-underline hover:border-outline transition-all hover:shadow-md block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-outline">Today's Total</span>
            <span className="material-symbols-outlined text-on-surface text-[20px]">history</span>
          </div>
          <p className="mt-2 text-[32px] font-black tracking-tight text-on-surface">{stats.todayTotal}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Total gate check-ins today</p>
        </Link>
      </div>

      {/* Main Guard Actions Grid & Live Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Security Tools */}
        <div className="lg:col-span-7 space-y-4">
          <SectionTitle subtitle="Security desk controls & tools">Security Guard Tools</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {guardActionCards.map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className={`group flex items-start gap-3.5 rounded-2xl border p-4 no-underline transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  card.primary
                    ? "border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50"
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:bg-surface-container-low"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${
                    card.primary
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">{card.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-body-md font-extrabold text-on-surface">{card.label}</h4>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">{card.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Visitors Currently Inside & Gate Notices */}
        <div className="lg:col-span-5 space-y-6">
          {/* Visitors Currently Inside Widget */}
          <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="text-title-sm font-extrabold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">sensor_door</span>
                Currently Inside ({stats.inside})
              </h3>
              <Link to="/visitors/terminal" className="text-label-sm font-bold text-primary hover:underline no-underline">
                View All
              </Link>
            </div>

            {recentInside.length > 0 ? (
              <div className="space-y-2">
                {recentInside.slice(0, 4).map((v) => (
                  <div
                    key={v._id || v.id}
                    className="flex items-center justify-between rounded-xl bg-surface-container-low p-2.5 text-body-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-extrabold text-on-surface truncate">{v.name}</p>
                      <p className="text-[11px] text-outline">
                        House {v.unitId?.label} · {v.visitorType?.toUpperCase()}
                      </p>
                    </div>
                    <span className="font-mono text-[12px] font-bold text-primary shrink-0">
                      #{v.passcode}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-body-sm text-outline py-4">No visitors inside premises.</p>
            )}
          </div>

          {/* Recent Gate Notices */}
          <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="text-title-sm font-extrabold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">campaign</span>
                Gate Announcements
              </h3>
              <Link to="/notices" className="text-label-sm font-bold text-primary hover:underline no-underline">
                View all
              </Link>
            </div>

            <div className="space-y-2">
              {recentNotices.slice(0, 2).map((notice) => (
                <div key={notice.id} className="rounded-xl border border-outline-variant/50 p-2.5">
                  <p className="text-body-sm font-bold text-on-surface truncate">{notice.title}</p>
                  <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">{notice.body}</p>
                </div>
              ))}
              {recentNotices.length === 0 && (
                <p className="text-center text-body-sm text-outline py-3">No active announcements.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const activeUnit = useSocietyStore(selectPrimaryUnit);

  const isSuperAdmin = user?.role?.includes("super_admin");

  const activeRoles = getMembershipRoles(activeMembership);
  const isAdmin = activeRoles.includes("society_admin") || activeRoles.includes("super_admin");
  const isSecurityGuard = activeRoles.includes("security_guard") && !isAdmin;
  const isWingOnly = activeRoles.includes("wing_admin") && !isAdmin;
  const activeRole = activeMembership?.role;
  const committeeRoles = ["manager","treasurer","accountant","helpdesk_manager","auditor","committee_member"];
  const isCommitteeRole = activeRoles.some((r) => committeeRoles.includes(r));
  const roleTitle = ROLE_TITLES[activeRole];

  const isSuperAdminManaging = useSocietyStore((state) => state.isSuperAdminManaging);

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety) && (!isSuperAdmin || isSuperAdminManaging),
  });
  const customPermissions = permissionsQuery.data || {};

  const cardPermissionMap = {
    "Manage Houses": "manage_houses",
    "Manage Society": "manage_society",
    "Manage Maintenance": "manage_maintenance",
    "Manage Collections": "manage_collections",
    "Create Collection": "manage_collections",
    "Create Notice": "create_notice",
    "Manage Amenities": "manage_amenities",
    "Create Poll": "create_poll",
    "Create Survey": "create_survey",
    "Manage Committee": "manage_committee",
    "Manage Staff": "manage_staff",
  };

  const isPureAdmin = isAdmin && !activeRoles.includes("wing_admin");
  const isAdminWithWing = isAdmin && activeRoles.includes("wing_admin");

  const filteredAdminCards = (() => {
    if (isAdminWithWing) {
      return adminCards.filter((card) => {
        if (card.label === "Manage Wing") return false;
        if (card.label === "Manage Society") return true;
        const perm = cardPermissionMap[card.label];
        if (!perm) return true;
        return hasPermissionForMembership(activeMembership, perm, customPermissions);
      });
    }
    if (isPureAdmin) {
      return adminCards.filter((card) => {
        if (card.label === "Manage Wing") return false;
        if (card.label === "Manage Society") return true;
        const perm = cardPermissionMap[card.label];
        if (!perm) return true;
        return hasPermissionForMembership(activeMembership, perm, customPermissions);
      });
    }
    if (isWingOnly) {
      return adminCards.filter((card) => ["Manage Wing", "Create Poll", "Create Survey", "Create Notice"].includes(card.label) && hasPermissionForMembership(activeMembership, cardPermissionMap[card.label] || "create_poll", customPermissions));
    }
    if (isCommitteeRole) {
      return adminCards.filter((card) => {
        if (card.label === "Manage Society" || card.label === "Manage Wing") return false;
        const perm = cardPermissionMap[card.label];
        if (!perm) return true;
        return hasPermissionForMembership(activeMembership, perm, customPermissions);
      });
    }
    return [];
  })();

  const filteredWingCards = (() => {
    if (isAdminWithWing) return adminCards.filter((card) => ["Manage Wing", "Create Poll", "Create Survey"].includes(card.label));
    if (isWingOnly) return [];
    return [];
  })();

  const badgesQuery = useQuery({
    queryKey: ["dashboard-badges", activeSociety?.id, isSuperAdmin && !isSuperAdminManaging ? "super" : "member"],
    queryFn: async () => (await getBadges()).data.data,
    enabled: Boolean(activeSociety) && (!isSuperAdmin || isSuperAdminManaging),
    staleTime: 30000,
    refetchInterval: 30000,
  });
  const badges = badgesQuery.data || {};

  const noticesQuery = useQuery({
    queryKey: ["notices", activeSociety?.id, "recent"],
    queryFn: async () => (await getNotices(2)).data.data,
    enabled: Boolean(activeSociety) && (!isSuperAdmin || isSuperAdminManaging),
  });
  const recentNotices = noticesQuery.data || [];

  const maintenanceQuery = useQuery({
    queryKey: ["maintenance", "latest"],
    queryFn: async () => (await getLatestCycle()).data.data,
    enabled: Boolean(activeSociety) && (!isSuperAdmin || isSuperAdminManaging),
  });

  const parcelsQuery = useQuery({
    queryKey: ["resident-gate-parcels", activeSociety?.id],
    queryFn: async () => (await getGateParcels({ status: "left_at_gate" })).data.data,
    enabled: Boolean(activeSociety) && (!isSuperAdmin || isSuperAdminManaging),
    refetchInterval: 8000,
  });
  const waitingParcels = parcelsQuery.data || [];

  // If user is platform Super Admin and NOT currently managing a specific society, render the Super Admin Platform Dashboard View
  if (isSuperAdmin && !isSuperAdminManaging) {
    return <SuperAdminDashboardView user={user} />;
  }

  // If user is on-duty Security Guard, render dedicated Security Gate Station Dashboard
  if (isSecurityGuard) {
    return (
      <SecurityGuardDashboardView
        user={user}
        activeSociety={activeSociety}
        noticesQuery={noticesQuery}
        recentNotices={recentNotices}
      />
    );
  }

  const latestCycle = maintenanceQuery.data;
  let maintenanceAlert = null;
  if (latestCycle) {
    const myUnits = latestCycle.myUnits || [];
    const allSettled =
      myUnits.length > 0 &&
      myUnits.every((u) => ["paid", "late_paid"].includes(u.status));
    if (!allSettled) {
      const dueDate = new Date(latestCycle.dueDate);
      const isOverdue = dueDate.setHours(23, 59, 59) < Date.now();
      maintenanceAlert = {
        overdue: isOverdue,
        text: `${latestCycle.month} ${latestCycle.year} · ${formatAmount(latestCycle.amount)} per house — ${
          isOverdue ? "overdue" : "due"
        } by ${formatDate(latestCycle.dueDate)}`,
      };
    }
  }

  const firstName = user?.name?.split(" ")[0] || "there";

  const isSocietySuspended =
    Boolean(activeSociety) &&
    (activeSociety.status === "suspended" || activeSociety.isActive === false);

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-7">
      {/* Demo / Under Development Banner */}
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-label-sm font-medium leading-snug text-amber-900 shadow-sm sm:gap-2.5 sm:py-3 sm:text-body-sm"
      >
        <span className="material-symbols-outlined shrink-0 text-[18px] text-amber-600 sm:text-[20px]">
          construction
        </span>
        <p className="m-0">
          <span className="font-semibold">Under Development:</span> You are viewing the demo mode. Some of the features are still under development — stay tuned.
        </p>
      </div>

      {/* Frozen / Suspended Society Warning Banner */}
      {isSocietySuspended && (
        <div className="rounded-2xl border border-error/30 bg-error-container/20 p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-error text-on-error shadow-sm">
              <span className="material-symbols-outlined text-[26px]">lock</span>
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-body-lg font-bold text-on-surface">Society Access Frozen</h3>
                <span className="inline-flex items-center rounded-full bg-error px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-on-error">
                  Suspended
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                Your society (<strong className="text-on-surface">{activeSociety?.name}</strong>) has been temporarily frozen. All platform actions, billing payments, amenity bookings, and voting features are locked.
              </p>
              <p className="text-label-sm font-semibold text-error pt-1">
                Please contact the admin to unfreeze your society.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed p-5 shadow-lg sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 right-28 h-40 w-40 rounded-full bg-white/5"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/70 sm:text-label-sm">
              {getGreeting()}
            </p>
            <h1 className="mt-1 text-headline-md font-bold leading-snug text-white sm:text-headline-lg">
              {firstName}
            </h1>
          </div>
          {activeMembership && (
            <div className="flex flex-wrap gap-2">
              <RolePill role={activeMembership?.role} isSuper={false} />
              {getMembershipRoles(activeMembership).filter((r)=> r !== activeMembership?.role).map((r)=>(
                <span key={r} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-sm font-bold ${r==="wing_admin" ? "bg-amber-100 text-amber-800" : "bg-white/20 text-white border border-white/20"}`}>
                  {ROLE_TITLES[r] || r} {r==="wing_admin" && (activeMembership.assignedWings||[]).length ? `• ${activeMembership.assignedWings.join(", ")}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="relative mt-5 flex items-center gap-3 rounded-xl bg-white/10 p-3.5 ring-1 ring-white/20 backdrop-blur-sm sm:p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:h-12 sm:w-12">
            <span className="material-symbols-outlined text-[24px] text-white sm:text-[28px]">apartment</span>
          </span>
          {activeSociety ? (
            <div className="min-w-0">
              <p className="truncate text-body-md font-semibold text-white sm:text-body-lg">
                {activeSociety.name}
              </p>
              <p className="truncate text-[11px] text-white/75 sm:text-label-md">
                {activeUnit ? `Unit ${activeUnit.label}` : "No unit assigned"}
                {activeMembership?.units?.length > 1 && (
                  <> · +{activeMembership.units.length - 1} more unit(s)</>
                )}
              </p>
            </div>
          ) : (
            <p className="text-xs text-white/80 sm:text-body-sm">
              You are not linked to any society yet. Contact your society admin to get added.
            </p>
          )}
        </div>
      </section>

      {/* 📦 Resident Parcel Waiting at Gate Banner */}
      {!isSocietySuspended && waitingParcels.length > 0 && (
        <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-surface-container-lowest to-surface-container-lowest p-4 sm:p-5 shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary shadow-xs">
                <span className="material-symbols-outlined text-[24px]">package_2</span>
              </div>
              <div>
                <h3 className="text-title-sm font-extrabold text-on-surface flex items-center gap-2">
                  <span>{waitingParcels.length} Package{waitingParcels.length > 1 ? "s" : ""} Waiting at Main Gate</span>
                  <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-800 uppercase tracking-wider">
                    Ready for Pickup
                  </span>
                </h3>
                <p className="text-[12px] text-on-surface-variant">
                  Show your 4-digit pickup PIN to security at the gate desk to collect.
                </p>
              </div>
            </div>

            <Link
              to="/visitors"
              className="text-label-sm font-bold text-primary hover:underline flex items-center gap-1 no-underline"
            >
              <span>View All Visitors & Parcels</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {waitingParcels.map((p) => {
              const pin = p.parcelDetails?.parcelCode || p.passcode || "—";
              return (
                <div
                  key={p._id || p.id}
                  className="rounded-xl border border-outline-variant/80 bg-surface-container-low p-3.5 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        local_shipping
                      </span>
                      <span className="font-extrabold text-on-surface text-body-sm truncate">
                        {p.company || "Delivery Package"}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      House {p.unitId?.label} · {p.createdAt ? timeAgo(p.createdAt) : "Today"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-surface-container-lowest border border-primary/30 px-3 py-1.5 text-center shadow-inner shrink-0">
                    <span className="block text-[9px] font-bold uppercase text-outline">Pickup PIN</span>
                    <span className="font-mono text-title-sm font-black text-primary tracking-wider">{pin}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isSocietySuspended && maintenanceAlert && (
        <Link
          to="/maintenance"
          className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
            maintenanceAlert.overdue
              ? "border-red-200 bg-red-50 hover:bg-red-100"
              : "border-amber-200 bg-amber-50 hover:bg-amber-100"
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${
              maintenanceAlert.overdue ? "bg-error" : "bg-amber-500"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">
              {maintenanceAlert.overdue ? "error" : "notification_important"}
            </span>
          </span>
          <p className="min-w-0 flex-1 text-body-sm font-semibold text-on-surface sm:text-body-md">
            Pay your maintenance
            <span className="block truncate text-label-sm font-normal text-on-surface-variant sm:text-label-md">
              {maintenanceAlert.text}
            </span>
          </p>
          <span className="hidden shrink-0 items-center gap-1 text-label-md font-semibold text-primary sm:inline-flex">
            Pay Now
            <span className="material-symbols-outlined text-[16px] transition-transform duration-200 group-hover:translate-x-1">
              arrow_forward
            </span>
          </span>
        </Link>
      )}

      {isWingOnly && filteredAdminCards.length > 0 && (
        <CardSection title="Wing Admin" cards={filteredAdminCards} variant="admin" badges={badges} isLocked={isSocietySuspended} />
      )}

      {isCommitteeRole && roleTitle && filteredAdminCards.length > 0 && (
        <CardSection title={roleTitle} cards={filteredAdminCards} variant="admin" badges={badges} isLocked={isSocietySuspended} />
      )}

      {isAdmin && !isCommitteeRole && filteredAdminCards.length > 0 && (
        <CardSection title="Society Admin" cards={filteredAdminCards} variant="admin" badges={badges} isLocked={isSocietySuspended} />
      )}

      {isAdminWithWing && filteredWingCards.length > 0 && (
        <CardSection title="Wing Admin" cards={filteredWingCards} variant="admin" badges={badges} isLocked={isSocietySuspended} />
      )}

      <CardSection title="General" cards={generalCards} badges={badges} isLocked={isSocietySuspended} />

      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>Recent Notices</SectionTitle>
          <Link
            to="/notices"
            className="group inline-flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-label-sm font-medium text-primary no-underline transition-colors hover:bg-secondary-fixed sm:text-label-md"
          >
            View all
            <span className="material-symbols-outlined text-[15px] transition-transform duration-200 group-hover:translate-x-0.5">
              arrow_forward
            </span>
          </Link>
        </div>
        <div className="mt-3 space-y-2.5 sm:space-y-3">
          {noticesQuery.isLoading &&
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-container-high" />
            ))}
          {recentNotices.map((notice, index) => (
            <NoticeItem key={notice.id} {...notice} featured={index === 0} />
          ))}
          {noticesQuery.isSuccess && recentNotices.length === 0 && (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-8 text-center text-body-sm text-on-surface-variant">
              No notices yet.
              {isAdmin && (
                <Link to="/notices/new" className="ml-1 text-primary hover:underline">
                  Publish the first one.
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
