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

import HouseCard from "../../components/cards/HouseCard";

function UnitCard({ unit, cycleId }) {
  const displayAmount = unit.amount || unit.totalAmount;
  const isSettled = ["paid", "late_paid"].includes(unit.status);
  const dateLine = isSettled && unit.paidOn ? `Paid on ${formatDate(unit.paidOn)}` : null;
  const roleLabel = unit.isOwner ? "Owner" : unit.isTenant ? "Renter" : unit.houseRole === "owner" ? "Owner" : "Renter";

  return (
    <HouseCard
      house={{
        label: unit.label,
        block: unit.block,
        floor: unit.floor,
        ownerName: roleLabel,
      }}
      variant="billing"
      status={unit.status || "pending"}
      amount={displayAmount}
      dateLine={dateLine}
      to={`/maintenance/${unit.unitId}?cycle=${cycleId}`}
    />
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
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
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
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
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
