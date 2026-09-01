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
import { getSocietyStats, listSocieties, SOCIETY_STATUS_LABELS, SOCIETY_TYPE_LABELS } from "../../lib/societies";
import StatusBadge from "../../components/ui/StatusBadge";
import api from "../../lib/api";
import { hasPermissionForMembership, getMembershipRoles } from "../../lib/permissions";
import { getBadges } from "../../lib/dashboard";

const superAdminCards = [
  { icon: "apartment", label: "Societies", to: "/admin/societies", desc: "Manage all registered societies" },
  { icon: "pending_actions", label: "Pending Approvals", to: "/admin/societies/pending", desc: "Review new society registrations", badgeKey: "pending" },
  { icon: "add_business", label: "New Society", to: "/admin/societies/new", desc: "Manually provision a new society" },
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

function SectionTitle({ children }) {
  return (
    <h2 className="flex items-center gap-2 text-body-md font-semibold text-on-surface sm:text-body-lg">
      <span aria-hidden="true" className="h-4 w-1 rounded-full bg-primary" />
      {children}
    </h2>
  );
}

function SquareCard({ icon, label, to, tint, badge }) {
  const showBadge = badge != null && Number(badge) > 0;
  const display = showBadge ? (Number(badge) > 99 ? "99+" : String(badge)) : null;
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

function CardSection({ title, cards, variant = "general", badges }) {
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
 * Super Admin Dedicated Dashboard View
 * Displays only platform-level overview, statistics, and platform admin tools.
 */
function SuperAdminDashboardView({ user }) {
  const firstName = user?.name?.split(" ")[0] || "Super Admin";

  const statsQuery = useQuery({
    queryKey: ["superadmin-society-stats"],
    queryFn: async () => (await getSocietyStats()).data.data,
  });
  const stats = statsQuery.data || { total: 0, pending: 0, active: 0, rejected: 0, suspended: 0, totalUnits: 0, totalUsers: 0 };

  const pendingSocietiesQuery = useQuery({
    queryKey: ["superadmin-pending-societies"],
    queryFn: async () => (await listSocieties({ status: "pending", limit: 5 })).data.data,
  });
  const pendingSocieties = pendingSocietiesQuery.data || [];

  const recentSocietiesQuery = useQuery({
    queryKey: ["superadmin-recent-societies"],
    queryFn: async () => (await listSocieties({ limit: 5 })).data.data,
  });
  const recentSocieties = recentSocietiesQuery.data || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-7">
      {/* Super Admin Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed p-5 shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-28 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/70 sm:text-label-sm">
              {getGreeting()}
            </p>
            <h1 className="mt-1 text-headline-md font-bold leading-snug text-white sm:text-headline-lg">
              {firstName}
            </h1>
            <p className="mt-1 text-body-sm text-white/80">
              ResidentOne Platform Control & Health Center
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RolePill isSuper={true} />
          </div>
        </div>
      </section>

      {/* State of the Website - Platform KPI Statistics Grid */}
      <section>
        <SectionTitle>Platform Overview & Statistics</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-medium text-outline">Total Societies</span>
              <span className="material-symbols-outlined text-primary text-[20px]">domain</span>
            </div>
            <p className="mt-2 text-headline-sm font-bold text-on-surface">
              {statsQuery.isLoading ? "..." : stats.total}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-medium text-outline">Active</span>
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
            </div>
            <p className="mt-2 text-headline-sm font-bold text-on-surface">
              {statsQuery.isLoading ? "..." : stats.active}
            </p>
          </div>

          <Link
            to="/admin/societies/pending"
            className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm no-underline transition-all hover:border-primary/50 hover:bg-surface-container-low hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-semibold text-on-surface">Pending Review</span>
              <span className="material-symbols-outlined text-primary text-[20px] transition-transform group-hover:scale-110">pending_actions</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-headline-sm font-bold text-on-surface">
                {statsQuery.isLoading ? "..." : stats.pending}
              </p>
              {stats.pending > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white uppercase">Action</span>
              )}
            </div>
          </Link>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-medium text-outline">Suspended</span>
              <span className="material-symbols-outlined text-outline text-[20px]">block</span>
            </div>
            <p className="mt-2 text-headline-sm font-bold text-on-surface">
              {statsQuery.isLoading ? "..." : stats.suspended}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-medium text-outline">Total Units</span>
              <span className="material-symbols-outlined text-primary text-[20px]">apartment</span>
            </div>
            <p className="mt-2 text-headline-sm font-bold text-on-surface">
              {statsQuery.isLoading ? "..." : (stats.totalUnits ?? "-")}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-medium text-outline">Platform Users</span>
              <span className="material-symbols-outlined text-primary text-[20px]">group</span>
            </div>
            <p className="mt-2 text-headline-sm font-bold text-on-surface">
              {statsQuery.isLoading ? "..." : (stats.totalUsers ?? "-")}
            </p>
          </div>
        </div>
      </section>

      {/* Super Admin Quick Navigation Actions */}
      <section>
        <SectionTitle>Platform Administration</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {superAdminCards.map((card) => {
            const hasPendingBadge = card.badgeKey === "pending" && stats.pending > 0;
            return (
              <Link
                key={card.label}
                to={card.to}
                className="group flex items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-container-low hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  <span className="material-symbols-outlined text-[26px]">{card.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-body-md font-semibold text-on-surface">{card.label}</h3>
                    {hasPendingBadge && (
                      <span className="rounded-full bg-error px-2 py-0.5 text-label-sm font-bold text-white">
                        {stats.pending}
                      </span>
                    )}
                  </div>
                  <p className="text-label-sm text-on-surface-variant truncate">{card.desc}</p>
                </div>
                <span className="material-symbols-outlined text-outline transition-transform group-hover:translate-x-1 group-hover:text-primary">
                  arrow_forward
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Pending Approvals Quick Review List */}
      {stats.pending > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <SectionTitle>Pending Society Registrations</SectionTitle>
            <Link
              to="/admin/societies/pending"
              className="inline-flex items-center gap-1 text-label-md font-semibold text-primary no-underline hover:underline"
            >
              View all pending ({stats.pending})
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {pendingSocietiesQuery.isLoading ? (
              <div className="h-20 animate-pulse rounded-xl bg-surface-container-high" />
            ) : (
              pendingSocieties.map((society) => (
                <div
                  key={society.id || society._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm transition-colors hover:bg-surface-container-low"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-body-md font-bold text-on-surface">{society.name}</h4>
                      <StatusBadge status="pending" />
                    </div>
                    <p className="mt-0.5 text-label-sm text-on-surface-variant">
                      {society.city}, {society.state} · {society.totalUnits} Units · Contact: {society.contactPersonName} ({society.contactPhone})
                    </p>
                  </div>
                  <Link
                    to={`/admin/societies/${society.id || society._id}`}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-label-md font-semibold text-on-primary no-underline shadow-sm transition-colors hover:bg-primary/90"
                  >
                    Review & Approve
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Recent Societies Platform Directory */}
      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>Recent Societies on Platform</SectionTitle>
          <Link
            to="/admin/societies"
            className="inline-flex items-center gap-1 text-label-md font-semibold text-primary no-underline hover:underline"
          >
            View all societies
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
        <div className="mt-3 divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          {recentSocietiesQuery.isLoading ? (
            <div className="p-6 text-center text-body-sm text-outline">Loading societies...</div>
          ) : recentSocieties.length === 0 ? (
            <div className="p-6 text-center text-body-sm text-on-surface-variant">No societies registered yet.</div>
          ) : (
            recentSocieties.map((soc) => (
              <Link
                key={soc.id || soc._id}
                to={`/admin/societies/${soc.id || soc._id}`}
                className="flex items-center justify-between p-4 text-on-surface no-underline transition-colors hover:bg-surface-container-low"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-body-md font-semibold text-on-surface">{soc.name}</span>
                    <StatusBadge status={soc.status} />
                  </div>
                  <p className="mt-0.5 text-label-sm text-on-surface-variant truncate">
                    {soc.city}, {soc.state} · {SOCIETY_TYPE_LABELS[soc.societyType] || "Apartment"} · {soc.totalUnits} Units
                  </p>
                </div>
                <span className="material-symbols-outlined shrink-0 text-outline text-[20px]">
                  chevron_right
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
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
  const isWingOnly = activeRoles.includes("wing_admin") && !isAdmin;
  const activeRole = activeMembership?.role;
  const committeeRoles = ["manager","treasurer","accountant","helpdesk_manager","auditor","committee_member"];
  const isCommitteeRole = activeRoles.some((r) => committeeRoles.includes(r));
  const roleTitle = ROLE_TITLES[activeRole];

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety) && !isSuperAdmin,
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
    queryKey: ["dashboard-badges", activeSociety?.id, isSuperAdmin ? "super" : "member"],
    queryFn: async () => (await getBadges()).data.data,
    enabled: Boolean(activeSociety) && !isSuperAdmin,
    staleTime: 30000,
    refetchInterval: 30000,
  });
  const badges = badgesQuery.data || {};

  const noticesQuery = useQuery({
    queryKey: ["notices", activeSociety?.id, "recent"],
    queryFn: async () => (await getNotices(2)).data.data,
    enabled: Boolean(activeSociety) && !isSuperAdmin,
  });
  const recentNotices = noticesQuery.data || [];

  const maintenanceQuery = useQuery({
    queryKey: ["maintenance", "latest"],
    queryFn: async () => (await getLatestCycle()).data.data,
    enabled: Boolean(activeSociety) && !isSuperAdmin,
  });

  // If user is platform Super Admin, render exclusively the Super Admin Platform Dashboard View
  if (isSuperAdmin) {
    return <SuperAdminDashboardView user={user} />;
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

      {maintenanceAlert && (
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
        <CardSection title="Wing Admin" cards={filteredAdminCards} variant="admin" badges={badges} />
      )}

      {isCommitteeRole && roleTitle && filteredAdminCards.length > 0 && (
        <CardSection title={roleTitle} cards={filteredAdminCards} variant="admin" badges={badges} />
      )}

      {isAdmin && !isCommitteeRole && filteredAdminCards.length > 0 && (
        <CardSection title="Society Admin" cards={filteredAdminCards} variant="admin" badges={badges} />
      )}

      {isAdminWithWing && filteredWingCards.length > 0 && (
        <CardSection title="Wing Admin" cards={filteredWingCards} variant="admin" badges={badges} />
      )}

      <CardSection title="General" cards={generalCards} badges={badges} />

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
