import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore from "../../stores/society.store";
import {
  getSociety,
  approveSociety,
  rejectSociety,
  suspendSociety,
  activateSociety,
  archiveSociety,
  unarchiveSociety,
  deleteSocietyPermanently,
  updateSociety,
  SOCIETY_TYPE_LABELS,
  SUBSCRIPTION_PLAN_LABELS,
  SUBSCRIPTION_PLAN_RATES,
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
  const navigate = useNavigate();
  const enterSocietyAsSuperAdmin = useSocietyStore((state) => state.enterSocietyAsSuperAdmin);
  const exitSuperAdminSocietyMode = useSocietyStore((state) => state.exitSuperAdminSocietyMode);
  const activeSocietyId = useSocietyStore((state) => state.activeSocietyId);

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
    queryClient.invalidateQueries({ queryKey: ["superadmin-society-stats"] });
    queryClient.invalidateQueries({ queryKey: ["superadmin-recent-societies"] });
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

  const archiveMutation = useMutation({
    mutationFn: (sid) => archiveSociety(sid),
    onSuccess: (res) => {
      if (activeSocietyId === id) {
        exitSuperAdminSocietyMode();
      }
      invalidate();
    },
    onError: (error) => setActionError(extractApiError(error, "Failed to archive society.")),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (sid) => unarchiveSociety(sid),
    onSuccess: invalidate,
    onError: (error) => setActionError(extractApiError(error, "Failed to restore society.")),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (sid) => deleteSocietyPermanently(sid),
    onSuccess: () => {
      if (activeSocietyId === id) {
        exitSuperAdminSocietyMode();
      }
      invalidate();
      navigate("/admin/societies");
    },
    onError: (error) => setActionError(extractApiError(error, "Failed to delete society permanently.")),
  });

  const planMutation = useMutation({
    mutationFn: ({ sid, subscriptionPlan, subscriptionBilling }) =>
      updateSociety(sid, { subscriptionPlan, subscriptionBilling }),
    onSuccess: invalidate,
    onError: (error) => setActionError(extractApiError(error, "Failed to update subscription plan.")),
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
      <div className="space-y-5 sm:space-y-6">
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
    activateMutation.isPending ||
    archiveMutation.isPending ||
    unarchiveMutation.isPending ||
    permanentDeleteMutation.isPending;

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <div>
        <Link
          to="/admin/societies"
          className="inline-flex items-center gap-1 text-label-md text-primary hover:underline no-underline"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Societies
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title">{society.name}</h1>
            <StatusBadge status={society.status} />
          </div>
          {society.status === "active" && (
            <button
              type="button"
              onClick={() => {
                enterSocietyAsSuperAdmin(society);
                navigate("/dashboard");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-label-md font-bold text-on-primary shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              Enter / Manage Society
            </button>
          )}
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
        <section className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
          society.status === "rejected"
            ? "border-error/30 bg-error-container/30"
            : "border-secondary-fixed bg-secondary-fixed/40"
        }`}>
          <span className={`material-symbols-outlined ${society.status === "rejected" ? "text-error" : "text-primary"}`}>
            {society.status === "rejected" ? "cancel" : "pending_actions"}
          </span>
          <span className="text-body-sm font-semibold text-on-surface">
            {society.status === "pending"
              ? "This society registration is awaiting approval."
              : `This society registration is currently rejected${society.rejectionReason ? `: "${society.rejectionReason}"` : ""}.`}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => approveMutation.mutate(society._id)}
              disabled={busy}
              className="rounded-lg bg-primary px-3.5 py-2 text-label-md text-on-primary font-semibold transition-colors hover:bg-inverse-surface cursor-pointer disabled:opacity-60"
            >
              {society.status === "rejected" ? "Re-Approve & Activate" : "Approve Society"}
            </button>
            {society.status === "pending" && (
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
            )}
          </div>
        </section>
      )}

      {society.status === "active" && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary">verified</span>
            <div>
              <p className="text-body-sm font-semibold text-on-surface">Society is Live & Active</p>
              <p className="text-label-sm text-on-surface-variant">Residents and admins have active platform access.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setDialog("suspend");
              }}
              disabled={busy}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-md font-semibold text-on-surface transition-colors hover:bg-surface-container-low cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px] mr-1 align-middle text-error">lock</span>
              Freeze / Suspend
            </button>
          </div>
        </section>
      )}

      {society.status === "suspended" && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error-container/20 px-4 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error">block</span>
            <div>
              <p className="text-body-sm font-semibold text-on-surface">Society is Suspended / Frozen</p>
              <p className="text-label-sm text-on-surface-variant">All resident action cards are locked with a warning to contact the admin.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => activateMutation.mutate(society._id)}
            disabled={busy}
            className="rounded-lg bg-primary px-3.5 py-1.5 text-label-md font-semibold text-on-primary transition-colors hover:bg-inverse-surface cursor-pointer disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px] mr-1 align-middle">lock_open</span>
            Reactivate / Unfreeze
          </button>
        </section>
      )}

      {society.status === "archived" && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-high/40 px-4 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-outline">inventory_2</span>
            <div>
              <p className="text-body-sm font-semibold text-on-surface">Society is Archived / Soft Deleted</p>
              <p className="text-label-sm text-on-surface-variant">Society is decommissioned. Historical audit ledgers and receipts are preserved in DB.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => unarchiveMutation.mutate(society._id)}
            disabled={busy}
            className="rounded-lg bg-primary px-3.5 py-1.5 text-label-md font-semibold text-on-primary transition-colors hover:bg-inverse-surface cursor-pointer disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px] mr-1 align-middle">unarchive</span>
            Restore Society
          </button>
        </section>
      )}

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
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

      {/* Subscription Plan & Billing Management */}
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant pb-3">
          <div>
            <h2 className="text-body-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">loyalty</span>
              SaaS Subscription Plan & Billing Tier
            </h2>
            <p className="text-label-sm text-on-surface-variant mt-0.5">
              Current plan assignment, billing mode, and fee calculations for this society.
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-sm font-bold ${
            society.subscriptionPlan === "enterprise"
              ? "bg-violet-100 text-violet-800"
              : society.subscriptionPlan === "professional"
              ? "bg-primary/10 text-primary"
              : "bg-emerald-100 text-emerald-800"
          }`}>
            <span className="h-2 w-2 rounded-full bg-current" />
            {SUBSCRIPTION_PLAN_LABELS[society.subscriptionPlan] || "Basic"} Tier
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-low/50 p-3.5">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Assigned Plan</span>
            <div className="mt-1.5 flex items-center justify-between">
              <select
                value={society.subscriptionPlan || "starter"}
                onChange={(e) =>
                  planMutation.mutate({
                    sid: society._id,
                    subscriptionPlan: e.target.value,
                    subscriptionBilling: society.subscriptionBilling || "monthly",
                  })
                }
                disabled={planMutation.isPending}
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-body-sm font-bold text-on-surface focus:border-primary focus:outline-none cursor-pointer disabled:opacity-60"
              >
                <option value="starter">Starter / Basic (₹6/unit)</option>
                <option value="professional">Professional / Standard (₹10/unit)</option>
                <option value="enterprise">Enterprise / Premium (₹15/unit)</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low/50 p-3.5">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Billing Frequency</span>
            <div className="mt-1.5">
              <select
                value={society.subscriptionBilling || "monthly"}
                onChange={(e) =>
                  planMutation.mutate({
                    sid: society._id,
                    subscriptionPlan: society.subscriptionPlan || "starter",
                    subscriptionBilling: e.target.value,
                  })
                }
                disabled={planMutation.isPending}
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-body-sm font-bold text-on-surface focus:border-primary focus:outline-none cursor-pointer disabled:opacity-60"
              >
                <option value="monthly">Monthly Recurring</option>
                <option value="yearly">Yearly Prepaid (10 mo)</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low/50 p-3.5">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Estimated Monthly SaaS Dues</span>
            <p className="mt-1.5 text-headline-sm font-black text-primary">
              ₹{((society.totalUnits || 0) * (SUBSCRIPTION_PLAN_RATES[society.subscriptionPlan || "starter"] || 6)).toLocaleString("en-IN")}
              <span className="text-label-sm font-normal text-on-surface-variant">/mo</span>
            </p>
          </div>
        </div>
      </section>

      {/* Danger Zone / Lifecycle Controls */}
      <section className="rounded-xl border border-error/30 bg-surface-container-lowest p-6 shadow-sm space-y-4">
        <div className="border-b border-outline-variant pb-3">
          <h2 className="text-title-sm font-bold text-error flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px]">warning</span>
            Danger Zone & Society Lifecycle
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Perform administrative lifecycle operations for this society.
          </p>
        </div>

        <div className="divide-y divide-outline-variant">
          {/* Soft Delete / Archive Option */}
          {society.status !== "archived" ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0">
              <div>
                <p className="text-body-sm font-semibold text-on-surface">Archive / Soft Delete Society</p>
                <p className="text-label-sm text-on-surface-variant">
                  Decommissions this society and blocks all logins while safely preserving historical accounting and receipts for compliance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionError("");
                  setDialog("archive");
                }}
                disabled={busy}
                className="shrink-0 rounded-lg border border-outline-variant px-3.5 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Archive Society
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0">
              <div>
                <p className="text-body-sm font-semibold text-on-surface">Restore Society</p>
                <p className="text-label-sm text-on-surface-variant">
                  Restores this archived society back to active platform status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => unarchiveMutation.mutate(society._id)}
                disabled={busy}
                className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-label-md font-semibold text-on-primary hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Restore Society
              </button>
            </div>
          )}

          {/* Permanent Hard Delete Option */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 last:pb-0">
            <div>
              <p className="text-body-sm font-semibold text-error">Permanently Delete Society</p>
              <p className="text-label-sm text-on-surface-variant">
                Irreversibly removes this society along with all its units, tickets, documents, and records from MongoDB.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setDialog("permanentDelete");
              }}
              disabled={busy}
              className="shrink-0 rounded-lg bg-error px-3.5 py-2 text-label-md font-semibold text-on-error hover:bg-error/90 transition-colors cursor-pointer"
            >
              Permanent Delete
            </button>
          </div>
        </div>
      </section>

      {/* Confirmation Dialogs */}
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
        title={`Suspend & Freeze ${society.name}?`}
        message="This society will be frozen. Residents and admins can still log in, but all dashboard cards and actions will be locked with a warning notice instructing them to contact the admin to unfreeze."
        confirmLabel="Freeze / Suspend"
        danger
        busy={suspendMutation.isPending}
        error={actionError}
        onConfirm={() => suspendMutation.mutate(society._id)}
        onClose={closeDialog}
      />

      <ConfirmDialog
        open={dialog === "archive"}
        title={`Archive ${society.name}?`}
        message={`Are you sure you want to archive this society?\n\n• All resident and admin logins will be revoked immediately.\n• Historical receipts, maintenance invoices, and audit ledgers will remain safely preserved in the database.\n• You can restore this society at any time.`}
        confirmLabel="Archive Society"
        danger
        busy={archiveMutation.isPending}
        error={actionError}
        onConfirm={() => archiveMutation.mutate(society._id)}
        onClose={closeDialog}
      />

      <ConfirmDialog
        open={dialog === "permanentDelete"}
        title={`Permanently Delete ${society.name}?`}
        message={`⚠️ CRITICAL WARNING: This action cannot be undone!\n\nAll units, memberships, documents, chat messages, tickets, and records belonging to "${society.name}" will be completely destroyed.`}
        confirmLabel="I understand, permanently delete"
        danger
        matchText={society.name}
        matchLabel="To confirm, type the society name below:"
        busy={permanentDeleteMutation.isPending}
        error={actionError}
        onConfirm={() => permanentDeleteMutation.mutate(society._id)}
        onClose={closeDialog}
      />
    </div>
  );
}
