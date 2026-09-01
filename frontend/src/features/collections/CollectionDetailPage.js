import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getCollection, getCollectionUnits, getCollectionUnitDetail, exportCollectionExcel, extractApiError, formatAmount, formatDate, CATEGORY_UI, STATUS_UI } from "../../lib/collections";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

function UnitCard({ unit, collectionId }) {
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
    </Link>
  );
}

export default function CollectionDetailPage() {
  const { id } = useParams();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [exportErr, setExportErr] = useState("");

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const isAdmin = hasPermission(membership?.role, "manage_collections", permissionsQuery.data) || hasPermission(membership?.role, "manage_maintenance", permissionsQuery.data);
  const canExport = hasPermission(membership?.role, "manage_collections", permissionsQuery.data);

  const collectionQuery = useQuery({
    queryKey: ["collection", id],
    queryFn: async () => (await getCollection(id)).data.data,
    enabled: Boolean(id),
  });

  const unitsQuery = useQuery({
    queryKey: ["collection-units", id],
    queryFn: async () => (await getCollectionUnits(id)).data.data,
    enabled: Boolean(id) && isAdmin,
  });

  const myUnits = membership?.units || [];
  const myQuery = useQuery({
    queryKey: ["collection-my", id, myUnits.map(u=>u.id||u).join(",")],
    queryFn: async () => {
      // For residents, fetch each unit detail individually? Simpler: fetch admin units if admin else fetch my unit details via loop
      if (isAdmin) return null;
      const results = [];
      for (const uid of myUnits) {
        const unitId = uid.id || uid;
        try {
          const r = await getCollectionUnitDetail(id, unitId);
          results.push(r.data.data);
        } catch {}
      }
      return results;
    },
    enabled: Boolean(id) && !isAdmin && myUnits.length > 0,
  });

  const collection = collectionQuery.data;
  const units = useMemo(() => (isAdmin ? (unitsQuery.data || []) : (myQuery.data || [])), [isAdmin, unitsQuery.data, myQuery.data]);

  const counts = useMemo(() => {
    const base = { paid: 0, pending: 0, overdue: 0, late_paid: 0 };
    (units || []).forEach((u) => { if (base[u.status] !== undefined) base[u.status] += 1; });
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

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportErr("");
      setExportMsg("");
      const res = await exportCollectionExcel(id);
      const disposition = res.headers["content-disposition"] || res.headers["Content-Disposition"];
      let filename = `${collection?.title || "collection"}.xlsx`;
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportMsg("Excel downloaded successfully");
      setTimeout(() => setExportMsg(""), 3000);
    } catch (e) {
      const msg = extractApiError(e, "Failed to download Excel");
      // Blob error responses need special handling
      if (e?.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const json = JSON.parse(text);
          setExportErr(json?.error?.message || json?.message || msg);
        } catch {
          setExportErr(msg);
        }
      } else {
        setExportErr(msg);
      }
    } finally {
      setExporting(false);
    }
  };

  if (collectionQuery.isLoading) return <div className="mx-auto max-w-4xl p-10 text-center">Loading collection...</div>;
  if (collectionQuery.isError) return <div className="mx-auto max-w-4xl p-6 text-center text-error">{extractApiError(collectionQuery.error, "Failed to load")}</div>;
  if (!collection) return <div className="mx-auto max-w-4xl p-10 text-center">Collection not found</div>;

  const cat = CATEGORY_UI[collection.category] || CATEGORY_UI.other;
  const isOverdue = collection.isOverdue;

  const backTo = isAdmin ? "/collections/history" : "/collections/pay";
  const backLabel = isAdmin ? "History" : "Collections";

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={backTo} className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> {backLabel}
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">{cat.icon}</span>
            {collection.title}
          </h1>
          <p className="page-subtitle">
            {cat.label} · {formatAmount(collection.amount)} per house · Due {formatDate(collection.dueDate)} {isOverdue && <span className="text-error font-semibold">· Overdue</span>}
          </p>
          {collection.description && <p className="mt-1 text-body-sm text-on-surface-variant">{collection.description}</p>}
          <p className="mt-1 text-label-sm text-outline">by {collection.createdByName} · {collection.status}</p>
        </div>
        {(isAdmin || canExport) && (
          <div className="flex flex-col items-end gap-2">
            {isAdmin && <span className="text-label-sm text-outline">{units.length} houses · {counts.paid + counts.late_paid} paid</span>}
            {canExport && (
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || unitsQuery.isLoading}
                className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-label-md font-medium text-on-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download Excel sheet (only for permitted roles)"
              >
                <span className="material-symbols-outlined text-[18px]">{exporting ? "hourglass_top" : "download"}</span>
                {exporting ? "Exporting..." : "Download Excel"}
              </button>
            )}
          </div>
        )}
      </section>

      {exportMsg && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-body-sm text-emerald-800">{exportMsg}</div>}
      {exportErr && <div className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">{exportErr}</div>}

      {isAdmin ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {["all", "pending", "overdue", "paid", "late_paid"].map((k) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1.5 text-label-sm ${filter === k ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest"}`}>
                {k === "all" ? "All" : STATUS_UI[k]?.label || k} {k !== "all" && `(${counts[k] || 0})`}
                {k === "all" && ` (${units.length})`}
              </button>
            ))}
            <div className="relative ml-auto max-w-xs flex-1">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search house..." className="w-full rounded-full border border-outline-variant py-1.5 pl-9 pr-4 text-body-sm" />
            </div>
          </div>

          {unitsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-container-high" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-on-surface-variant">No houses match</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {filtered.map((u) => <UnitCard key={u.unitId} unit={u} collectionId={id} />)}
            </div>
          )}
        </>
      ) : (
        <>
          {myQuery.isLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-surface-container-high" />
          ) : units.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-on-surface-variant">No house assigned to you</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {units.map((u) => (
                <Link key={u.unitId} to={`/collections/${id}/units/${u.unitId}`} className={`relative block overflow-hidden rounded-xl border p-4 pl-5 no-underline ${STATUS_UI[u.status]?.card || "border-outline-variant"}`}>
                  <span className={`absolute inset-y-0 left-0 w-1.5 ${STATUS_UI[u.status]?.stripe || "bg-outline-variant"}`} />
                  <p className="text-body-md font-semibold">House {u.label}</p>
                  <p className="text-label-sm text-on-surface-variant">{formatAmount(u.amount)} · Due {formatDate(collection.dueDate)}</p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-label-sm font-semibold ${STATUS_UI[u.status]?.pill}`}>{STATUS_UI[u.status]?.label}</span>
                  <span className="mt-2 block text-label-md text-primary">Pay / View →</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
