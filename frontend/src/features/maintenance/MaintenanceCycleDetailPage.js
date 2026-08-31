import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { getCycles, getCycleUnits, exportMaintenanceExcel, extractApiError, formatAmount, formatDate, periodLabel, STATUS_UI } from "../../lib/maintenance";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

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

export default function MaintenanceCycleDetailPage() {
  const { cycleId } = useParams();
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
      const res = await exportMaintenanceExcel(cycle.id);
      const disposition = res.headers["content-disposition"] || res.headers["Content-Disposition"];
      let filename = `${periodLabel(cycle.month, cycle.year, cycle.durationMonths)}.xlsx`;
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
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || unitsQuery.isLoading}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">{exporting ? "hourglass_top" : "download"}</span>
          {exporting ? "Exporting..." : "Download Excel"}
        </button>
      </section>

      {exportMsg && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-body-sm text-emerald-800">{exportMsg}</div>}
      {exportErr && <div className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">{exportErr}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex flex-wrap gap-2">
            {filterOptions.map((opt) => {
              const isActive = filter === opt.key;
              const activeClass = opt.key === "all" ? "border-primary bg-primary text-on-primary" : STATUS_UI[opt.key]?.chip || "bg-zinc-100";
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

      {unitsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">No houses match your search or filter.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((unit) => (
            <HouseCard key={unit.unitId} unit={unit} cycle={cycle} />
          ))}
        </div>
      )}
    </div>
  );
}
