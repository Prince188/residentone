import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSocieties,
  approveSociety,
  rejectSociety,
  SOCIETY_TYPE_LABELS,
  extractApiError,
} from "../../lib/societies";
import StatusBadge from "../../components/ui/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PendingApprovalsPage() {
  const queryClient = useQueryClient();
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionError, setActionError] = useState("");
  const [approvedAccount, setApprovedAccount] = useState(null);

  const pendingQuery = useQuery({
    queryKey: ["societies", "pending"],
    queryFn: async () => (await listSocieties({ status: "pending" })).data.data,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => approveSociety(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["societies"] });
      queryClient.invalidateQueries({ queryKey: ["society-stats"] });
      closeDialogs();
      const account = response?.data?.adminAccount;
      if (account) setApprovedAccount(account);
    },
    onError: (error) =>
      setActionError(extractApiError(error, "Failed to approve society.")),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectSociety(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["societies"] });
      queryClient.invalidateQueries({ queryKey: ["society-stats"] });
      closeDialogs();
    },
    onError: (error) =>
      setActionError(extractApiError(error, "Failed to reject society.")),
  });

  const closeDialogs = () => {
    setApproveTarget(null);
    setRejectTarget(null);
    setActionError("");
  };

  const societies = pendingQuery.data || [];

  return (
    <div className="mx-auto max-w-6xl space-y-stack-lg">
      <div>
        <h1 className="text-headline-md text-on-surface">Pending Approvals</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Society registrations waiting for review. Approve to activate or reject
          with a reason.
        </p>
      </div>

      {approvedAccount && (
        <section className="rounded-xl border border-tertiary-fixed bg-tertiary-fixed/30 px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">manage_accounts</span>
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-semibold text-on-surface">
                {approvedAccount.name} is now the Primary Society Admin
                {approvedAccount.accountCreated
                  ? " — share these login details with them:"
                  : ` (${approvedAccount.email}) can now manage the society with their existing account.`}
              </p>
              {approvedAccount.accountCreated && (
                <div className="mt-2 inline-flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3">
                  <span className="text-label-sm text-on-surface">
                    Email: <strong>{approvedAccount.email}</strong>
                  </span>
                  <span className="text-label-sm text-on-surface">
                    Temporary password:{" "}
                    <strong className="break-all">{approvedAccount.temporaryPassword}</strong>
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setApprovedAccount(null)}
              aria-label="Dismiss"
              className="text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center justify-between border-b border-outline-variant p-4">
          <p className="text-label-sm uppercase tracking-wide text-outline">
            Awaiting Review
          </p>
          <span
            className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-label-sm font-bold ${
              societies.length > 0
                ? "bg-error text-on-error"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {pendingQuery.isLoading ? "-" : societies.length}
          </span>
        </div>

        {pendingQuery.isLoading ? (
          <div className="p-10 text-center text-body-sm text-on-surface-variant">
            Loading registrations...
          </div>
        ) : pendingQuery.isError ? (
          <div className="p-10 text-center text-body-sm text-error">
            Failed to load pending registrations.
          </div>
        ) : societies.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[40px] text-outline">
              task_alt
            </span>
            <p className="mt-2 text-body-md font-semibold text-on-surface">
              No pending approvals
            </p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              All society registrations have been reviewed.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/60">
            {societies.map((society) => (
              <li key={society._id} className="p-4 hover:bg-surface-container-low/50">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/societies/${society._id}`}
                        className="truncate text-body-lg font-semibold text-on-surface hover:text-primary no-underline"
                      >
                        {society.name}
                      </Link>
                      <StatusBadge status={society.status} />
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-body-sm text-on-surface-variant md:grid-cols-4">
                      <span>{SOCIETY_TYPE_LABELS[society.societyType] || "-"}</span>
                      <span>{society.city}</span>
                      <span>{society.totalUnits ?? "-"} units</span>
                      <span>Registered {formatDate(society.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-body-sm text-on-surface-variant">
                      {society.contactPersonName} ·{" "}
                      <a href={`mailto:${society.contactEmail}`} className="text-primary hover:underline">
                        {society.contactEmail}
                      </a>{" "}
                      · {society.contactPhone}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to={`/admin/societies/${society._id}`}
                      className="rounded-lg border border-outline-variant px-3 py-2 text-label-md text-on-surface transition-colors hover:bg-surface-container-low no-underline"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setActionError("");
                        setApproveTarget(society);
                      }}
                      className="rounded-lg bg-primary px-3 py-2 text-label-md text-on-primary transition-colors hover:bg-inverse-surface cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionError("");
                        setRejectTarget(society);
                      }}
                      className="rounded-lg border border-error px-3 py-2 text-label-md text-error transition-colors hover:bg-error-container cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(approveTarget)}
        title={`Approve ${approveTarget?.name}?`}
        message={
          "The society will become active on ResidentOne immediately.\nThis action cannot be undone for pending registrations."
        }
        confirmLabel="Approve Society"
        busy={approveMutation.isPending}
        error={actionError}
        onConfirm={() => approveMutation.mutate(approveTarget._id)}
        onClose={closeDialogs}
      />

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title={`Reject ${rejectTarget?.name}?`}
        message="Why are you rejecting this registration? The reason will be recorded for auditing."
        confirmLabel="Reject Society"
        danger
        requireReason
        reasonLabel="Rejection reason"
        reasonPlaceholder="e.g. Incomplete society details provided"
        busy={rejectMutation.isPending}
        error={actionError}
        onConfirm={(reason) => rejectMutation.mutate({ id: rejectTarget._id, reason })}
        onClose={closeDialogs}
      />
    </div>
  );
}
