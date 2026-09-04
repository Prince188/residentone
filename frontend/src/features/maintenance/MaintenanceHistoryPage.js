import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getCycles, extractApiError, formatAmount, formatDate, periodLabel } from "../../lib/maintenance";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

function CycleCard({ cycle }) {
  const period = periodLabel(cycle.month, cycle.year, cycle.durationMonths);
  const isOverdue = new Date(cycle.dueDate) < new Date();
  return (
    <Link
      to={`/dues/cycles/${cycle.id}`}
      className="group relative block overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-4 pl-5 no-underline transition-transform hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="truncate text-body-md font-semibold text-on-surface">{period}</h3>
              {cycle.wing && (
                <span className="rounded-full bg-primary/15 text-primary font-bold px-2 py-0.5 text-[10px]">
                  Wing {cycle.wing}
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-label-sm text-outline">
              <span className={`rounded-full px-2 py-0.5 text-label-sm font-semibold ${isOverdue ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                {isOverdue ? "Overdue" : "Active"}
              </span>
              <span>Due {formatDate(cycle.dueDate)}</span>
            </p>
          </div>
        </div>
        <span className="shrink-0 text-body-sm font-bold text-on-surface">{formatAmount(cycle.ownerAmount || cycle.amount)}</span>
      </div>
      <div className="mt-2 text-label-sm text-on-surface-variant">
        <span>Owner {formatAmount(cycle.ownerAmount || cycle.amount)}</span>
        <span> · Renter {formatAmount(cycle.renterAmount || cycle.amount)}</span>
        {cycle.lateCharge > 0 && <span> · Late {formatAmount(cycle.lateCharge)}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between text-label-sm text-outline">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">event</span>
          {period}
        </span>
        <span className="flex items-center gap-1 text-primary font-medium">
          View details <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
        </span>
      </div>
    </Link>
  );
}

export default function MaintenanceHistoryPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManage = hasPermission(membership?.role, "manage_maintenance", permissionsQuery.data);

  const cyclesQuery = useQuery({
    queryKey: ["maintenance", "cycles", activeSociety?.id],
    queryFn: async () => (await getCycles()).data.data,
    enabled: Boolean(activeSociety),
  });

  const cycles = cyclesQuery.data || [];

  if (!canManage) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="page-title mt-3">No permission</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">You don’t have permission to view maintenance history. Ask your Society Admin for <strong>Manage Maintenance</strong>.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-label-md text-primary no-underline hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dues" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Manage Maintenance
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span> Maintenance History
          </h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}All cycles — like August - 2026, July - 2026
          </p>
        </div>
        <Link to="/dues" className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md text-on-surface hover:border-primary hover:text-primary no-underline">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Manage
        </Link>
      </section>

      <div className="rounded-lg bg-surface-container-high px-3 py-2 text-label-sm text-on-surface-variant flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px]">info</span>
        Tap a card to view house cards and download Excel for that period.
      </div>

      {cyclesQuery.isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {cyclesQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(cyclesQuery.error, "Failed to load maintenance history.")}
        </div>
      )}

      {cyclesQuery.isSuccess && cycles.length === 0 && (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">request_quote</span>
          <p className="mt-3 text-body-md font-semibold text-on-surface">No maintenance yet</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">Use Create Maintenance to add your first cycle.</p>
        </div>
      )}

      {cycles.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cycles.map((c) => (
            <CycleCard key={c.id} cycle={c} />
          ))}
        </div>
      )}
    </div>
  );
}
