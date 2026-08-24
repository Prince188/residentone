import { Link } from "react-router-dom";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, {
  selectActiveSociety,
  selectActiveMembership,
  selectPrimaryUnit,
} from "../../stores/society.store";
import SummaryCard from "../../components/cards/SummaryCard";
import FeatureCard from "../../components/cards/FeatureCard";

const summaryCards = [
  { icon: "build", label: "Maintenance", value: "₹2,500 Due", hint: "Next due in 12 days", to: "/maintenance", tone: "warning" },
  { icon: "badge", label: "Today's Visitors", value: "1", hint: "1 expected entry", to: "/visitors", tone: "default" },
];

const quickActions = [
  { icon: "payments", label: "Pay Maintenance", to: "/maintenance" },
  { icon: "report_problem", label: "Raise Complaint", to: "/complaints" },
  { icon: "pool", label: "Book Amenity", to: "/amenities" },
];

const adminQuickActions = [
  { icon: "apartment", label: "Manage Houses", to: "/houses" },
  { icon: "request_quote", label: "Society Dues", to: "/dues" },
];

const exploreFeatures = [
  { icon: "pool", title: "Amenities", description: "Book shared facilities", to: "/amenities" },
  { icon: "folder_open", title: "Documents", description: "Records & forms", to: "/documents" },
  { icon: "how_to_vote", title: "Polls & Voting", description: "Vote on decisions", to: "/polls" },
  { icon: "groups", title: "Society Directory", description: "Neighbors & contacts", to: "/directory" },
  { icon: "home_work", title: "My Unit", description: "Your property details", to: "/my-unit" },
  { icon: "emergency", title: "Emergency Contacts", description: "Help & helplines", to: "/emergency-contacts" },
];

const recentNotices = [
  {
    id: 1,
    title: "Annual General Meeting",
    excerpt: "Society meeting scheduled for Sunday, 10 AM at the clubhouse.",
    date: "2 days ago",
    featured: true,
  },
  {
    id: 2,
    title: "Water Tank Cleaning",
    excerpt: "Water supply will be paused on Saturday between 9 AM and 12 PM.",
    date: "5 days ago",
  },
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
    <h2 className="text-body-lg font-semibold text-on-surface">{children}</h2>
  );
}

function HeroActionChip({ icon, label, to, highlight }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-label-md no-underline transition-colors ${
        highlight
          ? "bg-white text-primary hover:bg-primary-fixed"
          : "border border-white/30 bg-white/10 text-white hover:bg-white/25"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </Link>
  );
}

function NoticeItem({ title, excerpt, date, featured }) {
  return (
    <article
      className={`flex gap-3 rounded-xl border p-4 transition-colors ${
        featured
          ? "border-primary-fixed bg-primary-fixed/40 hover:bg-primary-fixed/60"
          : "border-outline-variant bg-surface-container-lowest hover:border-outline"
      }`}
    >
      <span
        className={`material-symbols-outlined mt-0.5 shrink-0 text-[22px] ${
          featured ? "text-primary" : "text-on-surface-variant"
        }`}
      >
        campaign
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-body-md font-semibold text-on-surface">{title}</h3>
          <span className="shrink-0 text-label-sm text-outline">{date}</span>
        </div>
        <p className="mt-0.5 text-body-sm text-on-surface-variant">{excerpt}</p>
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
  const actions = isAdmin ? [...adminQuickActions, ...quickActions] : quickActions;

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-6xl space-y-stack-lg">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-headline-md text-white">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="mt-1 text-body-sm text-primary-fixed-dim">
              Here is what is happening in your society today.
            </p>
          </div>
          {activeMembership && <RolePill role={activeMembership.role} />}
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-white/15 pt-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <span className="material-symbols-outlined text-white text-[26px]">apartment</span>
          </span>
          {activeSociety ? (
            <div className="min-w-0">
              <p className="truncate text-body-lg font-semibold text-white">
                {activeSociety.name}
              </p>
              <p className="truncate text-label-md text-primary-fixed-dim">
                {activeUnit ? activeUnit.label : "No unit assigned"}
                {activeMembership?.units?.length > 1 && (
                  <> · +{activeMembership.units.length - 1} more unit(s)</>
                )}
              </p>
            </div>
          ) : (
            <p className="text-body-sm text-primary-fixed-dim">
              You are not linked to any society yet. Contact your society admin to get added.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {actions.map((action, index) => (
            <HeroActionChip key={action.label} {...action} highlight={index === 0} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-stack-lg lg:grid-cols-3">
        <div className="space-y-stack-lg lg:col-span-2">
          <section>
            <SectionTitle>Overview</SectionTitle>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {summaryCards.map((card) => (
                <SummaryCard key={card.label} {...card} />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <SectionTitle>Recent Notices</SectionTitle>
              <Link to="/notices" className="text-label-md text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {recentNotices.map((notice) => (
                <NoticeItem key={notice.id} {...notice} />
              ))}
              {recentNotices.length === 0 && (
                <p className="text-body-sm text-on-surface-variant">No notices yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-stack-lg">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <SectionTitle>Explore Society</SectionTitle>
            <div className="mt-3 space-y-2">
              {exploreFeatures.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
