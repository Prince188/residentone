import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { extractApiError } from "../../lib/houses";
import {
  STATUS_UI,
  formatAmount,
  formatDate,
  getCycles,
  getCycleUnits,
  createCycle,
  periodLabel,
} from "../../lib/maintenance";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

function DuesCard({ unit, cycle }) {
  const status = STATUS_UI[unit.status] || STATUS_UI.pending;
  const isSettled = ["paid", "late_paid"].includes(unit.status);
  const dateLine = isSettled
    ? `Paid on ${formatDate(unit.paidOn)}`
    : `Due by ${formatDate(cycle.dueDate)}`;

  return (
    <Link
      to={`/dues/${unit.unitId}?cycle=${cycle.id}`}
      className={`relative block overflow-hidden rounded-xl border p-4 pl-5 no-underline transition-transform hover:-translate-y-0.5 hover:shadow-md ${status.card}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${status.stripe}`} />
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.iconBox}`}>
          <span className="material-symbols-outlined text-[22px]">
            {unit.isOccupied ? "home" : "home_work"}
          </span>
        </span>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${status.pill}`}
        >
          <span className="material-symbols-outlined text-[13px]">{status.icon}</span>
          {status.label}
        </span>
      </div>
      <p className="mt-3 truncate text-headline-sm font-semibold text-on-surface">
        House {unit.label}
      </p>
      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant flex items-center gap-1.5">
        {unit.ownerName ? (
          <>
            <span>{unit.ownerName}</span>
            {unit.isRenterOccupied && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                Renter
              </span>
            )}
          </>
        ) : (
          "No resident assigned"
        )}
      </p>
      <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] font-semibold text-on-surface-variant">
        <span className="material-symbols-outlined shrink-0 text-[13px]">event</span>
        {dateLine}
      </p>
    </Link>
  );
}

function CreateMaintenanceModal({ onClose, onCreate, loading, apiError, latestCycle }) {
  const nextStart = useMemo(() => {
    if (!latestCycle) {
      const today = new Date();
      return {
        month: today.getMonth() + 1,
        year: today.getFullYear(),
      };
    }
    const duration = latestCycle.durationMonths || 1;
    const totalMonths = (latestCycle.month - 1) + duration;
    return {
      month: (totalMonths % 12) + 1,
      year: latestCycle.year + Math.floor(totalMonths / 12),
    };
  }, [latestCycle]);

  const defaultFrom = useMemo(() => {
    return `${nextStart.year}-${String(nextStart.month).padStart(2, "0")}`;
  }, [nextStart]);

  const defaultTo = useMemo(() => {
    // 3 month range default: from nextStart to nextStart + 2 months
    const totalMonths = (nextStart.month - 1) + 2;
    const toMonth = (totalMonths % 12) + 1;
    const toYear = nextStart.year + Math.floor(totalMonths / 12);
    return `${toYear}-${String(toMonth).padStart(2, "0")}`;
  }, [nextStart]);

  const [fromMonthStr, setFromMonthStr] = useState(defaultFrom);
  const [toMonthStr, setToMonthStr] = useState(defaultTo);
  const [dueDate, setDueDate] = useState("");
  const [ownerAmount, setOwnerAmount] = useState("");
  const [renterAmount, setRenterAmount] = useState("");
  const [lateCharge, setLateCharge] = useState("");
  const [error, setError] = useState("");

  const duration = useMemo(() => {
    if (!fromMonthStr || !toMonthStr) return 0;
    const [fY, fM] = fromMonthStr.split("-").map(Number);
    const [tY, tM] = toMonthStr.split("-").map(Number);
    return (tY - fY) * 12 + (tM - fM) + 1;
  }, [fromMonthStr, toMonthStr]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ownerAmount || Number(ownerAmount) <= 0) {
      setError("Enter valid Owner amount.");
      return;
    }
    if (!renterAmount || Number(renterAmount) < 0) {
      setError("Enter valid Renter amount.");
      return;
    }
    if (duration <= 1) {
      setError("To month must be after From month.");
      return;
    }
    if (!dueDate) {
      setError("Select a due date.");
      return;
    }
    if (lateCharge && Number(lateCharge) < 0) {
      setError("Late charge cannot be negative.");
      return;
    }
    setError("");

    const [fY, fM] = fromMonthStr.split("-").map(Number);
    const finalOwnerAmount = Number(ownerAmount) * duration;
    const finalRenterAmount = Number(renterAmount) * duration;

    onCreate({
      month: fM,
      year: fY,
      dueDate,
      ownerAmount: finalOwnerAmount,
      renterAmount: finalRenterAmount,
      amount: finalOwnerAmount,
      durationMonths: duration,
      lateCharge: Number(lateCharge) || 0,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-body-lg font-semibold text-on-surface">Create Maintenance</h2>
            <p className="page-subtitle">
              Members will see a payment alert on their dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cm-from" className="mb-1 block text-label-sm text-on-surface-variant">
                From Month *
              </label>
              <input
                id="cm-from"
                type="month"
                value={fromMonthStr}
                onChange={(e) => setFromMonthStr(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="cm-to" className="mb-1 block text-label-sm text-on-surface-variant">
                To Month *
              </label>
              <input
                id="cm-to"
                type="month"
                value={toMonthStr}
                onChange={(e) => setToMonthStr(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cm-due" className="mb-1 block text-label-sm text-on-surface-variant">
                Due Date *
              </label>
              <input
                id="cm-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="cm-late-charge" className="mb-1 block text-label-sm text-on-surface-variant">
                Late Charge (₹)
              </label>
              <input
                id="cm-late-charge"
                type="number"
                min="0"
                value={lateCharge}
                onChange={(e) => setLateCharge(e.target.value)}
                placeholder="e.g. 200"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cm-owner-amount" className="mb-1 block text-label-sm text-on-surface-variant">
                Owner Amount (₹/month) *
              </label>
              <input
                id="cm-owner-amount"
                type="number"
                min="1"
                value={ownerAmount}
                onChange={(e) => setOwnerAmount(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="cm-renter-amount" className="mb-1 block text-label-sm text-on-surface-variant">
                Renter Amount (₹/month) *
              </label>
              <input
                id="cm-renter-amount"
                type="number"
                min="0"
                value={renterAmount}
                onChange={(e) => setRenterAmount(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <p className="text-label-sm text-outline">Owner pays owner amount, Renter pays renter amount — shown accordingly.</p>

          {duration > 1 && (ownerAmount || renterAmount) && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-label-md font-semibold text-primary">
              Total for {duration} months: ₹{(Number(ownerAmount || 0) * duration).toLocaleString("en-IN")} (Owner) / ₹{(Number(renterAmount || 0) * duration).toLocaleString("en-IN")} (Renter)
            </p>
          )}

          {(error || apiError) && (
            <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">
              {error || apiError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-outline-variant px-4 py-2 text-label-md text-on-surface transition-colors hover:border-primary hover:text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-label-md text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SocietyDuesPage() {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState("");
  const [searchParams] = useSearchParams();
  const [selectedCycleId, setSelectedCycleId] = useState(
    searchParams.get("period")
  );

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManageMaintenance = hasPermission(activeMembership?.role, "manage_maintenance", permissionsQuery.data);

  const cyclesQuery = useQuery({
    queryKey: ["maintenance", "cycles", activeSociety?.id],
    queryFn: async () => (await getCycles()).data.data,
    enabled: Boolean(activeSociety && canManageMaintenance),
  });

  const cycles = useMemo(() => cyclesQuery.data || [], [cyclesQuery.data]);
  const cycle =
    cycles.find((c) => c.id === selectedCycleId) || cycles[0] || null;

  const unitsQuery = useQuery({
    queryKey: ["maintenance", "cycle-units", cycle?.id],
    queryFn: async () => (await getCycleUnits(cycle.id)).data.data,
    enabled: Boolean(cycle),
  });

  const units = useMemo(() => unitsQuery.data || [], [unitsQuery.data]);

  const counts = useMemo(() => {
    const base = { paid: 0, pending: 0, overdue: 0, late_paid: 0 };
    units.forEach((u) => {
      if (base[u.status] !== undefined) base[u.status] += 1;
    });
    return base;
  }, [units]);

  const filtered = useMemo(() => {
    let list = units;
    if (filter !== "all") list = list.filter((u) => u.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          String(u.label).toLowerCase().includes(q) ||
          (u.ownerName || "").toLowerCase().includes(q) ||
          (u.ownerPhone || "").includes(q)
      );
    }
    return list;
  }, [units, search, filter]);

  const createMutation = useMutation({
    mutationFn: (payload) => createCycle(payload).then((r) => r.data.data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setShowCreate(false);
      setSelectedCycleId(created.id);
      setToast(
        `Maintenance created for ${periodLabel(created.month, created.year, created.durationMonths)}. Members will see a payment alert on their dashboard.`
      );
      setTimeout(() => setToast(""), 5000);
    },
  });

  if (!canManageMaintenance) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="page-title mt-3">No permission</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            You don’t have permission to manage maintenance. Ask your Society Admin to grant you <strong>Manage Maintenance</strong> permission.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-block text-label-md text-primary no-underline hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const filterOptions = [
    { key: "all", label: "All", count: units.length },
    ...Object.keys(STATUS_UI).map((key) => ({
      key,
      label: STATUS_UI[key].label,
      count: counts[key],
    })),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/dashboard"
            className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Dashboard
          </Link>
          <h1 className="page-title">Manage Maintenance</h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}
            Maintenance payment status for every house
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-label-md text-on-primary no-underline transition-opacity hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Create Maintenance
        </button>
      </section>

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-body-sm font-semibold text-emerald-800">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          {toast}
        </div>
      )}

      {cyclesQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(cyclesQuery.error, "Failed to load maintenance cycles.")}
        </div>
      )}

      {cyclesQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {cyclesQuery.isSuccess && (
        <>
          {cycles.length > 0 && (
            <section className="flex flex-wrap items-center gap-2">
              <span className="text-label-md text-on-surface-variant">Period</span>
              <select
                value={cycle?.id || ""}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm font-semibold text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${periodLabel(c.month, c.year, c.durationMonths)} · Owner ${formatAmount(c.ownerAmount || c.amount)} / Renter ${formatAmount(c.renterAmount || c.amount)} · due ${formatDate(c.dueDate)}`}
                  </option>
                ))}
              </select>
              {cycle && (
                <span className="text-label-sm text-outline">
                  {units.filter((u) => u.isOccupied).length} occupied houses
                </span>
              )}
            </section>
          )}

          {cycles.length === 0 && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
              <span className="material-symbols-outlined text-[40px] text-on-surface-variant">
                request_quote
              </span>
              <p className="mt-3 text-body-md text-on-surface-variant">
                No maintenance created yet. Use “Create Maintenance” to add your first cycle.
              </p>
            </div>
          )}

          {cycle && units.length === 0 && !unitsQuery.isLoading && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
              No houses found for this society.
            </div>
          )}

          {cycle && units.length > 0 && (
            <>
              <div className="space-y-3 w-full max-w-md mb-4">
                {/* Desktop filter buttons */}
                <section className="hidden flex-wrap gap-2 sm:flex">
                  {filterOptions.map((opt) => {
                    const activeClass =
                      opt.key === "all"
                        ? "border-primary bg-primary text-on-primary"
                        : STATUS_UI[opt.key].chip;
                    const inactiveClass =
                      "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline";
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setFilter(opt.key)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-label-md transition-colors ${
                          filter === opt.key ? activeClass : inactiveClass
                        }`}
                      >
                        {opt.key !== "all" && (
                          <span className="material-symbols-outlined text-[15px]">
                            {STATUS_UI[opt.key].icon}
                          </span>
                        )}
                        {opt.label}
                        <span className="rounded-full bg-black/10 px-1.5 text-label-sm">{opt.count}</span>
                      </button>
                    );
                  })}
                </section>

                {/* Search input & Mobile status selector */}
                <div className="flex items-center gap-2 w-full">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                      search
                    </span>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search house no. or owner..."
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-4 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label="Filter houses by status"
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:hidden min-w-[110px] max-w-[140px]"
                  >
                    {filterOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label} ({opt.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <section>

                {unitsQuery.isLoading ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
                    No houses match your search or filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {filtered.map((unit) => (
                      <DuesCard key={unit.unitId} unit={unit} cycle={cycle} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}

      {showCreate && (
        <CreateMaintenanceModal
          onClose={() => setShowCreate(false)}
          latestCycle={cycles[0]}
          loading={createMutation.isPending}
          apiError={
            createMutation.isError
              ? extractApiError(createMutation.error, "Failed to create maintenance.")
              : ""
          }
          onCreate={(payload) => createMutation.mutate(payload)}
        />
      )}
    </div>
  );
}
