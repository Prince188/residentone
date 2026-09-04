import { useState } from "react";
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
import { getSocietyStats } from "../../lib/societies";
import { getVisitorStats, getVisitors, getGateParcels } from "../../lib/visitors";
import api from "../../lib/api";
import { hasPermissionForMembership, getMembershipRoles } from "../../lib/permissions";
import { getBadges } from "../../lib/dashboard";
import SubscriptionStatusCard, { getSubscriptionRenewalMeta } from "./SubscriptionStatusCard";

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
  { icon: "package_2", label: "Gate Parcels", to: "/visitors?tab=parcels" },
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

function SquareCard({ icon, label, to, tint, badge, isLocked, isSubscriptionUnpaid }) {
  const showBadge = !isLocked && badge != null && Number(badge) > 0;
  const display = showBadge ? (Number(badge) > 99 ? "99+" : String(badge)) : null;

  if (isLocked) {
    const tooltip = isSubscriptionUnpaid
      ? "Locked: Subscription payment required to unlock this feature."
      : "Locked: Society is frozen. Please contact the admin.";
    return (
      <div
        title={tooltip}
        className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-low p-3 opacity-50 cursor-not-allowed select-none transition-all shadow-none"
      >
        <span
          className={`absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-surface-container-lowest ${
            isSubscriptionUnpaid ? "bg-amber-600" : "bg-error"
          }`}
        >
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

function CardSection({ title, cards, variant = "general", badges, isLocked = false, isSubscriptionUnpaid = false }) {
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
            isSubscriptionUnpaid={isSubscriptionUnpaid}
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
/**
 * Interactive 12-Month Revenue Trend Chart Component
 */
function RevenueTrendChart({ data = [] }) {
  const [activeIdx, setActiveIdx] = useState(data.length > 0 ? data.length - 1 : 0);
  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue || 0));
  const activeItem = data[activeIdx] || data[data.length - 1] || { revenue: 0, label: "" };

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-primary shrink-0" />
            <h3 className="text-body-md font-bold text-on-surface">Revenue Chart — Last 12 Months</h3>
          </div>
          <p className="text-label-sm text-on-surface-variant mt-0.5">
            Trailing 12-month platform SaaS subscription revenue
          </p>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            to="/admin/analytics?chart=revenue"
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-label-sm font-bold text-on-surface no-underline shadow-xs hover:border-primary hover:text-primary transition-all cursor-pointer"
            title="Open full multi-year historical analytics and detailed monthly breakdown"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            <span className="hidden xs:inline">View Expand</span>
          </Link>
          <div className="rounded-xl bg-primary/5 px-3 py-1.5 text-right border border-primary/20">
            <span className="text-[11px] font-semibold text-on-surface-variant block uppercase">
              {activeItem.label}
            </span>
            <span className="text-headline-sm font-extrabold text-primary">
              ₹{(activeItem.revenue || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Chart Bars */}
      <div className="mt-6">
        <div className="flex h-52 items-end gap-2 sm:gap-3">
          {data.map((item, idx) => {
            const heightPercent = item.revenue > 0 ? Math.max(8, Math.round(((item.revenue || 0) / maxRevenue) * 100)) : 3;
            const isSelected = idx === activeIdx;
            return (
              <div
                key={item.label || idx}
                className="group relative flex-1 flex flex-col items-center justify-end h-full cursor-pointer"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => setActiveIdx(idx)}
              >
                {/* Floating tooltip on hover */}
                {isSelected && (
                  <div className="absolute -top-9 z-20 whitespace-nowrap rounded-lg bg-on-surface px-2.5 py-1 text-[11px] font-bold text-white shadow-md animate-in fade-in zoom-in-95 duration-150">
                    ₹{(item.revenue || 0).toLocaleString("en-IN")}
                  </div>
                )}

                {/* The Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-lg transition-all duration-300 ${
                    item.revenue > 0
                      ? isSelected
                        ? "bg-gradient-to-t from-primary via-primary to-primary-container shadow-md"
                        : "bg-primary/20 hover:bg-primary/40"
                      : isSelected
                      ? "bg-primary/40"
                      : "bg-surface-container-highest hover:bg-outline-variant"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Month Labels Axis */}
        <div className="mt-3 flex justify-between gap-1 border-t border-outline-variant/60 pt-2 text-[10px] sm:text-[11px] font-semibold text-on-surface-variant">
          {data.map((item, idx) => (
            <span
              key={item.label || idx}
              className={`flex-1 text-center truncate ${
                idx === activeIdx ? "text-primary font-bold" : "text-on-surface-variant"
              }`}
            >
              {item.month}
            </span>
          ))}
        </div>

        {/* Informative notice if no subscriptions sold yet */}
        {maxRevenue <= 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-on-surface-variant bg-surface-container-low rounded-xl py-1.5 px-3">
            <span className="material-symbols-outlined text-[15px] text-outline">info</span>
            <span>No paid subscriptions sold yet — Genuine subscription revenue: ₹0</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Interactive 12-Month Society Growth Chart Component
 */
function SocietyGrowthChart({ data = [] }) {
  const [activeIdx, setActiveIdx] = useState(data.length > 0 ? data.length - 1 : 0);
  const maxCumulative = Math.max(1, ...data.map((d) => d.cumulative || 1));
  const activeItem = data[activeIdx] || data[data.length - 1] || { cumulative: 0, newSocieties: 0, label: "" };

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-emerald-600 shrink-0" />
            <h3 className="text-body-md font-bold text-on-surface">Society Growth — Last 12 Months</h3>
          </div>
          <p className="text-label-sm text-on-surface-variant mt-0.5">
            Monthly society onboarding rate and cumulative platform footprint
          </p>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            to="/admin/analytics?chart=growth"
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-label-sm font-bold text-on-surface no-underline shadow-xs hover:border-emerald-600 hover:text-emerald-700 transition-all cursor-pointer"
            title="Open full multi-year historical analytics and detailed monthly breakdown"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            <span className="hidden xs:inline">View Expand</span>
          </Link>
          <div className="rounded-xl bg-emerald-50 px-3 py-1.5 text-right border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 block uppercase">
              {activeItem.label} Total
            </span>
            <span className="text-headline-sm font-extrabold text-emerald-700">
              {activeItem.cumulative || 0} Societies
            </span>
          </div>
        </div>
      </div>

      {/* Visual Chart Bars */}
      <div className="mt-6">
        <div className="flex h-52 items-end gap-2 sm:gap-3">
          {data.map((item, idx) => {
            const heightPercent = Math.max(10, Math.round(((item.cumulative || 0) / maxCumulative) * 100));
            const isSelected = idx === activeIdx;
            return (
              <div
                key={item.label || idx}
                className="group relative flex-1 flex flex-col items-center justify-end h-full cursor-pointer"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => setActiveIdx(idx)}
              >
                {/* Floating tooltip on hover */}
                {isSelected && (
                  <div className="absolute -top-10 z-20 whitespace-nowrap rounded-lg bg-emerald-950 px-2.5 py-1 text-[11px] font-bold text-white shadow-md animate-in fade-in zoom-in-95 duration-150">
                    +{item.newSocieties} New · {item.cumulative} Total
                  </div>
                )}

                {/* The Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-lg transition-all duration-300 ${
                    isSelected
                      ? "bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 shadow-md"
                      : "bg-emerald-100 hover:bg-emerald-200"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Month Labels Axis */}
        <div className="mt-3 flex justify-between gap-1 border-t border-outline-variant/60 pt-2 text-[10px] sm:text-[11px] font-semibold text-on-surface-variant">
          {data.map((item, idx) => (
            <span
              key={item.label || idx}
              className={`flex-1 text-center truncate ${
                idx === activeIdx ? "text-emerald-700 font-bold" : "text-on-surface-variant"
              }`}
            >
              {item.month}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Super Admin Master Platform Dashboard View
 * Strictly structured according to platform hierarchy:
 * 1. Platform Overview (Top 4 most prominent primary scale cards)
 * 2. Society Overview (Clean clickable status cards with filters)
 * 3. Action Required (Urgent actionable tasks with direct links)
 * 4. Financial & Subscription Overview (8 key cards + 12-Month Revenue Chart)
 * 5. Platform Growth (Growth KPIs + 12-Month Society Growth Chart)
 * 6. Platform Usage (Compact volume statistics)
 * 7. Recent Platform Activity (Chronological platform event feed)
 */
function SuperAdminDashboardView({ user }) {
  const firstName = user?.name?.split(" ")[0] || "Super Admin";

  const statsQuery = useQuery({
    queryKey: ["superadmin-society-stats"],
    queryFn: async () => (await getSocietyStats()).data.data,
    refetchInterval: 15000,
  });
  const stats = statsQuery.data || {};

  const overview = stats.overview || {
    totalSocieties: stats.total || 0,
    totalUnits: stats.totalUnits || 0,
    totalResidents: 0,
    activeUsers: stats.totalUsers || 0,
  };

  const societies = stats.societies || {
    active: stats.active || 0,
    pending: stats.pending || 0,
    trial: 0,
    suspended: stats.suspended || 0,
    churned: stats.archived || 0,
    newThisMonth: 0,
    total: stats.total || 0,
  };

  const actionRequired = stats.actionRequired || {
    pendingSocieties: stats.pending || 0,
    pendingAdmins: stats.pending || 0,
    pendingKyc: stats.pending || 0,
    supportTickets: 0,
    reportedIssues: 0,
    paymentIssues: 0,
  };

  const financials = stats.financials || {
    mrr: 0,
    revenueThisMonth: 0,
    totalRevenue: 0,
    activeSubscriptions: societies.active || 0,
    trialSubscriptions: societies.trial || 0,
    expiringSubscriptions: 0,
    overduePayments: 0,
    failedPayments: 0,
    revenueLast12Months: [],
    plansBreakdown: {},
  };

  const [activePlanModal, setActivePlanModal] = useState(null); // 'starter' | 'professional' | 'enterprise' | null
  const plansBreakdown = financials.plansBreakdown || {};

  const growth = stats.growth || {
    newSocietiesThisMonth: societies.newThisMonth || 0,
    newResidentsThisMonth: 0,
    newUnitsThisMonth: 0,
    newSubscriptions: societies.active || 0,
    churnedSocieties: societies.churned || 0,
    societyGrowthRate: 0,
    societyGrowthLast12Months: [],
  };

  const usage = stats.usage || {
    activeResidents: overview.totalResidents || 0,
    registeredUsers: overview.registeredUsers || 0,
    dau: 0,
    mau: 0,
    visitorsLogged: 0,
    deliveriesLogged: 0,
    complaintsCreated: 0,
    maintenanceTransactions: 0,
    notificationsSent: 0,
    otpEmailSent: 0,
    otpSmsSent: 0,
    otpTotalSent: 0,
  };

  const recentActivity = stats.recentActivity || [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Platform Header & Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed p-6 text-white shadow-xl sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-32 h-56 w-56 rounded-full bg-white/5" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                {getGreeting()}
              </span>
              <span className="text-white/40">·</span>
              <RolePill isSuper={true} />
              <span className="text-white/40">·</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Multi-Tenant Cluster
              </span>
            </div>
            <h1 className="text-headline-md font-bold leading-tight sm:text-headline-lg">
              {firstName}
            </h1>
            <p className="text-body-sm text-white/80 sm:text-body-md max-w-2xl">
              ResidentOne Executive Command Center — Platform-wide footprint, society lifecycle, subscription revenue, and growth telemetry.
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
              Societies Directory
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 1. TOP-LEVEL PLATFORM STATISTICS (Primary Most Prominent Cards)           */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <SectionTitle subtitle="Core platform magnitude across all residential complexes">
          Platform Overview
        </SectionTitle>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          {/* Total Societies */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-primary/5 p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                Total Societies
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-[26px]">domain</span>
              </span>
            </div>
            <p className="mt-4 text-[38px] font-extrabold leading-none text-on-surface tracking-tight">
              {statsQuery.isLoading ? "..." : (overview.totalSocieties || 0).toLocaleString("en-IN")}
            </p>
            <div className="mt-3 flex items-center gap-2 text-label-sm text-on-surface-variant">
              <span className="font-semibold text-emerald-600">{societies.active || 0} Paid</span>
              <span>·</span>
              <span className="font-medium text-primary">{societies.approved || 0} Approved</span>
              <span>·</span>
              <span>{societies.pending || 0} Pending</span>
            </div>
          </div>

          {/* Total Units */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-outline-variant bg-surface-container-lowest p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                Total Housing Units
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">apartment</span>
              </span>
            </div>
            <p className="mt-4 text-[38px] font-extrabold leading-none text-on-surface tracking-tight">
              {statsQuery.isLoading ? "..." : (overview.totalUnits || 0).toLocaleString("en-IN")}
            </p>
            <p className="mt-3 text-label-sm text-on-surface-variant">
              Flats, apartments & villas managed
            </p>
          </div>

          {/* Total Residents */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-outline-variant bg-surface-container-lowest p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                Total Residents
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">groups</span>
              </span>
            </div>
            <p className="mt-4 text-[38px] font-extrabold leading-none text-on-surface tracking-tight">
              {statsQuery.isLoading ? "..." : (overview.totalResidents || 0).toLocaleString("en-IN")}
            </p>
            <p className="mt-3 text-label-sm text-on-surface-variant">
              Owners & tenants registered on platform
            </p>
          </div>

          {/* Active Users */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-outline-variant bg-surface-container-lowest p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                Active Users
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">how_to_reg</span>
              </span>
            </div>
            <p className="mt-4 text-[38px] font-extrabold leading-none text-on-surface tracking-tight">
              {statsQuery.isLoading ? "..." : (overview.activeUsers || 0).toLocaleString("en-IN")}
            </p>
            <div className="mt-3 flex items-center gap-2 text-label-sm text-on-surface-variant">
              <span className="font-semibold text-primary">Linked with societies</span>
              <span>·</span>
              <span>{(overview.registeredUsers || 0).toLocaleString("en-IN")} Registered</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SOCIETY OVERVIEW (Clickable status filter cards)                       */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <SectionTitle subtitle="Status distribution across society lifecycle (Click to filter directory)">
          Society Overview
        </SectionTitle>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 pt-1">
          {/* 1. Total Societies */}
          <Link
            to="/admin/societies"
            className="group flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-slate-500 hover:bg-slate-50/50 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
              <span className="material-symbols-outlined text-outline text-[18px] transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700">
                arrow_forward
              </span>
            </div>
            <div className="mt-3">
              <p className="text-headline-md font-extrabold text-on-surface">{societies.total || 0}</p>
              <p className="text-label-sm font-semibold text-on-surface-variant mt-0.5">Total Societies</p>
            </div>
          </Link>

          {/* 2. Active (Paid) */}
          <Link
            to="/admin/societies?status=active_paid"
            className="group flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-emerald-500 hover:bg-emerald-50/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="material-symbols-outlined text-outline text-[18px] transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600">
                arrow_forward
              </span>
            </div>
            <div className="mt-3">
              <p className="text-headline-md font-extrabold text-emerald-600">{societies.active || 0}</p>
              <p className="text-label-sm font-semibold text-on-surface-variant mt-0.5">Active (Paid)</p>
            </div>
          </Link>

          {/* 3. Approved (All Paid + Approved) */}
          <Link
            to="/admin/societies?status=approved"
            className="group flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-primary hover:bg-primary/5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="material-symbols-outlined text-outline text-[18px] transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
                arrow_forward
              </span>
            </div>
            <div className="mt-3">
              <p className="text-headline-md font-extrabold text-on-surface">{societies.approved || 0}</p>
              <p className="text-label-sm font-semibold text-on-surface-variant mt-0.5">Approved</p>
            </div>
          </Link>

          {/* 4. Pending */}
          <Link
            to="/admin/societies?status=pending"
            className="group flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-amber-500 hover:bg-amber-50/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="material-symbols-outlined text-outline text-[18px] transition-transform group-hover:translate-x-0.5 group-hover:text-amber-600">
                arrow_forward
              </span>
            </div>
            <div className="mt-3">
              <p className="text-headline-md font-extrabold text-amber-600">{societies.pending || 0}</p>
              <p className="text-label-sm font-semibold text-on-surface-variant mt-0.5">Pending</p>
            </div>
          </Link>

          {/* 5. Unpaid (Approved but Not Paid) */}
          <Link
            to="/admin/societies?status=unpaid"
            className="group flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-orange-500 hover:bg-orange-50/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              <span className="material-symbols-outlined text-outline text-[18px] transition-transform group-hover:translate-x-0.5 group-hover:text-orange-600">
                arrow_forward
              </span>
            </div>
            <div className="mt-3">
              <p className="text-headline-md font-extrabold text-orange-600">{societies.unpaid || 0}</p>
              <p className="text-label-sm font-semibold text-on-surface-variant mt-0.5">Unpaid</p>
            </div>
          </Link>

          {/* 6. Suspended */}
          <Link
            to="/admin/societies?status=suspended"
            className="group flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-error hover:bg-rose-50/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-2.5 rounded-full bg-error" />
              <span className="material-symbols-outlined text-outline text-[18px] transition-transform group-hover:translate-x-0.5 group-hover:text-error">
                arrow_forward
              </span>
            </div>
            <div className="mt-3">
              <p className="text-headline-md font-extrabold text-on-surface">{societies.suspended || 0}</p>
              <p className="text-label-sm font-semibold text-on-surface-variant mt-0.5">Suspended</p>
            </div>
          </Link>

          {/* 7. Rejected */}
          <Link
            to="/admin/societies?status=rejected"
            className="group flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-red-600 hover:bg-red-50/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
              <span className="material-symbols-outlined text-outline text-[18px] transition-transform group-hover:translate-x-0.5 group-hover:text-red-600">
                arrow_forward
              </span>
            </div>
            <div className="mt-3">
              <p className="text-headline-md font-extrabold text-on-surface">{societies.rejected || 0}</p>
              <p className="text-label-sm font-semibold text-on-surface-variant mt-0.5">Rejected</p>
            </div>
          </Link>

          {/* 8. Freeze / Churned */}
          <Link
            to="/admin/societies?status=churned"
            className="group flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-stone-500 hover:bg-stone-50/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-2.5 rounded-full bg-stone-500" />
              <span className="material-symbols-outlined text-outline text-[18px] transition-transform group-hover:translate-x-0.5 group-hover:text-stone-700">
                arrow_forward
              </span>
            </div>
            <div className="mt-3">
              <p className="text-headline-md font-extrabold text-on-surface">{societies.churned || 0}</p>
              <p className="text-label-sm font-semibold text-on-surface-variant mt-0.5">Freeze / Churned</p>
            </div>
          </Link>

          {/* 9. Trial */}
          <Link
            to="/admin/societies?status=trial"
            className="group flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-sky-500 hover:bg-sky-50/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span className="material-symbols-outlined text-outline text-[18px] transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600">
                arrow_forward
              </span>
            </div>
            <div className="mt-3">
              <p className="text-headline-md font-extrabold text-on-surface">{societies.trial || 0}</p>
              <p className="text-label-sm font-semibold text-on-surface-variant mt-0.5">Trial</p>
            </div>
          </Link>

          {/* 10. New This Month */}
          <Link
            to="/admin/societies"
            className="group flex flex-col justify-between rounded-2xl border border-primary/30 bg-primary/5 p-4 no-underline shadow-sm transition-all hover:border-primary hover:bg-primary/10 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <span className="material-symbols-outlined text-primary text-[18px] transition-transform group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </div>
            <div className="mt-3">
              <p className="text-headline-md font-extrabold text-primary">+{societies.newThisMonth || 0}</p>
              <p className="text-label-sm font-semibold text-primary mt-0.5">New This Month</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. ACTION REQUIRED (Interactive Urgency Cards)                           */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <SectionTitle subtitle="Critical queues and items awaiting Super Admin review or resolution">
          Action Required
        </SectionTitle>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
          {/* Pending Society Approvals */}
          <Link
            to="/admin/societies/pending"
            className="group flex items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-amber-500 hover:bg-amber-50/30 hover:shadow-md"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <span className="material-symbols-outlined text-[24px]">pending_actions</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-body-sm font-bold text-on-surface group-hover:text-amber-800 truncate">
                  Society Approvals
                </h4>
                <p className="text-[12px] text-on-surface-variant truncate">
                  {actionRequired.pendingSocieties} registration applications waiting
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-label-sm font-bold text-amber-800">
              {actionRequired.pendingSocieties}
            </span>
          </Link>

          {/* Pending Admin Approvals */}
          <Link
            to="/admin/societies?status=pending"
            className="group flex items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-sky-500 hover:bg-sky-50/30 hover:shadow-md"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
                <span className="material-symbols-outlined text-[24px]">shield_person</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-body-sm font-bold text-on-surface group-hover:text-sky-800 truncate">
                  Admin Approvals
                </h4>
                <p className="text-[12px] text-on-surface-variant truncate">
                  {actionRequired.pendingAdmins} society admin appointments
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-label-sm font-bold text-sky-800">
              {actionRequired.pendingAdmins}
            </span>
          </Link>

          {/* Pending Verification / KYC */}
          <Link
            to="/admin/societies?status=pending"
            className="group flex items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-indigo-500 hover:bg-indigo-50/30 hover:shadow-md"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-body-sm font-bold text-on-surface group-hover:text-indigo-800 truncate">
                  Verification / KYC
                </h4>
                <p className="text-[12px] text-on-surface-variant truncate">
                  {actionRequired.pendingKyc} society credentials to review
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-label-sm font-bold text-indigo-800">
              {actionRequired.pendingKyc}
            </span>
          </Link>

          {/* Support Tickets */}
          <Link
            to="/complaints"
            className="group flex items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-primary hover:bg-emerald-50/30 hover:shadow-md"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[24px]">support_agent</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-body-sm font-bold text-on-surface group-hover:text-primary truncate">
                  Support Tickets
                </h4>
                <p className="text-[12px] text-on-surface-variant truncate">
                  {actionRequired.supportTickets} active inquiries across societies
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-surface-container-low px-2.5 py-1 text-label-sm font-bold text-on-surface">
              {actionRequired.supportTickets}
            </span>
          </Link>

          {/* Reported Issues */}
          <Link
            to="/complaints"
            className="group flex items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-rose-500 hover:bg-rose-50/30 hover:shadow-md"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
                <span className="material-symbols-outlined text-[24px]">report_problem</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-body-sm font-bold text-on-surface group-hover:text-rose-800 truncate">
                  Reported Issues
                </h4>
                <p className="text-[12px] text-on-surface-variant truncate">
                  {actionRequired.reportedIssues} high-priority escalated complaints
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-label-sm font-bold text-rose-800">
              {actionRequired.reportedIssues}
            </span>
          </Link>

          {/* Payment Issues */}
          <Link
            to="/admin/societies"
            className="group flex items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 no-underline shadow-sm transition-all hover:border-amber-600 hover:bg-amber-50/30 hover:shadow-md"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <span className="material-symbols-outlined text-[24px]">error_outline</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-body-sm font-bold text-on-surface group-hover:text-amber-800 truncate">
                  Payment Issues
                </h4>
                <p className="text-[12px] text-on-surface-variant truncate">
                  {actionRequired.paymentIssues} failed or disputed transactions
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-label-sm font-bold text-amber-800">
              {actionRequired.paymentIssues}
            </span>
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FINANCIAL & SUBSCRIPTION OVERVIEW (+ 12-Month Revenue Chart)            */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <SectionTitle subtitle="SaaS recurring revenues, active subscriptions and payment performance">
          Financial & Subscription Overview
        </SectionTitle>

        {/* 8 Financial & Subscription KPI Cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-8 pt-1">
          {/* MRR */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">MRR</span>
            <p className="mt-2 text-body-md font-extrabold text-primary truncate">
              ₹{(financials.mrr || 0).toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-outline">
              {financials.projectedMrr && financials.mrr === 0
                ? `₹${financials.projectedMrr.toLocaleString("en-IN")} Pipeline`
                : "Monthly Recurring"}
            </span>
          </div>

          {/* Revenue This Month */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">This Month</span>
            <p className="mt-2 text-body-md font-extrabold text-on-surface truncate">
              ₹{(financials.revenueThisMonth || 0).toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-outline">Paid SaaS This Month</span>
          </div>

          {/* Total Revenue */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">Total Revenue</span>
            <p className="mt-2 text-body-md font-extrabold text-on-surface truncate">
              ₹{(financials.totalRevenue || 0).toLocaleString("en-IN")}
            </p>
            <span className="text-[10px] text-outline">Paid SaaS All-Time</span>
          </div>

          {/* Active Subscriptions */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">Active Subs</span>
            <p className="mt-2 text-body-md font-extrabold text-emerald-700 truncate">
              {financials.activeSubscriptions || 0}
            </p>
            <span className="text-[10px] text-outline">Paid Subscriptions</span>
          </div>

          {/* Trial Subscriptions */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">Trial Subs</span>
            <p className="mt-2 text-body-md font-extrabold text-sky-700 truncate">
              {financials.trialSubscriptions || 0}
            </p>
            <span className="text-[10px] text-outline">Free Evaluation</span>
          </div>

          {/* Expiring Subscriptions */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">Expiring</span>
            <p className="mt-2 text-body-md font-extrabold text-amber-700 truncate">
              {financials.expiringSubscriptions || 0}
            </p>
            <span className="text-[10px] text-outline">Next 14 Days</span>
          </div>

          {/* Overdue Payments */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">Overdue</span>
            <p className="mt-2 text-body-md font-extrabold text-amber-800 truncate">
              {financials.overduePayments || 0}
            </p>
            <span className="text-[10px] text-outline">Pending Collect</span>
          </div>

          {/* Failed Payments */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">Failed</span>
            <p className="mt-2 text-body-md font-extrabold text-error truncate">
              {financials.failedPayments || 0}
            </p>
            <span className="text-[10px] text-outline">Declined Dues</span>
          </div>
        </div>

        {/* 3 Subscription Plans Breakdown: Starter/Basic, Professional/Standard, Enterprise/Premium */}
        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-1 rounded-full bg-primary shrink-0" />
                <h3 className="text-body-md font-bold text-on-surface">Subscription Plans & Society Footprint</h3>
              </div>
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                Distribution of paid societies across 3 SaaS tiers (Click any plan to view enrolled paid societies)
              </p>
            </div>
            <span className="text-[12px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              Paid SaaS Subscribers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Starter / Basic */}
            {(() => {
              const p = plansBreakdown.starter || { label: "Basic", rate: 6, societiesCount: 0, totalUnits: 0, estimatedMRR: 0, societies: [] };
              return (
                <div
                  onClick={() => setActivePlanModal("starter")}
                  className="group rounded-2xl border border-outline-variant bg-surface-container-low/40 hover:bg-surface-container-low p-4 transition-all hover:border-primary cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-body-sm font-bold text-on-surface">Starter (Basic)</span>
                    </div>
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider">₹{p.rate}/unit/mo</span>
                  </div>
                  <p className="mt-1 text-[12px] text-on-surface-variant">Essential billing & resident directories</p>
                  
                  <div className="mt-4 flex items-baseline justify-between border-t border-outline-variant/60 pt-3">
                    <div>
                      <p className="text-headline-sm font-black text-on-surface">{p.societiesCount} {p.societiesCount === 1 ? "Society" : "Societies"}</p>
                      <p className="text-[11px] text-on-surface-variant">{p.totalUnits} managed units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm font-black text-primary">₹{p.estimatedMRR.toLocaleString("en-IN")}/mo</p>
                      <span className="text-[10px] font-bold text-primary group-hover:underline flex items-center justify-end gap-0.5">
                        View Societies <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2. Professional / Standard */}
            {(() => {
              const p = plansBreakdown.professional || { label: "Standard", rate: 10, societiesCount: 0, totalUnits: 0, estimatedMRR: 0, societies: [] };
              return (
                <div
                  onClick={() => setActivePlanModal("professional")}
                  className="group rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 p-4 transition-all hover:border-primary cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span className="text-body-sm font-bold text-primary">Professional (Standard)</span>
                    </div>
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider">₹{p.rate}/unit/mo</span>
                  </div>
                  <p className="mt-1 text-[12px] text-on-surface-variant">Gate security, guard app & amenity bookings</p>
                  
                  <div className="mt-4 flex items-baseline justify-between border-t border-primary/20 pt-3">
                    <div>
                      <p className="text-headline-sm font-black text-primary">{p.societiesCount} {p.societiesCount === 1 ? "Society" : "Societies"}</p>
                      <p className="text-[11px] text-on-surface-variant">{p.totalUnits} managed units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm font-black text-primary">₹{p.estimatedMRR.toLocaleString("en-IN")}/mo</p>
                      <span className="text-[10px] font-bold text-primary group-hover:underline flex items-center justify-end gap-0.5">
                        View Societies <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 3. Enterprise / Premium */}
            {(() => {
              const p = plansBreakdown.enterprise || { label: "Premium", rate: 15, societiesCount: 0, totalUnits: 0, estimatedMRR: 0, societies: [] };
              return (
                <div
                  onClick={() => setActivePlanModal("enterprise")}
                  className="group rounded-2xl border border-outline-variant bg-surface-container-low/40 hover:bg-surface-container-low p-4 transition-all hover:border-violet-600 cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                      <span className="text-body-sm font-bold text-on-surface">Enterprise (Premium)</span>
                    </div>
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider">₹{p.rate}/unit/mo</span>
                  </div>
                  <p className="mt-1 text-[12px] text-on-surface-variant">Full ledgers, elections, vault & dedicated manager</p>
                  
                  <div className="mt-4 flex items-baseline justify-between border-t border-outline-variant/60 pt-3">
                    <div>
                      <p className="text-headline-sm font-black text-on-surface">{p.societiesCount} {p.societiesCount === 1 ? "Society" : "Societies"}</p>
                      <p className="text-[11px] text-on-surface-variant">{p.totalUnits} managed units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm font-black text-violet-700">₹{p.estimatedMRR.toLocaleString("en-IN")}/mo</p>
                      <span className="text-[10px] font-bold text-violet-700 group-hover:underline flex items-center justify-end gap-0.5">
                        View Societies <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 12-Month Revenue Chart */}
        <RevenueTrendChart data={financials.revenueLast12Months || []} />
      </section>

      {/* ========================================================================= */}
      {/* 5. PLATFORM GROWTH (+ 12-Month Society Growth Chart)                       */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <SectionTitle subtitle="Customer acquisition, resident onboarding velocity and expansion rates">
          Platform Growth Analytics
        </SectionTitle>

        {/* Growth KPI Metrics */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6 pt-1">
          {/* New Societies This Month */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">New Societies</span>
            <p className="mt-2 text-headline-sm font-extrabold text-primary">
              +{growth.newSocietiesThisMonth || 0}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Added this month</p>
          </div>

          {/* New Residents This Month */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">New Residents</span>
            <p className="mt-2 text-headline-sm font-extrabold text-emerald-700">
              +{growth.newResidentsThisMonth || 0}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Registered members</p>
          </div>

          {/* New Units This Month */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">New Units</span>
            <p className="mt-2 text-headline-sm font-extrabold text-sky-700">
              +{growth.newUnitsThisMonth || 0}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Configured flats</p>
          </div>

          {/* New Subscriptions */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">New Subs</span>
            <p className="mt-2 text-headline-sm font-extrabold text-indigo-700">
              +{growth.newSubscriptions || 0}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Activated plans</p>
          </div>

          {/* Churned Societies */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">Churned</span>
            <p className="mt-2 text-headline-sm font-extrabold text-on-surface-variant">
              {growth.churnedSocieties || 0}
            </p>
            <p className="text-[11px] text-on-surface-variant mt-0.5">Cancelled / inactive</p>
          </div>

          {/* Society Growth Rate */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-primary">Growth Rate</span>
            <p className="mt-2 text-headline-sm font-extrabold text-primary">
              {growth.societyGrowthRate >= 0 ? `+${growth.societyGrowthRate}%` : `${growth.societyGrowthRate}%`}
            </p>
            <p className="text-[11px] text-primary/80 mt-0.5">Month-over-month</p>
          </div>
        </div>

        {/* 12-Month Society Growth Chart */}
        <SocietyGrowthChart data={growth.societyGrowthLast12Months || []} />
      </section>

      {/* ========================================================================= */}
      {/* 6. PLATFORM USAGE (Compact Section)                                       */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <SectionTitle subtitle="Cross-platform operational volume and active community activity">
          Platform Usage
        </SectionTitle>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-5 xl:grid-cols-10 pt-1">
          {/* Active Residents */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[22px] text-primary">group</span>
            <p className="mt-1 text-headline-sm font-extrabold text-on-surface">
              {(usage.activeResidents || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-semibold text-on-surface-variant">Active Residents</p>
          </div>

          {/* DAU */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[22px] text-emerald-600">bolt</span>
            <p className="mt-1 text-headline-sm font-extrabold text-on-surface">
              {(usage.dau || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-semibold text-on-surface-variant">Daily Active (DAU)</p>
          </div>

          {/* MAU */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[22px] text-sky-600">trending_up</span>
            <p className="mt-1 text-headline-sm font-extrabold text-on-surface">
              {(usage.mau || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-semibold text-on-surface-variant">Monthly Active (MAU)</p>
          </div>

          {/* Visitors Logged */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[22px] text-violet-600">badge</span>
            <p className="mt-1 text-headline-sm font-extrabold text-on-surface">
              {(usage.visitorsLogged || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-semibold text-on-surface-variant">Visitors Logged</p>
          </div>

          {/* Deliveries Logged */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[22px] text-amber-600">package_2</span>
            <p className="mt-1 text-headline-sm font-extrabold text-on-surface">
              {(usage.deliveriesLogged || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-semibold text-on-surface-variant">Deliveries Logged</p>
          </div>

          {/* Complaints Created */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[22px] text-rose-600">report_problem</span>
            <p className="mt-1 text-headline-sm font-extrabold text-on-surface">
              {(usage.complaintsCreated || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-semibold text-on-surface-variant">Complaints Raised</p>
          </div>

          {/* Maintenance Transactions */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[22px] text-teal-600">receipt_long</span>
            <p className="mt-1 text-headline-sm font-extrabold text-on-surface">
              {(usage.maintenanceTransactions || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-semibold text-on-surface-variant">Transactions</p>
          </div>

          {/* Notifications Sent */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[22px] text-indigo-600">notifications</span>
            <p className="mt-1 text-headline-sm font-extrabold text-on-surface">
              {(usage.notificationsSent || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-semibold text-on-surface-variant">Notifications</p>
          </div>

          {/* Email OTPs Sent */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[22px] text-blue-600">mark_email_read</span>
            <p className="mt-1 text-headline-sm font-extrabold text-on-surface">
              {(usage.otpEmailSent || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-semibold text-on-surface-variant">Email OTPs</p>
          </div>

          {/* SMS OTPs Sent */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm text-center">
            <span className="material-symbols-outlined text-[22px] text-emerald-600">sms</span>
            <p className="mt-1 text-headline-sm font-extrabold text-on-surface">
              {(usage.otpSmsSent || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] font-semibold text-on-surface-variant">SMS OTPs</p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. RECENT PLATFORM ACTIVITY (Chronological Event Feed)                   */}
      {/* ========================================================================= */}
      <section className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <SectionTitle subtitle="Real-time timeline of registrations, approvals, status updates and transactions">
            Recent Platform Activity
          </SectionTitle>
          <Link
            to="/admin/societies"
            className="inline-flex items-center gap-1 text-label-sm font-semibold text-primary no-underline hover:underline"
          >
            All societies
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        <div className="mt-2 divide-y divide-outline-variant/60">
          {recentActivity.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant text-body-sm">
              No recent platform activity logged.
            </div>
          ) : (
            recentActivity.map((evt) => (
              <div key={evt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 hover:bg-surface-container-low/40 px-2 rounded-xl transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[18px] ${
                      evt.type === "society_approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : evt.type === "payment_recorded"
                        ? "bg-primary/10 text-primary"
                        : evt.type === "reported_issue"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {evt.type === "society_approved"
                        ? "verified"
                        : evt.type === "payment_recorded"
                        ? "payments"
                        : evt.type === "reported_issue"
                        ? "report_problem"
                        : "apartment"}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-body-sm font-bold text-on-surface truncate">
                        {evt.title}
                      </h4>
                      <span className="rounded-md bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant truncate">
                        {evt.societyName}
                      </span>
                    </div>
                    <p className="text-[12px] text-on-surface-variant truncate mt-0.5">
                      {evt.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-12 sm:pl-0">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                      evt.status === "active" || evt.status === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : evt.status === "failed"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {evt.status}
                  </span>
                  <span className="text-[12px] text-outline whitespace-nowrap">
                    {timeAgo(evt.timestamp)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Subscription Plan Societies Modal / Drawer */}
      {activePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-primary" />
                  <h3 className="text-title-md font-extrabold text-on-surface">
                    {plansBreakdown[activePlanModal]?.label || "Plan"} Tier Paid Societies
                  </h3>
                </div>
                <p className="text-label-sm text-on-surface-variant mt-0.5">
                  Societies with active, paid subscriptions in the {plansBreakdown[activePlanModal]?.label} tier (₹{plansBreakdown[activePlanModal]?.rate}/unit/mo)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePlanModal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Content / Society List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-outline-variant/60">
              {(!plansBreakdown[activePlanModal]?.societies || plansBreakdown[activePlanModal]?.societies.length === 0) ? (
                <div className="py-8 text-center text-body-sm text-on-surface-variant">
                  No societies have paid for this subscription tier yet.
                </div>
              ) : (
                plansBreakdown[activePlanModal].societies.map((s) => (
                  <div key={s._id} className="flex items-center justify-between gap-4 py-3 hover:bg-surface-container-low/40 px-2 rounded-xl transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/societies/${s._id}`}
                          className="text-body-md font-bold text-on-surface hover:text-primary no-underline truncate"
                        >
                          {s.name}
                        </Link>
                        <span className="rounded-md bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                          {s.city}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-label-sm text-on-surface-variant">
                          {s.totalUnits} Units · Billing: <span className="capitalize">{s.subscriptionBilling}</span>
                        </span>
                        {(() => {
                          const meta = getSubscriptionRenewalMeta(s);
                          if (!meta.formattedDate) return null;
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              meta.isExpired
                                ? "bg-red-100 text-red-800"
                                : meta.isExpiringSoon
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}>
                              <span className="material-symbols-outlined text-[12px]">
                                {meta.isExpired ? "error" : "event"}
                              </span>
                              <span>
                                {meta.isExpired
                                  ? `Expired ${meta.formattedDate}`
                                  : `Expires ${meta.formattedDate} (${meta.daysRemaining}d left)`}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-body-sm font-black text-primary block">
                          ₹{s.monthlyFee.toLocaleString("en-IN")}/mo
                        </span>
                        <span className="text-[10px] text-outline capitalize">{s.status}</span>
                      </div>
                      <Link
                        to={`/admin/societies/${s._id}`}
                        className="rounded-lg bg-surface-container-low p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors no-underline"
                        title="Open Society Console"
                      >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-outline-variant/60 pt-3">
              <span className="text-[12px] text-on-surface-variant">
                Total: <strong>{plansBreakdown[activePlanModal]?.societiesCount || 0}</strong> societies (<strong>{plansBreakdown[activePlanModal]?.totalUnits || 0}</strong> units)
              </span>
              <button
                type="button"
                onClick={() => setActivePlanModal(null)}
                className="rounded-xl bg-primary px-4 py-2 text-label-md font-bold text-white hover:bg-inverse-surface transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
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
    { icon: "groups", label: "Resident Directory", to: "/directory", desc: "Find residents, flat numbers, doctors & electricians" },
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
      const firstWing = activeMembership?.assignedWings?.[0];
      const wingDuesTo = firstWing ? `/dues?wing=${encodeURIComponent(firstWing)}` : "/dues";
      return adminCards
        .filter((card) =>
          ["Manage Wing", "Manage Maintenance", "Create Poll", "Create Survey", "Create Notice"].includes(card.label) &&
          hasPermissionForMembership(activeMembership, cardPermissionMap[card.label] || "create_poll", customPermissions)
        )
        .map((card) =>
          card.label === "Manage Maintenance"
            ? { ...card, label: firstWing ? `Wing ${firstWing} Maintenance` : "Manage Maintenance", to: wingDuesTo }
            : card
        );
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
    if (isAdminWithWing) {
      const firstWing = activeMembership?.assignedWings?.[0];
      const wingDuesTo = firstWing ? `/dues?wing=${encodeURIComponent(firstWing)}` : "/dues";
      return adminCards
        .filter((card) => ["Manage Wing", "Manage Maintenance", "Create Poll", "Create Survey"].includes(card.label))
        .map((card) =>
          card.label === "Manage Maintenance"
            ? { ...card, label: firstWing ? `Wing ${firstWing} Maintenance` : "Manage Maintenance", to: wingDuesTo }
            : card
        );
    }
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

  const renewalMeta = getSubscriptionRenewalMeta(activeSociety);
  const isSubscriptionExpired = Boolean(activeSociety?.isSubscriptionPaid) && renewalMeta.isExpired;
  const isSubscriptionUnpaid =
    Boolean(activeSociety) &&
    !activeSociety.isSubscriptionPaid &&
    !isSuperAdmin;

  const isLocked = isSocietySuspended || isSubscriptionUnpaid || (isSubscriptionExpired && !isSuperAdmin);

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-7">
      {/* 🔒 Subscription Payment Required / Expired Warning Banner */}
      {(isSubscriptionUnpaid || isSubscriptionExpired) && !isSuperAdmin && (
        <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-50 to-surface-container-lowest p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
              isSubscriptionExpired ? "bg-red-600" : "bg-amber-600"
            }`}>
              <span className="material-symbols-outlined text-[26px]">lock</span>
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-body-lg font-bold text-on-surface">
                  {isSubscriptionExpired ? "Subscription Expired" : "Subscription Payment Required"}
                </h3>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white ${
                  isSubscriptionExpired ? "bg-red-600" : "bg-amber-600"
                }`}>
                  Features Locked
                </span>
                {isSubscriptionExpired && renewalMeta.formattedDate && (
                  <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 border border-red-200 px-2.5 py-0.5 text-[11px] font-semibold">
                    Expired on {renewalMeta.formattedDate}
                  </span>
                )}
              </div>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                {isSubscriptionExpired ? (
                  <>
                    Your subscription for <strong className="text-on-surface">{activeSociety?.name}</strong> expired on <strong className="text-on-surface">{renewalMeta.formattedDate}</strong>. Platform features are temporarily locked. Please renew below to restore uninterrupted access.
                  </>
                ) : (
                  <>
                    Your society (<strong className="text-on-surface">{activeSociety?.name}</strong>) is approved. Please activate and pay your subscription below to unlock management tools, maintenance billing, resident directories, and amenities.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

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
            <div className="min-w-0 flex-1 flex flex-wrap items-center justify-between gap-2">
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

              {/* Society Subscription Expiry Badge */}
              {activeSociety.isSubscriptionPaid && renewalMeta.formattedDate && (
                <div className={`shrink-0 rounded-xl px-3 py-1.5 backdrop-blur-md border text-right ${
                  renewalMeta.isExpired
                    ? "bg-red-500/25 border-red-400/40 text-white"
                    : renewalMeta.isExpiringSoon
                    ? "bg-amber-500/25 border-amber-400/40 text-white"
                    : "bg-white/15 border-white/20 text-white"
                }`}>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="material-symbols-outlined text-[14px]">
                      {renewalMeta.isExpired ? "error" : renewalMeta.isExpiringSoon ? "warning" : "event"}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                      {renewalMeta.isExpired ? "Expired" : "Expires / Renews"}
                    </span>
                  </div>
                  <span className="block text-[12px] font-extrabold leading-tight">
                    {renewalMeta.formattedDate}
                    {renewalMeta.daysRemaining > 0 && !renewalMeta.isExpired && (
                      <span className="text-[10px] font-medium opacity-85 ml-1">
                        ({renewalMeta.daysRemaining}d left)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/80 sm:text-body-sm">
              You are not linked to any society yet. Contact your society admin to get added.
            </p>
          )}
        </div>
      </section>

      {/* 💳 Subscription Activation & Status Card */}
      <SubscriptionStatusCard isAdmin={isAdmin} />

      {/* 📦 Resident Parcel Waiting at Gate Banner */}
      {!isLocked && waitingParcels.length > 0 && (
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

      {!isLocked && maintenanceAlert && (
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
        <CardSection title="Wing Admin" cards={filteredAdminCards} variant="admin" badges={badges} isLocked={isLocked} isSubscriptionUnpaid={isSubscriptionUnpaid} />
      )}

      {isCommitteeRole && roleTitle && filteredAdminCards.length > 0 && (
        <CardSection title={roleTitle} cards={filteredAdminCards} variant="admin" badges={badges} isLocked={isLocked} isSubscriptionUnpaid={isSubscriptionUnpaid} />
      )}

      {isAdmin && !isCommitteeRole && filteredAdminCards.length > 0 && (
        <CardSection title="Society Admin" cards={filteredAdminCards} variant="admin" badges={badges} isLocked={isLocked} isSubscriptionUnpaid={isSubscriptionUnpaid} />
      )}

      {isAdminWithWing && filteredWingCards.length > 0 && (
        <CardSection title="Wing Admin" cards={filteredWingCards} variant="admin" badges={badges} isLocked={isLocked} isSubscriptionUnpaid={isSubscriptionUnpaid} />
      )}

      <CardSection title="General" cards={generalCards} badges={badges} isLocked={isLocked} isSubscriptionUnpaid={isSubscriptionUnpaid} />

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
