import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, {
  selectActiveSociety,
  selectActiveMembership,
  selectPrimaryUnit,
} from "../../stores/society.store";
import SummaryCard from "../../components/cards/SummaryCard";
import { getNotices, timeAgo } from "../../lib/notices";

const summaryCards = [
  { icon: "build", label: "Maintenance", value: "₹2,500 Due", hint: "Next due in 12 days", to: "/maintenance", tone: "warning" },
  { icon: "badge", label: "Today's Visitors", value: "1", hint: "1 expected entry", to: "/visitors", tone: "default" },
];

const adminCards = [
  { icon: "apartment", label: "Manage Houses", to: "/houses" },
  { icon: "request_quote", label: "Society Dues", to: "/dues" },
  { icon: "edit_square", label: "Create Notice", to: "/notices/new" },
];

const generalCards = [
  { icon: "payments", label: "Pay Dues", to: "/maintenance" },
  { icon: "report_problem", label: "Complaints", to: "/complaints" },
  { icon: "badge", label: "Visitors", to: "/visitors" },
  { icon: "campaign", label: "Notices", to: "/notices" },
  { icon: "pool", label: "Amenities", to: "/amenities" },
  { icon: "folder_open", label: "Documents", to: "/documents" },
  { icon: "how_to_vote", label: "Polls", to: "/polls" },
  { icon: "groups", label: "Directory", to: "/directory" },
  { icon: "home_work", label: "My Unit", to: "/my-unit" },
  { icon: "emergency", label: "Emergency", to: "/emergency-contacts" },
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

function RolePill({ role }) {
  const isAdmin = role === "society_admin" || role === "super_admin";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${
        isAdmin
          ? "bg-on-primary-fixed text-primary"
          : "bg-white/20 text-white"
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">
        {isAdmin ? "shield_person" : "person"}
      </span>
      {isAdmin ? "Society Admin" : "Resident"}
    </span>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-body-md font-semibold text-on-surface sm:text-body-lg">{children}</h2>
  );
}

function SquareCard({ icon, label, to, tint }) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest p-2 no-underline transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-surface-container-low hover:shadow-sm sm:gap-2 sm:p-3"
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-105 sm:h-11 sm:w-11 ${tint}`}
      >
        <span className="material-symbols-outlined text-[20px] sm:text-[24px]">{icon}</span>
      </span>
      <span className="w-full truncate px-0.5 text-center text-[10px] font-semibold leading-tight text-on-surface sm:text-xs">
        {label}
      </span>
    </Link>
  );
}

function CardSection({ title, cards, variant = "general" }) {
  const cols =
    cards.length <= 4
      ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"
      : "grid-cols-4 sm:grid-cols-5 lg:grid-cols-10";
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div className={`mt-2 grid gap-2 sm:mt-3 sm:gap-3 ${cols}`}>
        {cards.map((card, index) => (
          <SquareCard
            key={card.label}
            {...card}
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
      className={`flex gap-3 rounded-xl border p-3 transition-colors sm:p-4 ${
        featured
          ? "border-primary-fixed bg-primary-fixed/40 hover:bg-primary-fixed/60"
          : "border-outline-variant bg-surface-container-lowest hover:border-outline"
      }`}
    >
      <span
        className={`material-symbols-outlined mt-0.5 shrink-0 text-[18px] sm:text-[22px] ${
          featured ? "text-primary" : "text-on-surface-variant"
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

  const isAdmin =
    activeMembership?.role === "society_admin" ||
    activeMembership?.role === "super_admin";

  const noticesQuery = useQuery({
    queryKey: ["notices", activeSociety?.id, "recent"],
    queryFn: async () => (await getNotices(2)).data.data,
    enabled: Boolean(activeSociety),
  });
  const recentNotices = noticesQuery.data || [];

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed p-4 sm:rounded-2xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold leading-snug text-white sm:text-headline-md">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="mt-0.5 text-xs text-primary-fixed-dim sm:text-body-sm">
              Here is what is happening in your society today.
            </p>
          </div>
          {activeMembership && <RolePill role={activeMembership.role} />}
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-white/15 pt-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 sm:h-11 sm:w-11 sm:rounded-xl">
            <span className="material-symbols-outlined text-[22px] text-white sm:text-[26px]">apartment</span>
          </span>
          {activeSociety ? (
            <div className="min-w-0">
              <p className="truncate text-body-sm font-semibold text-white sm:text-body-lg">
                {activeSociety.name}
              </p>
              <p className="truncate text-[11px] text-primary-fixed-dim sm:text-label-md">
                {activeUnit ? activeUnit.label : "No unit assigned"}
                {activeMembership?.units?.length > 1 && (
                  <> · +{activeMembership.units.length - 1} more unit(s)</>
                )}
              </p>
            </div>
          ) : (
            <p className="text-xs text-primary-fixed-dim sm:text-body-sm">
              You are not linked to any society yet. Contact your society admin to get added.
            </p>
          )}
        </div>
      </section>

      {isAdmin && <CardSection title="Society Admin" cards={adminCards} variant="admin" />}

      <CardSection title="General" cards={generalCards} />

      <section>
        <SectionTitle>Overview</SectionTitle>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:mt-3 sm:gap-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>Recent Notices</SectionTitle>
          <Link to="/notices" className="text-label-sm text-primary hover:underline sm:text-label-md">
            View all
          </Link>
        </div>
        <div className="mt-2 space-y-2 sm:mt-3 sm:space-y-3">
          {noticesQuery.isLoading &&
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-container-high" />
            ))}
          {recentNotices.map((notice, index) => (
            <NoticeItem key={notice.id} {...notice} featured={index === 0} />
          ))}
          {noticesQuery.isSuccess && recentNotices.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">
              No notices yet.
              {isAdmin && (
                <Link to="/notices/new" className="ml-1 text-primary hover:underline">
                  Publish the first one.
                </Link>
              )}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
