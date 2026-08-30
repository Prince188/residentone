import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership } from "../../stores/society.store";
import {
  STATUS_UI,
  extractApiError,
  formatAmount,
  formatDate,
  getLatestCycle,
  periodLabel,
} from "../../lib/maintenance";

function UnitCard({ unit, cycleId }) {
  const status = STATUS_UI[unit.status] || STATUS_UI.pending;
  const displayAmount = unit.amount || unit.totalAmount;
  return (
    <Link
      to={`/maintenance/${unit.unitId}?cycle=${cycleId}`}
      className={`relative block overflow-hidden rounded-xl border p-4 pl-5 no-underline transition-transform hover:-translate-y-0.5 hover:shadow-md ${status.card}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${status.stripe}`} />
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.iconBox}`}>
          <span className="material-symbols-outlined text-[22px]">
            {unit.isOwner ? "home" : "home_work"}
          </span>
        </span>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${status.pill}`}
        >
          <span className="material-symbols-outlined text-[13px]">{status.icon}</span>
          {status.label}
        </span>
      </div>
      <p className="mt-3 truncate text-headline-sm font-semibold text-on-surface">House {unit.label}</p>
      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
        {unit.isOwner ? "Owner" : unit.isTenant ? "Renter" : unit.houseRole === "owner" ? "Owner" : "Renter"} {displayAmount ? `· ${formatAmount(displayAmount)}` : ""}
      </p>
    </Link>
  );
}

export default function MaintenancePage() {
  const activeMembership = useSocietyStore(selectActiveMembership);
  const units = activeMembership?.units || [];

  const latestQuery = useQuery({
    queryKey: ["maintenance", "latest"],
    queryFn: async () => (await getLatestCycle()).data.data,
  });

  if (!units.length) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
        <section>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">Track dues and manage your maintenance payments.</p>
        </section>
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">home_work</span>
          <p className="mt-3 text-body-md text-on-surface-variant">
            You are not assigned to any house yet. Contact your society admin to get added.
          </p>
        </div>
      </div>
    );
  }

  const cycle = latestQuery.data;

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <section>
        <Link
          to="/dashboard"
          className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Dashboard
        </Link>
        <h1 className="page-title">Maintenance</h1>
        <p className="page-subtitle">
          {cycle
            ? `${periodLabel(cycle.month, cycle.year, cycle.durationMonths)} · Owner ${formatAmount(cycle.ownerAmount || cycle.amount)} / Renter ${formatAmount(cycle.renterAmount || cycle.amount)} · due by ${formatDate(cycle.dueDate)}`
            : "Select a house to view dues."}
        </p>
      </section>

      {latestQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {units.map((u) => (
            <div key={u.id} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {latestQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(latestQuery.error, "Failed to load maintenance dues.")}
        </div>
      )}

      {latestQuery.isSuccess && !cycle && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">event_available</span>
          <p className="mt-3 text-body-md text-on-surface-variant">
            No maintenance has been raised yet. You will see dues here once your society admin creates one.
          </p>
        </div>
      )}

      {cycle && cycle.myUnits && cycle.myUnits.length > 0 && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cycle.myUnits.map((unit) => (
            <UnitCard key={unit.unitId} unit={unit} cycleId={cycle.id} />
          ))}
        </section>
      )}
    </div>
  );
}
