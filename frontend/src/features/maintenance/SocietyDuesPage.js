import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { getHouseCards, extractApiError } from "../../lib/houses";

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

// Mock dues status per unit until maintenance API is wired
function getDuesStatuses(units) {
  const order = ["paid", "pending", "overdue", "late_paid"];
  const statuses = {};
  units.forEach((unit, index) => {
    statuses[unit.id] = order[index % order.length];
  });
  return statuses;
}

function DuesCard({ house, statusKey }) {
  const status = DUES_STATUS[statusKey];
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
    </Link>
  );
}

export default function SocietyDuesPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const isAdmin = ADMIN_ROLES.includes(activeMembership?.role);

  const housesQuery = useQuery({
    queryKey: ["dues-house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety && isAdmin),
  });

  const houses = useMemo(() => housesQuery.data || [], [housesQuery.data]);
  const statuses = useMemo(() => getDuesStatuses(houses), [houses]);

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
    <div className="mx-auto max-w-6xl space-y-stack-lg">
      <section>
        <Link
          to="/dashboard"
          className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Dashboard
        </Link>
        <h1 className="text-headline-md text-on-surface">Society Dues</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          {activeSociety ? `${activeSociety.name} · ` : ""}
          Maintenance payment status for every house
        </p>
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
                  <DuesCard key={house.id} house={house} statusKey={statuses[house.id]} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
