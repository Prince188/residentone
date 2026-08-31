import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { getCollections, getCollectionUnitDetail, extractApiError, formatAmount, formatDate, CATEGORY_UI, STATUS_UI } from "../../lib/collections";

function ResidentHouseCard({ detail, collectionId }) {
  // detail is from getCollectionUnitDetail which already has status etc but shape differs
  const status = STATUS_UI[detail.status] || STATUS_UI.pending;
  return (
    <Link
      to={`/collections/${collectionId}/units/${detail.unitId}`}
      className={`relative block overflow-hidden rounded-xl border p-4 pl-5 no-underline transition-transform hover:-translate-y-0.5 hover:shadow-md ${status.card || "border-outline-variant bg-surface-container-lowest"}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${status.stripe || "bg-outline-variant"}`} />
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.pill.includes("emerald") ? "bg-emerald-100 text-emerald-700" : status.pill.includes("amber") ? "bg-amber-100 text-amber-700" : status.pill.includes("red") ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-700"}`}>
          <span className="material-symbols-outlined text-[22px]">{detail.isRenterOccupied ? "home_work" : "home"}</span>
        </span>
        <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${status.pill}`}>{status.label}</span>
      </div>
      <p className="mt-3 truncate text-headline-sm font-semibold text-on-surface">House {detail.label}</p>
      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">{formatAmount(detail.amount)} · Due {formatDate(detail.collection?.dueDate)}</p>
      {detail.paidOn ? (
        <p className="mt-1 text-label-sm text-outline">Paid {formatDate(detail.paidOn)} · {detail.receiptNo || ""}</p>
      ) : (
        <p className="mt-1 text-label-md font-medium text-primary">Pay Now →</p>
      )}
    </Link>
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
  const selectedId = searchParams.get("collection") || collections[0]?.id || null;
  const selected = collections.find((c) => c.id === selectedId) || collections[0] || null;

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
        } catch (e) {
          // ignore not assigned
        }
      }
      return results;
    },
    enabled: Boolean(selected?.id && myUnits.length > 0),
  });

  const myHouses = useMemo(() => myDetailsQuery.data || [], [myDetailsQuery.data]);

  if (!myUnits.length) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
        <section>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">volunteer_activism</span> Collections
          </h1>
          <p className="page-subtitle">Festivals & special drives — pay per house</p>
        </section>
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">home_work</span>
          <p className="mt-3 text-body-md text-on-surface-variant">You are not assigned to any house yet. Contact your society admin to get added.</p>
        </div>
      </div>
    );
  }

  const handleSelect = (e) => {
    const val = e.target.value;
    setSearchParams(val ? { collection: val } : {});
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">volunteer_activism</span> Collections
          </h1>
          <p className="page-subtitle">
            {selected
              ? `${(CATEGORY_UI[selected.category] || CATEGORY_UI.other).label} · ${formatAmount(selected.amount)} per house · Due ${formatDate(selected.dueDate)}`
              : "Festivals, celebrations & special drives — pay per house"}
          </p>
          {selected?.description && <p className="mt-1 text-body-sm text-on-surface-variant line-clamp-2">{selected.description}</p>}
        </div>
      </section>

      {collectionsQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
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
          <p className="mt-3 text-body-md text-on-surface-variant">No collections have been raised yet. You will see dues here once your society admin creates one.</p>
        </div>
      )}

      {collections.length > 0 && (
        <>
          {collections.length > 1 && (
            <section className="flex flex-wrap items-center gap-2">
              <span className="text-label-md text-on-surface-variant">Collection</span>
              <select
                value={selected?.id || ""}
                onChange={handleSelect}
                className="min-w-[260px] max-w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm font-semibold text-on-surface focus:border-primary focus:outline-none"
              >
                {collections.map((c) => {
                  const cat = CATEGORY_UI[c.category] || CATEGORY_UI.other;
                  return (
                    <option key={c.id} value={c.id}>
                      {`${c.title} · ${cat.label} · ${formatAmount(c.amount)} · due ${formatDate(c.dueDate)}`}
                    </option>
                  );
                })}
              </select>
            </section>
          )}

          {selected && (
            <>
              <div className="flex items-center gap-2 text-label-sm">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${(CATEGORY_UI[selected.category] || CATEGORY_UI.other).pill}`}>{(CATEGORY_UI[selected.category] || CATEGORY_UI.other).label}</span>
                <span className="text-outline">{selected.status === "closed" ? "Closed" : selected.isOverdue ? "Overdue" : "Active"}</span>
                {myHouses.length > 0 && (
                  <span className="text-outline">· {myHouses.filter((h) => ["paid", "late_paid"].includes(h.status)).length} of {myHouses.length} paid</span>
                )}
              </div>

              {myDetailsQuery.isLoading ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {Array.from({ length: myUnits.length || 2 }).map((_, i) => (
                    <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
                  ))}
                </div>
              ) : myHouses.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-on-surface-variant">No house assigned for this collection.</div>
              ) : (
                <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {myHouses.map((h) => (
                    <ResidentHouseCard key={h.unitId} detail={h} collectionId={selected.id} />
                  ))}
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
