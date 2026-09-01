import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore from "../../stores/society.store";
import {
  listSocieties,
  getSocietyStats,
  SOCIETY_TYPE_LABELS,
} from "../../lib/societies";
import StatusBadge from "../../components/ui/StatusBadge";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminSocietiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "";
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const statsQuery = useQuery({
    queryKey: ["society-stats"],
    queryFn: async () => (await getSocietyStats()).data.data,
  });

  const societiesQuery = useQuery({
    queryKey: ["societies", statusFilter, search],
    queryFn: async () =>
      (
        await listSocieties({
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(search ? { search } : {}),
        })
      ).data.data,
  });

  const stats = statsQuery.data;
  const societies = societiesQuery.data || [];

  const enterSocietyAsSuperAdmin = useSocietyStore((state) => state.enterSocietyAsSuperAdmin);
  const navigate = useNavigate();

  const handleEnterSociety = (society) => {
    enterSocietyAsSuperAdmin(society);
    navigate("/dashboard");
  };

  const applySearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const setStatus = (value) => {
    const next = new URLSearchParams();
    if (value) next.set("status", value);
    setSearchParams(next);
  };

  const statCards = [
    { label: "All Societies", value: stats?.total ?? "-", tone: "default", status: "" },
    { label: "Pending Approvals", value: stats?.pending ?? "-", tone: "warning", status: "pending" },
    { label: "Active", value: stats?.active ?? "-", tone: "success", status: "active" },
    { label: "Rejected", value: stats?.rejected ?? "-", tone: "danger", status: "rejected" },
    { label: "Suspended", value: stats?.suspended ?? "-", tone: "muted", status: "suspended" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Societies</h1>
          <p className="page-subtitle">
            Manage society registrations across the ResidentOne platform.
          </p>
        </div>
        <Link
          to="/admin/societies/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-md text-label-md text-on-primary transition-colors hover:bg-inverse-surface no-underline"
        >
          <span className="material-symbols-outlined text-[18px]">add_business</span>
          Create Society
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => setStatus(card.status)}
            className={`relative rounded-xl border p-4 text-left transition-colors cursor-pointer ${
              statusFilter === card.status
                ? "border-primary bg-primary-fixed/50"
                : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
              {card.label}
            </p>
            <p className="mt-1 text-headline-md text-on-surface">{card.value}</p>
            {card.status === "pending" && (stats?.pending ?? 0) > 0 && (
              <span className="absolute top-3 right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[11px] font-bold text-on-error">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </section>

      {statusFilter === "pending" && (stats?.pending ?? 0) > 0 && (
        <Link
          to="/admin/societies/pending"
          className="flex items-center gap-3 rounded-xl border border-secondary-fixed bg-secondary-fixed/40 px-4 py-3 no-underline transition-colors hover:bg-secondary-fixed/60"
        >
          <span className="material-symbols-outlined text-primary">pending_actions</span>
          <span className="text-body-sm font-semibold text-on-surface">
            {stats.pending} registration{stats.pending > 1 ? "s" : ""} awaiting review
          </span>
          <span className="ml-auto material-symbols-outlined text-on-surface-variant">
            arrow_forward
          </span>
        </Link>
      )}

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant p-4">
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className={`rounded-full px-3.5 py-1.5 text-label-sm transition-colors cursor-pointer ${
                  statusFilter === f.value
                    ? "bg-inverse-surface text-white"
                    : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <form onSubmit={applySearch} className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search by name or city"
              aria-label="Search societies"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-56 border border-outline-variant rounded-lg bg-white px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="rounded-lg border border-outline-variant px-3 py-2 text-label-md text-on-surface transition-colors hover:bg-surface-container-low cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] align-middle">search</span>
            </button>
          </form>
        </div>

        {societiesQuery.isLoading ? (
          <div className="p-10 text-center text-body-sm text-on-surface-variant">
            Loading societies...
          </div>
        ) : societiesQuery.isError ? (
          <div className="p-10 text-center text-body-sm text-error">
            Failed to load societies. Please try again.
          </div>
        ) : societies.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[40px] text-outline">apartment</span>
            <p className="mt-2 text-body-md font-semibold text-on-surface">No societies found</p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {search || statusFilter
                ? "Try adjusting your search or filters."
                : "Get started by creating a society."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-outline-variant text-label-sm uppercase tracking-wide text-outline">
                  <th className="px-4 py-3 font-semibold">Society</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Units</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {societies.map((society) => (
                  <tr
                    key={society._id}
                    className="border-b border-outline-variant/60 last:border-0 hover:bg-surface-container-low/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/societies/${society._id}`}
                        className="font-semibold text-on-surface hover:text-primary no-underline"
                      >
                        {society.name}
                      </Link>
                      <p className="text-label-sm text-on-surface-variant">{society.contactEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">{society.city}</td>
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                      {SOCIETY_TYPE_LABELS[society.societyType] || "-"}
                    </td>
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                      {society.totalUnits ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={society.status} />
                    </td>
                    <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                      {formatDate(society.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {society.status === "active" && (
                          <button
                            type="button"
                            onClick={() => handleEnterSociety(society)}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-label-sm font-semibold text-primary hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                            title="Enter and manage this society as Super Admin"
                          >
                            <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
                            Manage
                          </button>
                        )}
                        <Link
                          to={`/admin/societies/${society._id}`}
                          className="text-label-md text-on-surface-variant hover:text-primary no-underline font-medium"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
