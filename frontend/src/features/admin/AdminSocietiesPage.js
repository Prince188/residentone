import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore from "../../stores/society.store";
import {
  listSocieties,
  getSocietyStats,
  approveSociety,
  SOCIETY_TYPE_LABELS,
  SUBSCRIPTION_PLAN_LABELS,
} from "../../lib/societies";
import StatusBadge from "../../components/ui/StatusBadge";
import { getSubscriptionRenewalMeta } from "../dashboard/SubscriptionStatusCard";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active_paid", label: "Active (Paid)" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "unpaid", label: "Unpaid" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "churned", label: "Freeze / Churned" },
  { value: "trial", label: "Trial" },
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

  const queryClient = useQueryClient();
  const approveMutation = useMutation({
    mutationFn: (id) => approveSociety(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["societies"] });
      queryClient.invalidateQueries({ queryKey: ["society-stats"] });
    },
  });

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
    { label: "Total Societies", value: stats?.societies?.total ?? stats?.total ?? "-", status: "" },
    { label: "Active (Paid)", value: stats?.societies?.active ?? stats?.active ?? "-", tone: "success", status: "active_paid" },
    { label: "Approved", value: stats?.societies?.approved ?? stats?.approved ?? "-", tone: "primary", status: "approved" },
    { label: "Pending", value: stats?.societies?.pending ?? stats?.pending ?? "-", tone: "warning", status: "pending" },
    { label: "Unpaid", value: stats?.societies?.unpaid ?? stats?.unpaid ?? "-", tone: "caution", status: "unpaid" },
    { label: "Suspended", value: stats?.societies?.suspended ?? stats?.suspended ?? "-", tone: "muted", status: "suspended" },
    { label: "Rejected", value: stats?.societies?.rejected ?? stats?.rejected ?? "-", tone: "danger", status: "rejected" },
    { label: "Freeze / Churned", value: stats?.societies?.churned ?? stats?.churned ?? "-", tone: "muted", status: "churned" },
    { label: "Trial", value: stats?.societies?.trial ?? stats?.trial ?? "-", tone: "info", status: "trial" },
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

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {statCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => setStatus(card.status)}
            className={`relative rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
              statusFilter === card.status
                ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low hover:border-outline"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-outline truncate">
              {card.label}
            </p>
            <p className="mt-1 text-headline-md font-extrabold text-on-surface">{card.value}</p>
            {card.status === "pending" && (stats?.societies?.pending ?? stats?.pending ?? 0) > 0 && (
              <span className="absolute top-2.5 right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[11px] font-bold text-on-error">
                {stats?.societies?.pending ?? stats?.pending}
              </span>
            )}
          </button>
        ))}
      </section>

      {statusFilter === "pending" && (stats?.societies?.pending ?? stats?.pending ?? 0) > 0 && (
        <Link
          to="/admin/societies/pending"
          className="flex items-center gap-3 rounded-xl border border-secondary-fixed bg-secondary-fixed/40 px-4 py-3 no-underline transition-colors hover:bg-secondary-fixed/60"
        >
          <span className="material-symbols-outlined text-primary">pending_actions</span>
          <span className="text-body-sm font-semibold text-on-surface">
            {stats?.societies?.pending ?? stats?.pending} registration{(stats?.societies?.pending ?? stats?.pending) > 1 ? "s" : ""} awaiting review
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
            <table className="w-full min-w-[780px] text-left">
              <thead>
                <tr className="border-b border-outline-variant text-label-sm uppercase tracking-wide text-outline">
                  <th className="px-4 py-3 font-semibold">Society</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
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
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        society.subscriptionPlan === "enterprise"
                          ? "bg-violet-100 text-violet-800"
                          : society.subscriptionPlan === "professional"
                          ? "bg-primary/10 text-primary"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {SUBSCRIPTION_PLAN_LABELS[society.subscriptionPlan] || "Basic"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {society.isSubscriptionPaid ? (
                        (() => {
                          const meta = getSubscriptionRenewalMeta(society);
                          return (
                            <div className="space-y-0.5">
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${
                                meta.isExpired
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : meta.isExpiringSoon
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  meta.isExpired ? "bg-red-500" : meta.isExpiringSoon ? "bg-amber-500" : "bg-emerald-500"
                                }`} />
                                {meta.isExpired ? "Expired" : "Paid"}
                              </span>
                              {meta.formattedDate && (
                                <p className={`text-[10px] font-medium leading-tight ${
                                  meta.isExpired ? "text-red-700" : "text-on-surface-variant"
                                }`}>
                                  {meta.isExpired ? `Exp ${meta.formattedDate}` : `Renews ${meta.formattedDate}`}
                                </p>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Unpaid
                        </span>
                      )}
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
                        {society.status === "rejected" && (
                          <button
                            type="button"
                            onClick={() => approveMutation.mutate(society._id)}
                            disabled={approveMutation.isPending}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-label-sm font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                            title="Re-approve and activate this rejected society"
                          >
                            <span className="material-symbols-outlined text-[15px]">check_circle</span>
                            Re-Approve
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
