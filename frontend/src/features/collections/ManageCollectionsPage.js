import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import {
  getCollections,
  closeCollection,
  extractApiError,
  formatAmount,
  formatDate,
  CATEGORY_UI,
  STATUS_UI,
  COLLECTION_CATEGORIES,
} from "../../lib/collections";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

function ActiveCollectionCard({ col, onCloseClick }) {
  const cat = CATEGORY_UI[col.category] || CATEGORY_UI.other;
  const isOverdue = col.isOverdue;
  const status = isOverdue ? STATUS_UI.overdue : STATUS_UI.active;
  const progress = col.progressPercent || 0;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300">
      {/* Top Stripe Indicator */}
      <div className={`h-1.5 w-full ${isOverdue ? "bg-red-500" : "bg-primary"}`} />

      <div className="p-6 space-y-4 flex-1">
        {/* Header: Icon, Category & Status Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                cat.pill.includes("pink")
                  ? "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300"
                  : cat.pill.includes("violet")
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                    : cat.pill.includes("emerald")
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
            >
              <span className="material-symbols-outlined text-[26px]">{cat.icon}</span>
            </span>
            <div className="min-w-0">
              <Link
                to={`/collections/${col.id}`}
                className="truncate block text-title-lg font-bold text-on-surface hover:text-primary transition-colors no-underline"
              >
                {col.title}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-label-sm">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${cat.pill}`}>
                  {cat.label}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${status.pill}`}>
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-title-md font-bold text-on-surface block">{formatAmount(col.amount)}</span>
            <span className="text-[11px] text-outline block">/ house</span>
          </div>
        </div>

        {/* Description snippet */}
        {col.description && (
          <p className="text-body-sm text-on-surface-variant line-clamp-2">{col.description}</p>
        )}

        {/* Financial Progress Block */}
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 space-y-2.5">
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">payments</span> Total Collected
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-title-sm">
              {formatAmount(col.totalCollected)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-outline-variant/30">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress >= 100 ? "bg-emerald-600" : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-on-surface-variant">
            <span>{progress}% of {formatAmount(col.targetGoal || 0)}</span>
            <span>{col.paidCount || 0} / {col.totalUnits || 0} Houses Paid</span>
          </div>
        </div>

        {/* Metadata Footer: Due Date & Stats */}
        <div className="flex items-center justify-between text-label-sm border-t border-outline-variant/20 pt-3">
          <span className="flex items-center gap-1 text-on-surface-variant font-medium">
            <span className="material-symbols-outlined text-[16px] text-primary">event</span>
            Due {formatDate(col.dueDate)}
          </span>
          {isOverdue ? (
            <span className="text-red-600 font-bold text-[11px] uppercase tracking-wider flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px]">warning</span> Overdue
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
              Accepting Payments
            </span>
          )}
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="flex items-center justify-between border-t border-outline-variant/30 bg-surface-container-low px-6 py-3.5">
        <button
          type="button"
          onClick={() => onCloseClick(col)}
          className="inline-flex items-center gap-1 text-label-sm font-semibold text-on-surface-variant hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">task_alt</span> Close Fund
        </button>

        <Link
          to={`/collections/${col.id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-label-sm font-bold text-on-primary hover:opacity-90 shadow-sm no-underline transition-transform group-hover:translate-x-0.5"
        >
          <span>Manage Houses</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}

export default function ManageCollectionsPage() {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [closingCollection, setClosingCollection] = useState(null);
  const [actionError, setActionError] = useState("");

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

  // Filter to active collections only (status !== "closed")
  const activeCollections = useMemo(
    () => collections.filter((c) => c.status !== "closed"),
    [collections]
  );

  const closeMutation = useMutation({
    mutationFn: (id) => closeCollection(id).then((r) => r.data.data),
    onSuccess: () => {
      setClosingCollection(null);
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (err) => setActionError(extractApiError(err, "Failed to close collection")),
  });

  const filtered = useMemo(() => {
    let list = activeCollections;
    if (categoryFilter !== "all") {
      list = list.filter((c) => c.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCollections, categoryFilter, search]);

  if (!canManage) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-10 text-center">
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">volunteer_activism</span>
            Manage Collections
          </h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}Active occasion & festival funds — tap a card to manage per-house payments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/collections/history"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md font-semibold text-on-surface hover:border-primary hover:text-primary no-underline transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">history</span> Collection History
          </Link>
          <Link
            to="/collections/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-label-md font-semibold text-on-primary no-underline hover:opacity-90 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span> Create Collection
          </Link>
        </div>
      </section>

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-label-md font-semibold transition-all cursor-pointer ${
              categoryFilter === "all"
                ? "bg-primary text-on-primary shadow-sm"
                : "border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline"
            }`}
          >
            All Active ({activeCollections.length})
          </button>
          {COLLECTION_CATEGORIES.map((cat) => {
            const count = activeCollections.filter((c) => c.category === cat.value).length;
            if (count === 0 && categoryFilter !== cat.value) return null;
            const isSelected = categoryFilter === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategoryFilter(cat.value)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-label-md font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-on-primary shadow-sm"
                    : "border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="rounded-full bg-black/10 px-1.5 text-[11px] font-bold">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72 shrink-0">
          <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-outline">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active funds..."
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-4 text-body-sm placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
      </div>

      {collectionsQuery.isError && (
        <div className="rounded-2xl border border-error/30 bg-error/10 p-6 text-center text-body-md text-error">
          {extractApiError(collectionsQuery.error, "Failed to load collections.")}
        </div>
      )}

      {/* Loading Skeleton */}
      {collectionsQuery.isLoading && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {collectionsQuery.isSuccess && activeCollections.length === 0 && (
        <div className="rounded-3xl border border-dashed border-outline-variant bg-surface-container-low p-12 text-center space-y-3">
          <span className="material-symbols-outlined text-[52px] text-primary">task_alt</span>
          <h3 className="text-title-lg font-bold text-on-surface">No Active Collections</h3>
          <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">
            All collections are fully completed and closed. You can create a new festival drive or review completed collections in History.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/collections/history"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-5 py-2 text-label-md font-semibold text-on-surface hover:border-primary hover:text-primary no-underline"
            >
              <span className="material-symbols-outlined text-[18px]">history</span> View Closed History
            </Link>
            <Link
              to="/collections/new"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-label-md font-semibold text-on-primary no-underline hover:opacity-90 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span> Create Collection
            </Link>
          </div>
        </div>
      )}

      {/* Active Collections Cards Grid */}
      {collectionsQuery.isSuccess && activeCollections.length > 0 && (
        <>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
              No active collections match your search or category filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((col) => (
                <ActiveCollectionCard
                  key={col.id}
                  col={col}
                  onCloseClick={(c) => setClosingCollection(c)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Manual Close Confirm Dialog */}
      {closingCollection && (
        <ConfirmDialog
          open={Boolean(closingCollection)}
          title={`Close Collection: ${closingCollection.title}?`}
          message={`Are you sure you want to close "${closingCollection.title}"? It will be archived to Collection History as completed.`}
          confirmLabel="Close Fund"
          busy={closeMutation.isPending}
          error={actionError}
          onConfirm={() => closeMutation.mutate(closingCollection.id)}
          onClose={() => {
            setClosingCollection(null);
            setActionError("");
          }}
        />
      )}
    </div>
  );
}
