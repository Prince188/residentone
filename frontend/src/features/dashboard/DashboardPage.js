import { Link } from "react-router-dom";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, {
  selectActiveSociety,
  selectActiveMembership,
  selectPrimaryUnit,
} from "../../stores/society.store";
import SummaryCard from "../../components/cards/SummaryCard";
import QuickActionCard from "../../components/cards/QuickActionCard";
import FeatureCard from "../../components/cards/FeatureCard";

const summaryCards = [
  { icon: "build", label: "Maintenance", value: "₹2,500 Due", hint: "Next due in 12 days", to: "/maintenance", tone: "warning" },
  { icon: "payments", label: "Payments", value: "Paid", hint: "Last receipt: Jun 2026", to: "/payments", tone: "success" },
  { icon: "report_problem", label: "Open Complaints", value: "2", hint: "1 in progress", to: "/complaints", tone: "default" },
  { icon: "badge", label: "Today's Visitors", value: "1", hint: "1 expected entry", to: "/visitors", tone: "default" },
];

const quickActions = [
  { icon: "payments", label: "Pay Maintenance", to: "/payments" },
  { icon: "report_problem", label: "Raise Complaint", to: "/complaints" },
  { icon: "person_add", label: "Add Visitor", to: "/visitors" },
  { icon: "pool", label: "Book Amenity", to: "/amenities" },
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
          ? "bg-primary-fixed text-on-primary-fixed"
          : "bg-secondary-fixed text-on-secondary-fixed"
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

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const activeUnit = useSocietyStore(selectPrimaryUnit);

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-6xl space-y-stack-lg">
      <section>
        <h1 className="text-headline-md text-on-surface">
          {getGreeting()}, {firstName} 👋
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Here is what is happening in your society today.
        </p>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
            Active Society
          </p>
          {activeMembership && <RolePill role={activeMembership.role} />}
        </div>
        {activeSociety ? (
          <div className="mt-2 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[30px]">apartment</span>
            <div className="min-w-0">
              <p className="truncate text-body-lg font-semibold text-on-surface">
                {activeSociety.name}
              </p>
              <p className="truncate text-body-sm text-on-surface-variant">
                {activeUnit ? activeUnit.label : "No unit assigned"}
                {activeMembership?.units?.length > 1 && (
                  <> · +{activeMembership.units.length - 1} more unit(s)</>
                )}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-body-md text-on-surface-variant">
            You are not linked to any society yet. Contact your society admin to get added.
          </p>
        )}
      </section>

      <section>
        <SectionTitle>Overview</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Quick Actions</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.label} {...action} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Explore Society</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exploreFeatures.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
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
            <article
              key={notice.id}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-body-md font-semibold text-on-surface">{notice.title}</h3>
                <span className="shrink-0 text-label-sm text-outline">{notice.date}</span>
              </div>
              <p className="mt-1 text-body-sm text-on-surface-variant">{notice.excerpt}</p>
            </article>
          ))}
          {recentNotices.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">No notices yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
