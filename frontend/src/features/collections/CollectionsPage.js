import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getCollections, extractApiError, formatAmount, formatDate, CATEGORY_UI, STATUS_UI } from "../../lib/collections";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

function CollectionCard({ col }) {
  const cat = CATEGORY_UI[col.category] || CATEGORY_UI.other;
  const status = col.status === "closed" ? STATUS_UI.closed : col.isOverdue ? STATUS_UI.overdue : STATUS_UI.active;
  return (
    <Link
      to={`/collections/${col.id}`}
      className="group relative block overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-4 pl-5 no-underline transition-transform hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${status.stripe}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined flex h-9 w-9 items-center justify-center rounded-lg ${cat.pill === "bg-emerald-100 text-emerald-800" ? "bg-emerald-100 text-emerald-700" : cat.pill.includes("pink") ? "bg-pink-100 text-pink-700" : cat.pill.includes("violet") ? "bg-violet-100 text-violet-700" : cat.pill.includes("amber") ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
            {cat.icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-body-md font-semibold text-on-surface">{col.title}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-label-sm text-outline">
              <span className={`rounded-full px-2 py-0.5 text-label-sm font-semibold ${cat.pill}`}>{cat.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-label-sm font-semibold ${status.pill}`}>{status.label}</span>
            </p>
          </div>
        </div>
        <span className="shrink-0 text-body-md font-bold text-on-surface">{formatAmount(col.amount)}</span>
      </div>
      {col.description && <p className="mt-2 line-clamp-2 text-body-sm text-on-surface-variant">{col.description}</p>}
      <div className="mt-3 flex items-center justify-between text-label-sm text-outline">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">event</span>
          Due {formatDate(col.dueDate)}
        </span>
        <span className="flex items-center gap-1 text-primary font-medium">
          View details <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
        </span>
      </div>
      <p className="mt-1 text-label-sm text-outline">by {col.createdByName} · {new Date(col.createdAt).toLocaleDateString("en-IN")}</p>
    </Link>
  );
}

export default function CollectionsPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canCreate = hasPermission(membership?.role, "manage_collections", permissionsQuery.data) || hasPermission(membership?.role, "manage_maintenance", permissionsQuery.data);

  const collectionsQuery = useQuery({
    queryKey: ["collections", activeSociety?.id],
    queryFn: async () => (await getCollections()).data.data,
    enabled: Boolean(activeSociety),
  });

  const collections = collectionsQuery.data || [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">volunteer_activism</span>
            Collections
          </h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}Festivals, celebrations & special drives — like Navratri, Diwali, repairs
          </p>
        </div>
        {canCreate && (
          <Link to="/collections/new" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md text-on-primary no-underline hover:opacity-90">
            <span className="material-symbols-outlined text-[18px]">add</span> Create Collection
          </Link>
        )}
      </section>

      <div className="rounded-lg bg-surface-container-high px-3 py-2 text-label-sm text-on-surface-variant flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px]">info</span>
        Collections are one-time bills for occasions — Navratri, Diwali, Holi, building repairs, welfare drives etc. Pay per house.
      </div>

      {collectionsQuery.isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {collectionsQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(collectionsQuery.error, "Failed to load collections.")}
        </div>
      )}

      {collectionsQuery.isSuccess && collections.length === 0 && (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">volunteer_activism</span>
          <p className="mt-3 text-body-md font-semibold text-on-surface">No collections yet</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {canCreate ? "Create a festival fund — e.g., Navratri 2026 — to start collecting." : "Admin has not created any collection."}
          </p>
          {canCreate && (
            <Link to="/collections/new" className="mt-4 inline-flex items-center gap-1 text-label-md text-primary hover:underline">
              Create Collection →
            </Link>
          )}
        </div>
      )}

      {collections.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <CollectionCard key={c.id} col={c} />
          ))}
        </div>
      )}
    </div>
  );
}
