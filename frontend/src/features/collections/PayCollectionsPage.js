/* eslint-disable */
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import {
  getCollections,
  getCollectionUnitDetail,
  extractApiError,
  formatAmount,
  formatDate,
  CATEGORY_UI,
  STATUS_UI,
} from "../../lib/collections";
import HouseCard from "../../components/cards/HouseCard";

function ResidentHouseCard({ detail, collectionId }) {
  const isSettled = ["paid", "late_paid"].includes(detail.status);
  const dateLine = isSettled
    ? `Paid on ${formatDate(detail.paidOn)}${detail.receiptNo ? ` · #${detail.receiptNo}` : ""}`
    : `Due by ${formatDate(detail.collection?.dueDate)}`;

  return (
    <HouseCard
      house={{
        label: detail.label,
        block: detail.block,
        floor: detail.floor,
        ownerName: detail.isRenterOccupied ? "Renter" : "Owner",
      }}
      variant="billing"
      status={detail.status || "pending"}
      amount={detail.amount}
      dateLine={dateLine}
      to={`/collections/${collectionId}/units/${detail.unitId}`}
    />
  );
}

function CollectionItemCard({ col, onClick, isHistory }) {
  const cat = CATEGORY_UI[col.category] || CATEGORY_UI.other;
  const isOverdue = col.isOverdue;
  const status = col.status === "closed" ? STATUS_UI.closed : isOverdue ? STATUS_UI.overdue : STATUS_UI.active;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between rounded-2xl border border-outline-variant/80 bg-surface-container-lowest p-5 sm:p-6 shadow-xs hover:shadow-lg hover:border-primary/60 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      <div className="space-y-4">
        {/* Top Badges & Amount Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${cat.pill}`}>
              <span className="material-symbols-outlined text-[13px]">{cat.icon}</span>
              {cat.label}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${status.pill}`}>
              {status.label}
            </span>
          </div>

          <div className="text-right">
            <span className="text-title-lg font-extrabold text-primary block leading-none">
              {formatAmount(col.amount)}
            </span>
            <span className="text-[10px] uppercase font-semibold text-outline tracking-wider">per house</span>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-title-md font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
            {col.title}
          </h3>
          {col.description && (
            <p className="mt-1 text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">
              {col.description}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Metadata & CTA */}
      <div className="mt-5 pt-3.5 border-t border-outline-variant/40 flex items-center justify-between text-label-sm">
        <span className="flex items-center gap-1.5 text-on-surface-variant font-medium">
          <span className="material-symbols-outlined text-[16px] text-outline">calendar_today</span>
          <span>Due {formatDate(col.dueDate)}</span>
        </span>

        <span className="inline-flex items-center gap-1 font-bold text-primary group-hover:translate-x-1 transition-transform">
          <span>{col.status === "closed" ? "View Details" : "Select Houses"}</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </span>
      </div>
    </div>
  );
}

export default function PayCollectionsPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const [searchParams, setSearchParams] = useSearchParams();
  const myUnits = membership?.units || [];

  const collectionsQuery = useQuery({
    queryKey: ["collections", activeSociety?.id],
    queryFn: async () => (await getCollections()).data.data,
    enabled: Boolean(activeSociety),
  });

  const collections = useMemo(() => collectionsQuery.data || [], [collectionsQuery.data]);

  // Tab & Selection state from URL query
  const isHistoryView = searchParams.get("view") === "history";
  const selectedId = searchParams.get("collection") || null;
  const selected = collections.find((c) => c.id === selectedId) || null;

  const activeCollections = useMemo(
    () => collections.filter((c) => c.status !== "closed"),
    [collections]
  );
  const historyCollections = useMemo(
    () => collections.filter((c) => c.status === "closed"),
    [collections]
  );
  const displayedCollections = isHistoryView ? historyCollections : activeCollections;

  // Query houses for the selected collection
  const myDetailsQuery = useQuery({
    queryKey: ["collection-my-pay", selected?.id, myUnits.map((u) => u.id || u).join(",")],
    queryFn: async () => {
      if (!selected) return [];
      const results = [];
      for (const uid of myUnits) {
        const unitId = uid.id || uid;
        try {
          const r = await getCollectionUnitDetail(selected.id, unitId);
          results.push(r.data.data);
        } catch (_) {}
      }
      return results;
    },
    enabled: Boolean(selected?.id && myUnits.length > 0),
  });

  const myHouses = useMemo(() => myDetailsQuery.data || [], [myDetailsQuery.data]);
  const paidHousesCount = myHouses.filter((h) => ["paid", "late_paid"].includes(h.status)).length;

  const handleSelectCollection = (colId) => {
    setSearchParams(isHistoryView ? { collection: colId, view: "history" } : { collection: colId });
  };

  const handleBackToGrid = () => {
    setSearchParams(isHistoryView ? { view: "history" } : {});
  };

  const toggleHistoryView = () => {
    setSearchParams(isHistoryView ? {} : { view: "history" });
  };

  if (!myUnits.length) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <section>
          <Link
            to="/dashboard"
            className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">volunteer_activism</span> Collections
          </h1>
          <p className="page-subtitle">Festivals & special drives — pay per house</p>
        </section>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[48px] text-outline">home_work</span>
          <p className="mt-3 text-body-md font-semibold text-on-surface">No House Assigned in this Society</p>
          <p className="mt-1 text-body-sm text-on-surface-variant max-w-md mx-auto">
            You are not assigned to any flat/house in this society yet. Contact your society administrator to be linked to your house.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* HEADER */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {selected ? (
            <button
              type="button"
              onClick={handleBackToGrid}
              className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to {isHistoryView ? "Collection History" : "Active Collections"}
            </button>
          ) : (
            <Link
              to="/dashboard"
              className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
            </Link>
          )}

          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">
              {isHistoryView ? "history" : "volunteer_activism"}
            </span>
            <span>{isHistoryView ? "Collection History" : "Collections"}</span>
          </h1>

          <p className="page-subtitle">
            {selected
              ? `Select a house to view status or complete payment for ${selected.title}`
              : isHistoryView
              ? "Past & closed collection funds — view your previous payments and receipts"
              : `${activeSociety ? `${activeSociety.name} · ` : ""}Active festival & special occasion funds — select a collection to pay for your houses`}
          </p>
        </div>

        {/* TOP RIGHT ACTION: History Button (mirrors Manage Collections) */}
        {!selected && (
          <button
            type="button"
            onClick={toggleHistoryView}
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isHistoryView ? "volunteer_activism" : "history"}
            </span>
            <span>{isHistoryView ? "Active Collections" : "Collection History"}</span>
          </button>
        )}
      </section>

      {/* LOADING & ERROR STATES */}
      {collectionsQuery.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-3xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {collectionsQuery.isError && (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(collectionsQuery.error, "Failed to load collections.")}
        </div>
      )}

      {/* VIEW 1: SELECTED COLLECTION HOUSES DRILL-DOWN */}
      {selected ? (
        <div className="space-y-6">
          {/* Collection Detail Hero Banner */}
          <div className="rounded-3xl border border-outline-variant/80 bg-surface-container-lowest p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      (CATEGORY_UI[selected.category] || CATEGORY_UI.other).pill
                    }`}
                  >
                    {(CATEGORY_UI[selected.category] || CATEGORY_UI.other).label}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      selected.status === "closed"
                        ? STATUS_UI.closed.pill
                        : selected.isOverdue
                        ? STATUS_UI.overdue.pill
                        : STATUS_UI.active.pill
                    }`}
                  >
                    {selected.status === "closed" ? "Closed" : selected.isOverdue ? "Overdue" : "Active"}
                  </span>
                </div>
                <h2 className="text-headline-sm font-bold text-on-surface">{selected.title}</h2>
                {selected.description && (
                  <p className="text-body-sm text-on-surface-variant max-w-2xl">{selected.description}</p>
                )}
              </div>

              <div className="text-right">
                <span className="text-headline-sm font-extrabold text-primary block">
                  {formatAmount(selected.amount)}
                </span>
                <span className="text-label-sm text-outline block">per house</span>
                <span className="text-label-sm text-on-surface-variant mt-1 inline-flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[15px] text-primary">event</span>
                  Due {formatDate(selected.dueDate)}
                </span>
              </div>
            </div>

            {myHouses.length > 0 && (
              <div className="flex items-center justify-between border-t border-outline-variant/40 pt-3 text-label-sm">
                <span className="font-semibold text-on-surface">
                  Your Payment Progress: {paidHousesCount} of {myHouses.length} houses paid
                </span>
                <span
                  className={`font-bold ${
                    paidHousesCount === myHouses.length ? "text-emerald-600" : "text-amber-700"
                  }`}
                >
                  {paidHousesCount === myHouses.length ? "✓ Fully Cleared" : `${myHouses.length - paidHousesCount} Pending`}
                </span>
              </div>
            )}
          </div>

          {/* Houses Section */}
          <div className="space-y-3">
            <h3 className="text-title-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">home</span>
              <span>Your Houses for this Collection ({myHouses.length})</span>
            </h3>

            {myDetailsQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: myUnits.length || 2 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface-container-high" />
                ))}
              </div>
            ) : myHouses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">
                No house records found for your account under this collection.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {myHouses.map((h) => (
                  <ResidentHouseCard key={h.unitId} detail={h} collectionId={selected.id} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: ACTIVE / HISTORY COLLECTION CARDS GRID (NO DROPDOWN) */
        <div className="space-y-6">
          {displayedCollections.length === 0 && collectionsQuery.isSuccess ? (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
              <span className="material-symbols-outlined text-[48px] text-outline">
                {isHistoryView ? "history" : "volunteer_activism"}
              </span>
              <p className="mt-3 text-body-md font-bold text-on-surface">
                {isHistoryView ? "No Past Collections Found" : "No Active Collections Available"}
              </p>
              <p className="mt-1 text-body-sm text-on-surface-variant max-w-md mx-auto">
                {isHistoryView
                  ? "Previous or closed collection drives will appear here for your reference."
                  : "When your society committee creates a festival or special occasion drive, it will appear here."}
              </p>
              {isHistoryView && (
                <button
                  type="button"
                  onClick={toggleHistoryView}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
                  <span>View Active Collections</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {displayedCollections.map((col) => (
                <CollectionItemCard
                  key={col.id}
                  col={col}
                  isHistory={isHistoryView}
                  onClick={() => handleSelectCollection(col.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
