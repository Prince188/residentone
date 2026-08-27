import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import { getComplaints, getComplaintStats, STATUS_UI, timeAgo, extractApiError } from "../../lib/complaints";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

function ComplaintCard({ c }) {
  const ui = STATUS_UI[c.status] || STATUS_UI.open;
  return (
    <Link
      to={`/complaints/${c.id}`}
      className={`relative block overflow-hidden rounded-xl border p-4 pl-5 no-underline transition-transform hover:-translate-y-0.5 hover:shadow-md ${ui.card}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${ui.stripe}`} />
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-body-md font-semibold text-on-surface">{c.title}</h3>
        <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${ui.pill}`}>
          <span className="material-symbols-outlined text-[12px]">{ui.icon}</span> {ui.label}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">{c.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-label-sm text-outline">
        <span className="rounded-full bg-surface-container-high px-2 py-0.5">{c.category}</span>
        <span className={`rounded-full px-2 py-0.5 font-medium ${c.isPublic ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"}`}>
          {c.isPublic ? "Public" : "Private"}
        </span>
        <span>· {timeAgo(c.createdAt)}</span>
        <span>· {c.raisedByName}</span>
      </div>
    </Link>
  );
}

export default function ComplaintsPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [publicFilter, setPublicFilter] = useState("all");

  const query = useQuery({
    queryKey: ["complaints", activeSociety?.id, filter, publicFilter, search],
    queryFn: async () => {
      const params = {};
      if (filter !== "all") params.status = filter;
      if (publicFilter === "public") params.isPublic = "true";
      if (publicFilter === "private") params.isPublic = "false";
      if (search.trim()) params.q = search.trim();
      const res = await getComplaints(params);
      return res.data.data;
    },
    enabled: Boolean(activeSociety),
  });

  const statsQuery = useQuery({
    queryKey: ["complaints", "stats", activeSociety?.id],
    queryFn: async () => (await getComplaintStats()).data.data,
    enabled: Boolean(activeSociety),
  });

  const complaints = query.data || [];
  const stats = statsQuery.data;

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title">Complaints</h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}{query.isLoading ? "Loading..." : `${complaints.length} shown`}
            {stats ? ` · ${stats.open} open · ${stats.resolved} resolved` : ""}
          </p>
        </div>
        <Link
          to="/complaints/new"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md text-on-primary no-underline hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">add</span> New Complaint
        </Link>
      </section>

      <section className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1.5 text-label-sm font-medium ${filter === f.key ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline"}`}
          >
            {f.label}
          </button>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-label-sm text-on-surface-variant">Show:</span>
          <select
            value={publicFilter}
            onChange={(e) => setPublicFilter(e.target.value)}
            className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-label-sm text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="all">All (my private + all public)</option>
            <option value="public">Public only</option>
            <option value="private">My private only</option>
          </select>
        </div>
        <div className="relative max-w-xs flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or description..."
            className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-1.5 pl-9 pr-4 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
          />
        </div>
      </section>

      <div className="rounded-lg bg-surface-container-high px-3 py-2 text-label-sm text-on-surface-variant">
        <span className="font-semibold">Public</span> = everyone in society can see. <span className="font-semibold">Private</span> = only you + Admin.
      </div>

      {query.isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {query.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(query.error, "Failed to load complaints.")}
        </div>
      )}

      {query.isSuccess && complaints.length === 0 && (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">campaign</span>
          <p className="mt-3 text-body-md text-on-surface-variant">No complaints here. Tap "New Complaint" to create one.</p>
          <p className="mt-1 text-label-sm text-outline">Choose Public if it affects everyone (lift, parking), Private if personal (my flat leak).</p>
        </div>
      )}

      {query.isSuccess && complaints.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {complaints.map((c) => (
            <ComplaintCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
