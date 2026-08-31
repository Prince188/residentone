import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { getCollections, getCollectionUnits, extractApiError, formatAmount, formatDate, CATEGORY_UI, STATUS_UI } from "../../lib/collections";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

function HouseCard({ unit, collectionId }) {
  const status = STATUS_UI[unit.status] || STATUS_UI.pending;
  return (
    <Link
      to={`/collections/${collectionId}/units/${unit.unitId}`}
      className={`relative block overflow-hidden rounded-xl border p-4 pl-5 no-underline transition-transform hover:-translate-y-0.5 hover:shadow-md ${status.card || "border-outline-variant bg-surface-container-lowest"}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${status.stripe || "bg-outline-variant"}`} />
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.pill.includes("emerald") ? "bg-emerald-100 text-emerald-700" : status.pill.includes("amber") ? "bg-amber-100 text-amber-700" : status.pill.includes("red") ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-700"}`}>
          <span className="material-symbols-outlined text-[22px]">{unit.isOccupied ? "home" : "home_work"}</span>
        </span>
        <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${status.pill}`}>{status.label}</span>
      </div>
      <p className="mt-3 truncate text-headline-sm font-semibold text-on-surface">House {unit.label}</p>
      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">{unit.ownerName || "No resident"} {unit.amount ? `· ${formatAmount(unit.amount)}` : ""}</p>
      {unit.isOccupied && unit.ownerName && (
        <p className="mt-1 truncate text-label-sm text-outline">{unit.tenantId ? "Renter" : "Owner"}</p>
      )}
    </Link>
  );
}

export default function ManageCollectionsPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchParams] = useSearchParams();

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManage = hasPermission(membership?.role, "manage_collections", permissionsQuery.data);

  const collectionsQuery = useQuery({
    queryKey: ["collections", activeSociety?.id],
    queryFn: async () => (await getCollections()).data.data,
    enabled: Boolean(activeSociety && canManage),
  });

  const collections = useMemo(() => collectionsQuery.data || [], [collectionsQuery.data]);
  const selectedId = searchParams.get("collection") || collections[0]?.id || null;
  const selected = collections.find((c) => c.id === selectedId) || collections[0] || null;

  const unitsQuery = useQuery({
    queryKey: ["collection-units", selected?.id],
    queryFn: async () => (await getCollectionUnits(selected.id)).data.data,
    enabled: Boolean(selected?.id && canManage),
  });

  const units = useMemo(() => unitsQuery.data || [], [unitsQuery.data]);

  const counts = useMemo(() => {
    const base = { paid: 0, pending: 0, overdue: 0, late_paid: 0 };
    units.forEach((u) => { if (base[u.status] !== undefined) base[u.status] += 1; });
    return base;
  }, [units]);

  const filtered = useMemo(() => {
    let list = units;
    if (filter !== "all") list = list.filter((u) => u.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((u) => String(u.label).toLowerCase().includes(q) || (u.ownerName || "").toLowerCase().includes(q));
    }
    return list;
  }, [units, search, filter]);

  if (!canManage) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="page-title mt-3">No permission</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            You don’t have permission to manage collections. Ask your Society Admin to grant you <strong>Manage Collections</strong> permission.
          </p>
          <Link to="/dashboard" className="mt-4 inline-block text-label-md text-primary no-underline hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const filterOptions = [
    { key: "all", label: "All", count: units.length },
    ...Object.keys({ pending: 1, overdue: 1, paid: 1, late_paid: 1 }).map((key) => ({
      key,
      label: STATUS_UI[key]?.label || key,
      count: counts[key] || 0,
    })),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">volunteer_activism</span> Manage Collections
          </h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}Festival & occasion funds — per house tracking
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/collections/history"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md text-on-surface hover:border-primary hover:text-primary no-underline"
          >
            <span className="material-symbols-outlined text-[18px]">history</span> History
          </Link>
          <Link
            to="/collections/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-label-md text-on-primary no-underline hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span> Create Collection
          </Link>
        </div>
      </section>

      {collectionsQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(collectionsQuery.error, "Failed to load collections.")}
        </div>
      )}

      {collectionsQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {collectionsQuery.isSuccess && collections.length === 0 && (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">volunteer_activism</span>
          <p className="mt-3 text-body-md font-semibold text-on-surface">No collections yet</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">Create a festival fund — e.g., Navratri 2026 — to start collecting.</p>
          <Link to="/collections/new" className="mt-4 inline-flex items-center gap-1 text-label-md text-primary hover:underline">
            Create Collection →
          </Link>
        </div>
      )}

      {collectionsQuery.isSuccess && collections.length > 0 && selected && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-label-sm text-outline">
            <span className="text-body-md font-semibold text-on-surface">{selected.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-label-sm font-semibold ${(CATEGORY_UI[selected.category] || CATEGORY_UI.other).pill}`}>
              {(CATEGORY_UI[selected.category] || CATEGORY_UI.other).label}
            </span>
            <span>{formatAmount(selected.amount)} per house</span>
            <span>· Due {formatDate(selected.dueDate)}</span>
            {selected.isOverdue && <span className="text-error font-semibold">· Overdue</span>}
            <span>· {selected.status}</span>
            <span className="text-outline">· {units.filter((u) => u.isOccupied).length} occupied · {counts.paid + counts.late_paid} paid</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden sm:flex flex-wrap gap-2">
                {filterOptions.map((opt) => {
                  const isActive = filter === opt.key;
                  const activeClass = opt.key === "all" ? "border-primary bg-primary text-on-primary" : STATUS_UI[opt.key]?.pill || "bg-zinc-100";
                  const inactiveClass = "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline";
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setFilter(opt.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-label-md transition-colors ${isActive ? activeClass : inactiveClass}`}
                    >
                      {opt.key !== "all" && STATUS_UI[opt.key] && <span className="material-symbols-outlined text-[15px]">{STATUS_UI[opt.key].icon}</span>}
                      {opt.label}
                      <span className="rounded-full bg-black/10 px-1.5 text-label-sm">{opt.count}</span>
                    </button>
                  );
                })}
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm sm:hidden min-w-[110px]"
              >
                {filterOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label} ({opt.count})
                  </option>
                ))}
              </select>
            </div>
            <div className="relative w-full sm:w-72 sm:shrink-0">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search house no. or owner..."
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-4 text-body-sm placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
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
                      <HouseCard key={unit.unitId} unit={unit} collectionId={selected.id} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
    </div>
  );
}
