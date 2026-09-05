import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { getComplaint, updateComplaintStatus, STATUS_UI, timeAgo, extractApiError } from "../../lib/complaints";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";
const STATUS_OPTIONS = ["open", "in_progress", "on_hold", "resolved", "closed"];

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const membership = useSocietyStore(selectActiveMembership);
  const activeSociety = useSocietyStore(selectActiveSociety);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManageComplaints = hasPermission(membership?.role, "manage_complaints", permissionsQuery.data);
  const [error, setError] = useState("");

  const query = useQuery({
    queryKey: ["complaints", id],
    queryFn: async () => (await getComplaint(id)).data.data,
  });

  const statusMutation = useMutation({
    mutationFn: (status) => updateComplaintStatus(id, status).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      query.refetch();
    },
    onError: (err) => setError(extractApiError(err, "Failed to update status.")),
  });

  const reopenMutation = useMutation({
    mutationFn: () => updateComplaintStatus(id, "reopened").then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      query.refetch();
    },
    onError: (err) => setError(extractApiError(err, "Failed to reopen.")),
  });

  if (query.isLoading) {
    return <div className="mx-auto max-w-6xl p-10 text-center text-body-md text-on-surface-variant">Loading complaint...</div>;
  }
  if (query.isError) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Link to="/complaints" className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Complaints
        </Link>
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(query.error, "Failed to load complaint.")}
        </div>
      </div>
    );
  }

  const c = query.data;
  const ui = STATUS_UI[c.status] || STATUS_UI.open;
  const canReopen = !canManageComplaints && (c.status === "resolved" || c.status === "closed");

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <Link to="/complaints" className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Complaints
      </Link>

      <article className={`relative overflow-hidden rounded-xl border p-5 pl-6 ${ui.card}`}>
        <span className={`absolute inset-y-0 left-0 w-1.5 ${ui.stripe}`} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-headline-sm font-semibold text-on-surface">{c.title}</h1>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-semibold ${ui.pill}`}>
            <span className="material-symbols-outlined text-[14px]">{ui.icon}</span> {ui.label}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-label-sm text-on-surface-variant">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-1">
            <span className="material-symbols-outlined text-[14px]">category</span> {c.category}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-1">
            <span className="material-symbols-outlined text-[14px]">flag</span> {c.priority}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-label-sm font-semibold ${c.isPublic ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-700"}`}>
            <span className="material-symbols-outlined text-[14px]">{c.isPublic ? "public" : "lock"}</span> {c.isPublic ? "Public" : "Private"}
          </span>
          <span>{timeAgo(c.createdAt)}</span>
          <span>·</span> <span>by {c.raisedByName}</span>
          {c.unitLabel && <span>· House {c.unitLabel}</span>}
        </div>
        <p className="mt-4 whitespace-pre-line text-body-md text-on-surface-variant">{c.description}</p>
        {c.assignedToName && (
          <p className="mt-3 flex items-center gap-1 text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">person</span> Assigned to: {c.assignedToName}
          </p>
        )}
      </article>

      {error && <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">{error}</p>}

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <h3 className="text-body-md font-semibold text-on-surface">Actions</h3>
        {canManageComplaints ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUS_OPTIONS.filter((s) => s !== c.status).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setError("");
                  statusMutation.mutate(s);
                }}
                disabled={statusMutation.isPending}
                className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-label-sm font-medium text-on-surface hover:border-primary hover:text-primary disabled:opacity-50"
              >
                Mark {STATUS_UI[s]?.label || s}
              </button>
            ))}
          </div>
        ) : canReopen ? (
          <button
            type="button"
            onClick={() => {
              setError("");
              reopenMutation.mutate();
            }}
            disabled={reopenMutation.isPending}
            className="mt-3 rounded-full bg-primary px-4 py-2 text-label-md text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            {reopenMutation.isPending ? "Reopening..." : "Reopen Complaint"}
          </button>
        ) : (
          <p className="mt-2 text-body-sm text-on-surface-variant">
            {c.status === "open" || c.status === "reopened"
              ? "Waiting for admin to take action."
              : c.status === "resolved" || c.status === "closed"
                ? "You can reopen if not fixed."
                : "Admin is working on it."}
          </p>
        )}
        {!canManageComplaints && !canReopen && (c.status === "resolved" || c.status === "closed") && (
          <p className="mt-2 text-label-sm text-outline">Only the owner who raised can reopen.</p>
        )}
      </section>
    </div>
  );
}
