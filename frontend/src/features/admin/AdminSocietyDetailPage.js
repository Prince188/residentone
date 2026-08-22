import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSociety,
  approveSociety,
  rejectSociety,
  suspendSociety,
  activateSociety,
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

function DetailRow({ label, children }) {
  return (
    <div className="border-b border-outline-variant/60 py-3 last:border-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
        {label}
      </p>
      <div className="mt-1 text-body-md text-on-surface">{children}</div>
    </div>
  );
}

export default function AdminSocietyDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(null);
  const [actionError, setActionError] = useState("");
  const [approvedAccount, setApprovedAccount] = useState(null);

  const societyQuery = useQuery({
    queryKey: ["society", id],
    queryFn: async () => (await getSociety(id)).data.data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["society", id] });
    queryClient.invalidateQueries({ queryKey: ["societies"] });
    queryClient.invalidateQueries({ queryKey: ["society-stats"] });
    closeDialog();
  };

  const approveMutation = useMutation({
    mutationFn: (sid) => approveSociety(sid),
    onSuccess: (response) => {
      invalidate();
      const account = response?.data?.adminAccount;
      if (account) setApprovedAccount(account);
    },
    onError: (error) => setActionError(extractApiError(error, "Failed to approve society.")),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ sid, reason }) => rejectSociety(sid, reason),
    onSuccess: invalidate,
    onError: (error) => setActionError(extractApiError(error, "Failed to reject society.")),
  });

  const suspendMutation = useMutation({
    mutationFn: (sid) => suspendSociety(sid),
    onSuccess: invalidate,
    onError: (error) => setActionError(extractApiError(error, "Failed to suspend society.")),
  });

  const activateMutation = useMutation({
    mutationFn: (sid) => activateSociety(sid),
    onSuccess: invalidate,
    onError: (error) => setActionError(extractApiError(error, "Failed to activate society.")),
  });

  const closeDialog = () => {
    setDialog(null);
    setActionError("");
  };

  const society = societyQuery.data;

  if (societyQuery.isLoading) {
    return (
      <div className="p-10 text-center text-body-sm text-on-surface-variant">
        Loading society...
      </div>
    );
  }

  if (societyQuery.isError || !society) {
    return (
      <div className="space-y-stack-lg">
        <div className="p-10 text-center text-body-sm text-error">
          Failed to load society details.
        </div>
        <div className="text-center">
          <Link
            to="/admin/societies"
            className="text-label-md text-primary hover:underline no-underline"
          >
            Back to Societies
          </Link>
        </div>
      </div>
    );
  }

  const busy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    suspendMutation.isPending ||
    activateMutation.isPending;

  return (
    <div className="mx-auto max-w-4xl space-y-stack-lg">
      <div>
        <Link
          to="/admin/societies"
          className="inline-flex items-center gap-1 text-label-md text-primary hover:underline no-underline"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Societies
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-headline-md text-on-surface">{society.name}</h1>
          <StatusBadge status={society.status} />
        </div>
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

      {(society.status === "pending" || society.status === "rejected") && (
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-secondary-fixed bg-secondary-fixed/40 px-4 py-3">
          <span className="material-symbols-outlined text-primary">pending_actions</span>
          <span className="text-body-sm font-semibold text-on-surface">
            This society is not active yet.
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => approveMutation.mutate(society._id)}
              disabled={busy}
              className="rounded-lg bg-primary px-3 py-2 text-label-md text-on-primary transition-colors hover:bg-inverse-surface cursor-pointer disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setDialog("reject");
              }}
              disabled={busy}
              className="rounded-lg border border-error px-3 py-2 text-label-md text-error transition-colors hover:bg-error-container cursor-pointer disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </section>
      )}

      {society.status === "active" && (
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3">
          <span className="material-symbols-outlined text-error">block</span>
          <span className="text-body-sm font-semibold text-on-surface">
            Suspend this society to temporarily block platform access.
          </span>
          <button
            type="button"
            onClick={() => {
              setActionError("");
              setDialog("suspend");
            }}
            disabled={busy}
            className="ml-auto rounded-lg border border-error px-3 py-2 text-label-md text-error transition-colors hover:bg-error-container cursor-pointer disabled:opacity-60"
          >
            Suspend
          </button>
        </section>
      )}

      {society.status === "suspended" && (
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3">
          <span className="material-symbols-outlined text-primary">check_circle</span>
          <span className="text-body-sm font-semibold text-on-surface">
            This society is suspended. Reactivate to restore access.
          </span>
          <button
            type="button"
            onClick={() => activateMutation.mutate(society._id)}
            disabled={busy}
            className="ml-auto rounded-lg bg-primary px-3 py-2 text-label-md text-on-primary transition-colors hover:bg-inverse-surface cursor-pointer disabled:opacity-60"
          >
            Activate
          </button>
        </section>
      )}

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <h2 className="mb-2 text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
          Details
        </h2>
        <DetailRow label="Type">
          {SOCIETY_TYPE_LABELS[society.societyType] || "-"}
        </DetailRow>
        <DetailRow label="Address">
          {[society.address, society.city, society.state, society.pincode]
            .filter(Boolean)
            .join(", ")}
        </DetailRow>
        <DetailRow label="Total Units">{society.totalUnits ?? "-"}</DetailRow>
        <DetailRow label="Contact Person">{society.contactPersonName || "-"}</DetailRow>
        <DetailRow label="Contact Email">
          {society.contactEmail ? (
            <a href={`mailto:${society.contactEmail}`} className="text-primary hover:underline">
              {society.contactEmail}
            </a>
          ) : (
            "-"
          )}
        </DetailRow>
        <DetailRow label="Contact Phone">{society.contactPhone || "-"}</DetailRow>
        {society.rejectionReason && (
          <DetailRow label="Rejection Reason">{society.rejectionReason}</DetailRow>
        )}
        <DetailRow label="Created">{formatDate(society.createdAt)}</DetailRow>
        <DetailRow label="Last Updated">{formatDate(society.updatedAt)}</DetailRow>
      </section>

      <ConfirmDialog
        open={dialog === "reject"}
        title={`Reject ${society.name}?`}
        message="Why are you rejecting this registration? The reason will be recorded for auditing."
        confirmLabel="Reject Society"
        danger
        requireReason
        reasonLabel="Rejection reason"
        reasonPlaceholder="e.g. Incomplete society details provided"
        busy={rejectMutation.isPending}
        error={actionError}
        onConfirm={(reason) => rejectMutation.mutate({ sid: society._id, reason })}
        onClose={closeDialog}
      />

      <ConfirmDialog
        open={dialog === "suspend"}
        title={`Suspend ${society.name}?`}
        message="Residents and admins of this society will lose access until it is reactivated."
        confirmLabel="Suspend Society"
        danger
        busy={suspendMutation.isPending}
        error={actionError}
        onConfirm={() => suspendMutation.mutate(society._id)}
        onClose={closeDialog}
      />
    </div>
  );
}
