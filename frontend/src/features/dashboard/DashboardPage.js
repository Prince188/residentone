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
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";
import { getBadges } from "../../lib/dashboard";

const superAdminCards = [
  { icon: "apartment", label: "Societies", to: "/admin/societies" },
  { icon: "pending_actions", label: "Pending Approvals", to: "/admin/societies/pending" },
];

const adminCards = [
  { icon: "apartment", label: "Manage Houses", to: "/houses" },
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
  const isPrivileged = isSuper || ["society_admin", "super_admin", "manager", "treasurer", "accountant", "helpdesk_manager", "auditor", "committee_member"].includes(role);
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

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const activeUnit = useSocietyStore(selectPrimaryUnit);

  const isSuperAdmin = user?.role?.includes("super_admin");
  const isAdmin =
    activeMembership?.role === "society_admin" ||
    activeMembership?.role === "super_admin";
  const activeRole = activeMembership?.role;
  const isCommitteeRole = [
    "manager",
    "treasurer",
    "accountant",
    "helpdesk_manager",
    "auditor",
    "committee_member",
  ].includes(activeRole);
  const roleTitle = ROLE_TITLES[activeRole];

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const customPermissions = permissionsQuery.data || {};

  const cardPermissionMap = {
    "Manage Houses": "manage_houses",
    "Manage Maintenance": "manage_maintenance",
    "Manage Collections": "manage_collections",
    "Create Collection": "manage_collections",
    "Create Notice": "create_notice",
    "Manage Amenities": "manage_amenities",
    "Create Poll": "create_poll",
    "Create Survey": "create_survey",
    "Manage Committee": "manage_committee",
  };

  const filteredAdminCards = (isCommitteeRole || isAdmin
    ? adminCards.filter((card) => {
        const perm = cardPermissionMap[card.label];
        if (!perm) return true;
        return hasPermission(activeRole, perm, customPermissions);
      })
    : []);

  const badgesQuery = useQuery({
    queryKey: ["dashboard-badges", activeSociety?.id, isSuperAdmin ? "super" : "member"],
    queryFn: async () => (await getBadges()).data.data,
    enabled: Boolean(activeSociety) || Boolean(isSuperAdmin),
    staleTime: 30000,
    refetchInterval: 30000,
  });
  const badges = badgesQuery.data || {};

  const noticesQuery = useQuery({
    queryKey: ["notices", activeSociety?.id, "recent"],
    queryFn: async () => (await getNotices(2)).data.data,
    enabled: Boolean(activeSociety),
  });
  const recentNotices = noticesQuery.data || [];

  const maintenanceQuery = useQuery({
    queryKey: ["maintenance", "latest"],
    queryFn: async () => (await getLatestCycle()).data.data,
    enabled: Boolean(activeSociety),
  });

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
          {(activeMembership || isSuperAdmin) && (
            <RolePill role={activeMembership?.role} isSuper={isSuperAdmin} />
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

      {isSuperAdmin && (
        <CardSection title="Super Admin" cards={superAdminCards} variant="admin" badges={badges} />
      )}

      {isCommitteeRole && roleTitle && filteredAdminCards.length > 0 && (
        <CardSection title={roleTitle} cards={filteredAdminCards} variant="admin" badges={badges} />
      )}

      {isAdmin && !isCommitteeRole && filteredAdminCards.length > 0 && (
        <CardSection title="Society Admin" cards={filteredAdminCards} variant="admin" badges={badges} />
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
