import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { getHouseCards, extractApiError } from "../../lib/houses";
import { MONTHS, saveMaintenance } from "../../lib/maintenance";

const ADMIN_ROLES = ["super_admin", "society_admin"];

export const DUES_STATUS = {
  paid: {
    label: "Paid",
    card: "border-emerald-200 bg-emerald-50",
    stripe: "bg-emerald-500",
    iconBox: "bg-emerald-100 text-emerald-700",
    pill: "bg-emerald-100 text-emerald-800",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: "check_circle",
    colorClass: "text-emerald-700",
  },
  pending: {
    label: "Pending",
    card: "border-amber-200 bg-amber-50",
    stripe: "bg-amber-500",
    iconBox: "bg-amber-100 text-amber-700",
    pill: "bg-amber-100 text-amber-800",
    chip: "bg-amber-50 text-amber-800 border-amber-200",
    icon: "schedule",
    colorClass: "text-amber-700",
  },
  overdue: {
    label: "Overdue",
    card: "border-red-200 bg-red-50",
    stripe: "bg-red-500",
    iconBox: "bg-red-100 text-red-700",
    pill: "bg-red-100 text-red-800",
    chip: "bg-red-50 text-red-800 border-red-200",
    icon: "error",
    colorClass: "text-red-700",
  },
  late_paid: {
    label: "Late Paid",
    card: "border-violet-200 bg-violet-50",
    stripe: "bg-violet-500",
    iconBox: "bg-violet-100 text-violet-700",
    pill: "bg-violet-100 text-violet-800",
    chip: "bg-violet-50 text-violet-800 border-violet-200",
    icon: "history_toggle_off",
    colorClass: "text-violet-700",
  },
};

// Mock dues status per unit until maintenance API is wired.
// periodOffset shifts the mock pattern so each month/year looks different.
export function getDuesStatuses(units, periodOffset = 0) {
  const order = ["paid", "pending", "overdue", "late_paid"];
  const statuses = {};
  units.forEach((unit, index) => {
    statuses[unit.id] = order[(index + periodOffset) % order.length];
  });
  return statuses;
}

// Mock due details per unit until maintenance API is wired
export const MOCK_DUE_DETAILS = {
  paid: {
    period: "Jul 2026",
    amount: 2500,
    dueDate: "15 Jul 2026",
    paidOn: "05 Jul 2026",
    method: "UPI",
    receiptNo: "RCPT-2026-0074",
    note: "Paid on time",
  },
  pending: {
    period: "Jul 2026",
    amount: 2500,
    dueDate: "15 Jul 2026",
    paidOn: null,
    method: null,
    receiptNo: null,
    note: "Due in 12 days",
  },
  overdue: {
    period: "Jun – Jul 2026",
    amount: 5000,
    dueDate: "15 Jun 2026",
    paidOn: null,
    method: null,
    receiptNo: null,
    note: "Overdue since 15 Jun 2026 · Late fee ₹100 applicable",
  },
  late_paid: {
    period: "May 2026",
    amount: 2500,
    dueDate: "15 May 2026",
    paidOn: "28 May 2026",
    method: "Bank Transfer",
    receiptNo: "RCPT-2026-0052",
    note: "Paid 13 days after due date · Late fee ₹100 charged",
  },
};

function DuesCard({ house, statusKey, period }) {
  const status = DUES_STATUS[statusKey];
  const isSettled = statusKey === "paid" || statusKey === "late_paid";
  const monthLabel = `${MONTHS[period.m]} ${period.y}`;
  const dateLine = isSettled
    ? `Paid on 05 ${monthLabel}`
    : statusKey === "overdue"
      ? `Overdue since 15 ${monthLabel}`
      : `Due by 15 ${monthLabel}`;
  return (
    <Link
      to={`/dues/${house.id}`}
      className={`relative block overflow-hidden rounded-xl border p-4 pl-5 no-underline transition-transform hover:-translate-y-0.5 hover:shadow-md ${status.card}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${status.stripe}`} />
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.iconBox}`}>
          <span className="material-symbols-outlined text-[22px]">
            {house.isAssigned ? "home" : "home_work"}
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
        House {house.label}
      </p>
      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
        {house.owner ? house.owner.name : "No owner assigned"}
      </p>
      <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] font-semibold text-on-surface-variant">
        <span className="material-symbols-outlined shrink-0 text-[13px]">event</span>
        {dateLine}
      </p>
    </Link>
  );
}

export default function SocietyDuesPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState("");

  // Past-period selector (strictly before the current month)
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [period, setPeriod] = useState({
    m: lastMonthDate.getMonth(),
    y: lastMonthDate.getFullYear(),
  });
  const periodOffset = (period.y * 12 + period.m) % 4;

  const isAdmin = ADMIN_ROLES.includes(activeMembership?.role);

  const housesQuery = useQuery({
    queryKey: ["dues-house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety && isAdmin),
  });

  const houses = useMemo(() => housesQuery.data || [], [housesQuery.data]);
  const statuses = useMemo(
    () => getDuesStatuses(houses, periodOffset),
    [houses, periodOffset]
  );

  const counts = useMemo(() => {
    const base = { paid: 0, pending: 0, overdue: 0, late_paid: 0 };
    houses.forEach((h) => {
      const key = statuses[h.id];
      if (key) base[key] += 1;
    });
    return base;
  }, [houses, statuses]);

  const filtered = useMemo(() => {
    let list = houses;
    if (filter !== "all") list = list.filter((h) => statuses[h.id] === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (h) =>
          String(h.label).toLowerCase().includes(q) ||
          (h.owner?.name || "").toLowerCase().includes(q) ||
          (h.owner?.phone || "").includes(q)
      );
    }
    return list;
  }, [houses, statuses, search, filter]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="mt-3 text-headline-sm text-on-surface">Admins only</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Only the society admin can view society-wide dues.
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
    { key: "all", label: "All", count: houses.length },
    ...Object.keys(DUES_STATUS).map((key) => ({
      key,
      label: DUES_STATUS[key].label,
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

      <section className="flex flex-wrap items-center gap-2">
        <span className="text-label-md text-on-surface-variant">Period</span>
        <select
          value={period.m}
          onChange={(e) => setPeriod((p) => ({ ...p, m: Number(e.target.value) }))}
          className={`rounded-lg border px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
            period.m === lastMonthDate.getMonth() && period.y === lastMonthDate.getFullYear()
              ? "border-outline"
              : "border-outline-variant bg-surface-container-lowest"
          }`}
        >
          {MONTHS.map((label, mIdx) => {
            const disabled = period.y === now.getFullYear() && mIdx >= now.getMonth();
            return (
              <option key={label} value={mIdx} disabled={disabled}>
                {label}
                {disabled ? " (upcoming)" : ""}
              </option>
            );
          })}
        </select>
        <select
          value={period.y}
          onChange={(e) =>
            setPeriod((p) => {
              const y = Number(e.target.value);
              const m = y === now.getFullYear() ? Math.min(p.m, now.getMonth() - 1) : p.m;
              return { m, y };
            })
          }
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {Array.from({ length: 3 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </section>

      {housesQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(housesQuery.error, "Failed to load houses.")}
        </div>
      )}

      {housesQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {housesQuery.isSuccess && (
        <>
          {houses.length > 0 && (
            <section className="flex flex-wrap gap-2">
              {filterOptions.map((opt) => {
                const activeClass =
                  opt.key === "all"
                    ? "border-primary bg-primary text-on-primary"
                    : DUES_STATUS[opt.key].chip;
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
                        {DUES_STATUS[opt.key].icon}
                      </span>
                    )}
                    {opt.label}
                    <span className="rounded-full bg-black/10 px-1.5 text-label-sm">{opt.count}</span>
                  </button>
                );
              })}
            </section>
          )}

          <section>
            <div className="mb-4 w-full max-w-xs">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search house no. or owner..."
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {houses.length === 0 ? (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
                No houses found for this society.
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
                No houses match your search or filter.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {filtered.map((house) => (
                  <DuesCard
                    key={house.id}
                    house={house}
                    statusKey={statuses[house.id]}
                    period={period}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showCreate && (
        <CreateMaintenanceModal
          onClose={() => setShowCreate(false)}
          onCreate={(record) => {
            saveMaintenance(record);
            setShowCreate(false);
            setToast(
              `Maintenance created for ${record.month} ${record.year}. Members will see a payment alert on their dashboard.`
            );
            setTimeout(() => setToast(""), 5000);
          }}
        />
      )}
    </div>
  );
}

function CreateMaintenanceModal({ onClose, onCreate }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const years = [today.getFullYear(), today.getFullYear() + 1];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!dueDate) {
      setError("Select a due date.");
      return;
    }
    onCreate({ month: MONTHS[month], year, dueDate, amount: Number(amount) });
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
              <label htmlFor="cm-month" className="mb-1 block text-label-sm text-on-surface-variant">
                Month
              </label>
              <select
                id="cm-month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {MONTHS.map((label, mIdx) => (
                  <option key={label} value={mIdx}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cm-year" className="mb-1 block text-label-sm text-on-surface-variant">
                Year
              </label>
              <select
                id="cm-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="cm-due" className="mb-1 block text-label-sm text-on-surface-variant">
              Due Date
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
            <label htmlFor="cm-amount" className="mb-1 block text-label-sm text-on-surface-variant">
              Amount (₹)
            </label>
            <input
              id="cm-amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 2500"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">
              {error}
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
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-label-md text-on-primary transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
