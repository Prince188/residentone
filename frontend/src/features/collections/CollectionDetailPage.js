import { useMemo, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import {
  getCollection,
  getCollectionUnits,
  getCollectionUnitDetail,
  updateCollection,
  closeCollection,
  exportCollectionExcel,
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
import HouseCard from "../../components/cards/HouseCard";

function UnitCard({ unit, collectionId }) {
  const isSettled = ["paid", "late_paid"].includes(unit.status);
  const dateLine = isSettled
    ? `Paid on ${formatDate(unit.paidOn)}${unit.receiptNo ? ` · #${unit.receiptNo}` : ""}`
    : `Due by ${formatDate(unit.collection?.dueDate)}`;

  return (
    <HouseCard
      house={{
        label: unit.label,
        block: unit.block,
        floor: unit.floor,
        ownerName: unit.ownerName || "No resident",
      }}
      variant="billing"
      status={unit.status || "pending"}
      amount={unit.amount}
      dateLine={dateLine}
      to={`/collections/${collectionId}/units/${unit.unitId}?from=admin`}
    />
  );
}

function EditCollectionModal({ collection, open, onClose, onSave, isSaving, hasPayments, error }) {
  const [title, setTitle] = useState(collection?.title || "");
  const [category, setCategory] = useState(collection?.category || "festival");
  const [description, setDescription] = useState(collection?.description || "");
  const [amount, setAmount] = useState(collection?.amount || 0);
  const [dueDate, setDueDate] = useState(
    collection?.dueDate ? new Date(collection.dueDate).toISOString().slice(0, 10) : ""
  );

  useEffect(() => {
    if (collection) {
      setTitle(collection.title || "");
      setCategory(collection.category || "festival");
      setDescription(collection.description || "");
      setAmount(collection.amount || 0);
      setDueDate(collection.dueDate ? new Date(collection.dueDate).toISOString().slice(0, 10) : "");
    }
  }, [collection, open]);

  if (!open || !collection) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      category,
      description: description.trim(),
      dueDate,
    };
    if (!hasPayments) {
      payload.amount = Number(amount);
    }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={isSaving ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xl sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md font-bold text-on-surface">Edit Collection Fund</h3>
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && <p className="rounded-lg bg-error-container p-3 text-label-md text-on-error-container">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-label-sm font-semibold text-on-surface mb-1 block">Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-label-sm font-semibold text-on-surface mb-1 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
              >
                {COLLECTION_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label-sm font-semibold text-on-surface mb-1 block">Due Date *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-label-sm font-semibold text-on-surface mb-1 block">Amount Per House (₹) *</label>
            <input
              type="number"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={hasPayments}
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none disabled:bg-surface-container-high disabled:text-outline"
            />
          </div>

          {hasPayments && (
            <p className="text-[12px] text-outline bg-surface-container-low p-2.5 rounded-lg">
              ℹ️ Amount is locked because payments have already been recorded. You can still adjust the title, description, and due date.
            </p>
          )}

          <div>
            <label className="text-label-sm font-semibold text-on-surface mb-1 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-outline-variant px-4 py-2 text-label-md text-on-surface hover:bg-surface-container-low cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !dueDate}
              className="rounded-lg bg-primary px-5 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CollectionDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [exportErr, setExportErr] = useState("");
  const [editingCollection, setEditingCollection] = useState(false);
  const [actionError, setActionError] = useState("");

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

  const hasPayments = (counts.paid + counts.late_paid) > 0;

  const updateMutation = useMutation({
    mutationFn: (payload) => updateCollection(id, payload).then((r) => r.data.data),
    onSuccess: () => {
      setEditingCollection(false);
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["collection", id] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (err) => setActionError(extractApiError(err, "Failed to update collection fund")),
  });

  const [closingConfirm, setClosingConfirm] = useState(false);

  const closeMutation = useMutation({
    mutationFn: () => closeCollection(id).then((r) => r.data.data),
    onSuccess: () => {
      setClosingConfirm(false);
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["collection", id] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (err) => setActionError(extractApiError(err, "Failed to close collection fund")),
  });

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

  const backTo = isAdmin ? "/collections/manage" : `/collections/pay?collection=${id}`;
  const backLabel = isAdmin ? "Manage Collections" : "Collections";

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
        <div className="flex flex-col items-end gap-2">
          {isAdmin && <span className="text-label-sm text-outline">{units.length} houses · {counts.paid + counts.late_paid} paid</span>}
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setActionError("");
                  setEditingCollection(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit Fund
              </button>
            )}
            {isAdmin && collection.status !== "closed" && (
              <button
                type="button"
                onClick={() => setClosingConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md font-semibold text-amber-700 dark:text-amber-400 hover:border-amber-500 transition-colors cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                Close Fund
              </button>
            )}
            {canExport && (
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || unitsQuery.isLoading}
                className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-label-md font-medium text-on-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                title="Download Excel sheet"
              >
                <span className="material-symbols-outlined text-[18px]">{exporting ? "hourglass_top" : "download"}</span>
                {exporting ? "Exporting..." : "Download Excel"}
              </button>
            )}
          </div>
        </div>
      </section>

      {actionError && <p className="rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">{actionError}</p>}
      {exportMsg && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-body-sm text-emerald-800">{exportMsg}</div>}
      {exportErr && <div className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">{exportErr}</div>}

      {isAdmin ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {["all", "pending", "overdue", "paid", "late_paid"].map((k) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1.5 text-label-sm cursor-pointer ${filter === k ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest"}`}>
                {k === "all" ? "All" : STATUS_UI[k]?.label || k} {k !== "all" && `(${counts[k] || 0})`}
                {k === "all" && ` (${units.length})`}
              </button>
            ))}
            <div className="relative ml-auto max-w-xs flex-1">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search house..." className="w-full rounded-full border border-outline-variant py-1.5 pl-9 pr-4 text-body-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((u) => (
              <UnitCard key={u.unitId} unit={u} collectionId={id} />
            ))}
          </div>
          {filtered.length === 0 && <div className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-body-sm text-on-surface-variant">No houses found</div>}
        </>
      ) : (
        <div className="space-y-3">
          <h3 className="text-title-md font-semibold">Your Houses</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {units.map((u) => (
              <UnitCard key={u.unitId} unit={u} collectionId={id} />
            ))}
          </div>
          {units.length === 0 && <div className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-body-sm text-on-surface-variant">No assigned houses found</div>}
        </div>
      )}

      <EditCollectionModal
        collection={collection}
        open={editingCollection}
        hasPayments={hasPayments}
        onClose={() => {
          setEditingCollection(false);
          setActionError("");
        }}
        onSave={(data) => updateMutation.mutate(data)}
        isSaving={updateMutation.isPending}
        error={actionError}
      />

      <ConfirmDialog
        open={closingConfirm}
        title={`Close Collection: ${collection.title}?`}
        message="Are you sure you want to close this collection fund? It will be archived to History and marked as completed."
        confirmLabel="Close Fund"
        busy={closeMutation.isPending}
        error={actionError}
        onConfirm={() => closeMutation.mutate()}
        onClose={() => {
          setClosingConfirm(false);
          setActionError("");
        }}
      />
    </div>
  );
}
