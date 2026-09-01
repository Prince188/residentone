import { useMemo, useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { getCycles, getCycleUnits, updateCycle, deleteCycle, exportMaintenanceExcel, extractApiError, formatAmount, formatDate, periodLabel, STATUS_UI } from "../../lib/maintenance";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

function HouseCard({ unit, cycle }) {
  const status = STATUS_UI[unit.status] || STATUS_UI.pending;
  const isSettled = ["paid", "late_paid"].includes(unit.status);
  const dateLine = isSettled ? `Paid on ${formatDate(unit.paidOn)}` : `Due by ${formatDate(cycle.dueDate)}`;
  return (
    <Link
      to={`/dues/${unit.unitId}?cycle=${cycle.id}`}
      className={`relative block overflow-hidden rounded-xl border p-4 pl-5 no-underline transition-transform hover:-translate-y-0.5 hover:shadow-md ${status.card}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${status.stripe}`} />
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.iconBox}`}>
          <span className="material-symbols-outlined text-[22px]">{unit.isOccupied ? "home" : "home_work"}</span>
        </span>
        <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${status.pill}`}>
          <span className="material-symbols-outlined text-[13px]">{status.icon}</span>
          {status.label}
        </span>
      </div>
      <p className="mt-3 truncate text-headline-sm font-semibold text-on-surface">House {unit.label}</p>
      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant flex items-center gap-1.5">
        {unit.ownerName ? (
          <>
            <span>{unit.ownerName}</span>
            {unit.isRenterOccupied && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Renter</span>}
          </>
        ) : (
          "No resident assigned"
        )}
        <span>· {formatAmount(unit.amount)}</span>
      </p>
      <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] font-semibold text-on-surface-variant">
        <span className="material-symbols-outlined shrink-0 text-[13px]">event</span>
        {dateLine}
      </p>
    </Link>
  );
}

function EditCycleModal({ cycle, open, onClose, onSave, isSaving, hasPayments, error }) {
  const [dueDate, setDueDate] = useState(
    cycle?.dueDate ? new Date(cycle.dueDate).toISOString().slice(0, 10) : ""
  );
  const [ownerAmount, setOwnerAmount] = useState(cycle?.ownerAmount || cycle?.amount || 0);
  const [renterAmount, setRenterAmount] = useState(cycle?.renterAmount || cycle?.amount || 0);

  useEffect(() => {
    if (cycle) {
      setDueDate(cycle.dueDate ? new Date(cycle.dueDate).toISOString().slice(0, 10) : "");
      setOwnerAmount(cycle.ownerAmount || cycle.amount || 0);
      setRenterAmount(cycle.renterAmount || cycle.amount || 0);
    }
  }, [cycle, open]);

  if (!open || !cycle) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { dueDate };
    if (!hasPayments) {
      payload.ownerAmount = Number(ownerAmount);
      payload.renterAmount = Number(renterAmount);
      payload.amount = Number(ownerAmount);
    }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={isSaving ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xl sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md font-bold text-on-surface">Edit Maintenance Cycle</h3>
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && <p className="rounded-lg bg-error-container p-3 text-label-md text-on-error-container">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-label-sm font-semibold text-on-surface mb-1 block">Owner Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={ownerAmount}
                onChange={(e) => setOwnerAmount(e.target.value)}
                disabled={hasPayments}
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none disabled:bg-surface-container-high disabled:text-outline"
              />
            </div>
            <div>
              <label className="text-label-sm font-semibold text-on-surface mb-1 block">Renter Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={renterAmount}
                onChange={(e) => setRenterAmount(e.target.value)}
                disabled={hasPayments}
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none disabled:bg-surface-container-high disabled:text-outline"
              />
            </div>
          </div>

          {hasPayments && (
            <p className="text-[12px] text-outline bg-surface-container-low p-2.5 rounded-lg">
              ℹ️ Billing amounts are locked because payments have already been collected for this cycle. You can still adjust the due date.
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-outline-variant px-4 py-2 text-label-md text-on-surface hover:bg-surface-container-low cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !dueDate}
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

export default function MaintenanceCycleDetailPage() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [exportErr, setExportErr] = useState("");
  const [editingCycle, setEditingCycle] = useState(false);
  const [deletingCycle, setDeletingCycle] = useState(false);
  const [actionError, setActionError] = useState("");

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManage = hasPermission(membership?.role, "manage_maintenance", permissionsQuery.data);

  const cyclesQuery = useQuery({
    queryKey: ["maintenance", "cycles", activeSociety?.id],
    queryFn: async () => (await getCycles()).data.data,
    enabled: Boolean(activeSociety),
  });

  const cycle = useMemo(() => {
    const list = cyclesQuery.data || [];
    return list.find((c) => c.id === cycleId) || null;
  }, [cyclesQuery.data, cycleId]);

  const unitsQuery = useQuery({
    queryKey: ["maintenance", "cycle-units", cycle?.id],
    queryFn: async () => (await getCycleUnits(cycle.id)).data.data,
    enabled: Boolean(cycle?.id && canManage),
  });

  const units = useMemo(() => unitsQuery.data || [], [unitsQuery.data]);

  const counts = useMemo(() => {
    const base = { paid: 0, pending: 0, overdue: 0, late_paid: 0 };
    units.forEach((u) => { if (base[u.status] !== undefined) base[u.status] += 1; });
    return base;
  }, [units]);

  const hasPayments = (counts.paid + counts.late_paid) > 0;

  const updateMutation = useMutation({
    mutationFn: (payload) => updateCycle(cycleId, payload).then((r) => r.data.data),
    onSuccess: () => {
      setEditingCycle(false);
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["maintenance", "cycles"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance", "cycle-units", cycleId] });
    },
    onError: (err) => setActionError(extractApiError(err, "Failed to update cycle")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCycle(cycleId).then((r) => r.data.data),
    onSuccess: () => {
      setDeletingCycle(false);
      queryClient.invalidateQueries({ queryKey: ["maintenance", "cycles"] });
      navigate("/dues/history");
    },
    onError: (err) => setActionError(extractApiError(err, "Failed to delete cycle")),
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
    if (!cycle) return;
    try {
      setExporting(true);
      setExportMsg("");
      setExportErr("");
      const res = await exportMaintenanceExcel(cycle.id);
      const disposition = res.headers["content-disposition"] || res.headers["Content-Disposition"];
      let filename = `Maintenance_${period.replace(/\s+/g, "_")}.xlsx`;
      if (disposition) {
        const m = disposition.match(/filename="?([^"]+)"?/);
        if (m && m[1]) filename = m[1];
      }
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportMsg(`Downloaded ${filename}`);
      setTimeout(() => setExportMsg(""), 3000);
    } catch (e) {
      const msg = extractApiError(e, "Export failed");
      if (e?.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const j = JSON.parse(text);
          setExportErr(j?.error?.message || msg);
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

  if (!canManage) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="page-title mt-3">No permission</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">You don’t have permission to view this cycle. Ask your Society Admin for <strong>Manage Maintenance</strong>.</p>
          <Link to="/dues/history" className="mt-4 inline-block text-label-md text-primary no-underline hover:underline">Back to History</Link>
        </div>
      </div>
    );
  }

  if (cyclesQuery.isLoading) return <div className="mx-auto max-w-4xl p-10 text-center">Loading cycle...</div>;
  if (cyclesQuery.isError) return <div className="mx-auto max-w-4xl p-6 text-center text-error">{extractApiError(cyclesQuery.error, "Failed to load")}</div>;
  if (!cycle) return <div className="mx-auto max-w-4xl p-10 text-center">Cycle not found <Link to="/dues/history" className="text-primary hover:underline">Back to History</Link></div>;

  const period = periodLabel(cycle.month, cycle.year, cycle.durationMonths);
  const isOverdue = new Date(cycle.dueDate) < new Date();

  const filterOptions = [
    { key: "all", label: "All", count: units.length },
    ...Object.keys(STATUS_UI).map((key) => ({ key, label: STATUS_UI[key].label, count: counts[key] || 0 })),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/dues/history" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> History
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">request_quote</span>
            {period}
          </h1>
          <p className="page-subtitle">
            Owner {formatAmount(cycle.ownerAmount || cycle.amount)} / Renter {formatAmount(cycle.renterAmount || cycle.amount)} · Due {formatDate(cycle.dueDate)} {isOverdue && <span className="text-error font-semibold">· Overdue</span>}
          </p>
          <p className="mt-1 text-label-sm text-outline">{units.length} houses · {counts.paid + counts.late_paid} paid · {cycle.durationMonths > 1 ? `${cycle.durationMonths} months` : "1 month"}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActionError("");
              setEditingCycle(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-label-md font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit Cycle
          </button>
          {!hasPayments && (
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setDeletingCycle(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-label-md font-semibold text-error hover:bg-error-container transition-colors cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || unitsQuery.isLoading}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md font-medium text-on-primary hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">{exporting ? "hourglass_top" : "download"}</span>
            {exporting ? "Exporting..." : "Download Excel"}
          </button>
        </div>
      </section>

      {actionError && <p className="rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">{actionError}</p>}
      {exportMsg && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-body-sm text-emerald-800">{exportMsg}</div>}
      {exportErr && <div className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">{exportErr}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex flex-wrap gap-2">
            {filterOptions.map((opt) => {
              const isActive = filter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFilter(opt.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-label-sm ${
                      isActive ? "bg-white/20 text-white" : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="sm:hidden w-full">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm"
            >
              {filterOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search house or owner..."
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 text-body-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {unitsQuery.isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {unitsQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(unitsQuery.error, "Failed to load houses.")}
        </div>
      )}

      {unitsQuery.isSuccess && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-outline-variant p-10 text-center text-body-md text-on-surface-variant">
          No houses match the selected filters.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((u) => (
            <HouseCard key={u.unitId} unit={u} cycle={cycle} />
          ))}
        </div>
      )}

      <EditCycleModal
        cycle={cycle}
        open={editingCycle}
        hasPayments={hasPayments}
        onClose={() => {
          setEditingCycle(false);
          setActionError("");
        }}
        onSave={(data) => updateMutation.mutate(data)}
        isSaving={updateMutation.isPending}
        error={actionError}
      />

      <ConfirmDialog
        open={deletingCycle}
        title={`Delete Maintenance Cycle ${period}?`}
        message="Are you sure you want to delete this billing cycle? It will be removed since no payments have been recorded."
        confirmLabel="Delete Cycle"
        danger
        busy={deleteMutation.isPending}
        error={actionError}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => {
          setDeletingCycle(false);
          setActionError("");
        }}
      />
    </div>
  );
}
