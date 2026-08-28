import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership } from "../../stores/society.store";
import {
  STATUS_UI,
  extractApiError,
  formatAmount,
  formatDate,
  getCycleUnitDetail,
  getUnitHistory,
  recordPayment,
  removePayment,
} from "../../lib/maintenance";

const ADMIN_ROLES = ["super_admin", "society_admin"];

function DetailRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-outline-variant py-2.5 last:border-b-0">
      <span className="shrink-0 text-label-md text-on-surface-variant">{label}</span>
      <span className="truncate text-right text-body-sm font-semibold text-on-surface">
        {value || "—"}
      </span>
    </div>
  );
}

export default function SocietyDueDetailPage() {
  const { unitId } = useParams();
  const [searchParams] = useSearchParams();
  const cycleId = searchParams.get("cycle");
  const queryClient = useQueryClient();
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [showHistory, setShowHistory] = useState(false);
  const isAdmin = ADMIN_ROLES.includes(activeMembership?.role);

  const detailQuery = useQuery({
    queryKey: ["maintenance", "unit-detail", cycleId, unitId],
    queryFn: async () => (await getCycleUnitDetail(cycleId, unitId)).data.data,
    enabled: Boolean(cycleId && unitId),
  });

  const historyQuery = useQuery({
    queryKey: ["maintenance", "unit-history", unitId],
    queryFn: async () => (await getUnitHistory(unitId)).data.data,
    enabled: Boolean(unitId),
  });

  const payMutation = useMutation({
    mutationFn: () => recordPayment(cycleId, unitId, {}).then((r) => r.data.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  const unpayMutation = useMutation({
    mutationFn: () => removePayment(cycleId, unitId).then((r) => r.data.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="page-title mt-3">Admins only</h1>
          <Link
            to="/dashboard"
            className="mt-4 inline-block text-label-md text-primary no-underline hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!cycleId) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <h1 className="page-title">Missing period</h1>
          <p className="page-subtitle">Open this page from the Manage Maintenance grid.</p>
          <Link
            to="/dues"
            className="mt-4 inline-block text-label-md text-primary no-underline hover:underline"
          >
            Back to Manage Maintenance
          </Link>
        </div>
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-container-high" />
        <div className="h-48 animate-pulse rounded-2xl bg-surface-container-high" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(detailQuery.error, "Failed to load house dues.")}
        </div>
        <Link to="/dues" className="inline-block text-label-md text-primary hover:underline">
          Back to Manage Maintenance
        </Link>
      </div>
    );
  }

  const record = detailQuery.data;
  const status = STATUS_UI[record.status];
  const isSettled = ["paid", "late_paid"].includes(record.status);
  const history = historyQuery.data || [];
  const busy = payMutation.isPending || unpayMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <section>
        <Link
          to={`/dues?period=${record.cycle.id}`}
          className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Manage Maintenance
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="page-title">House {record.label}</h1>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${status.pill}`}
          >
            <span className="material-symbols-outlined text-[13px]">{status.icon}</span>
            {status.label}
          </span>
        </div>
        <p className="page-subtitle">
          {record.isRenterOccupied ? "Renter: " : "Owner: "}
          {record.ownerName
            ? `${record.ownerName}${record.ownerPhone ? ` · ${record.ownerPhone}` : ""}`
            : "Not assigned"}
        </p>
      </section>

      {(payMutation.isError || unpayMutation.isError) && (
        <div className="rounded-xl border border-error-container bg-error-container/50 px-4 py-3 text-body-sm font-semibold text-on-error-container">
          {extractApiError(
            payMutation.error || unpayMutation.error,
            "Failed to update payment."
          )}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <div
          className={`p-4 sm:p-6 ${
            isSettled
              ? "bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900"
              : record.status === "overdue"
                ? "bg-gradient-to-br from-red-600 via-red-700 to-red-900"
                : "bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed"
          }`}
        >
          <p className="text-label-md uppercase tracking-[0.14em] text-white/70">
            {new Date(record.cycle.year, record.cycle.month - 1).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}{" "}
            Maintenance
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-headline-md font-bold text-white">
                {isSettled ? formatAmount(record.cycle.amount) + " paid" : formatAmount(record.cycle.amount)}
              </p>
              <p className="mt-1 text-label-md text-white/70">
                Due by {formatDate(record.cycle.dueDate)}
              </p>
            </div>
            {!isSettled ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => payMutation.mutate()}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-label-md text-primary transition-colors hover:bg-primary-fixed disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                {payMutation.isPending ? "Saving..." : "Record Payment"}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => unpayMutation.mutate()}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-label-md text-white transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
                Undo Payment
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-outline-variant border-t border-outline-variant">
          <div className="p-4">
            <p className="text-label-sm uppercase tracking-[0.1em] text-on-surface-variant">Status</p>
            <p className={`mt-1 text-body-md font-semibold ${status.colorClass}`}>{status.label}</p>
          </div>
          <div className="p-4">
            <p className="text-label-sm uppercase tracking-[0.1em] text-on-surface-variant">Monthly</p>
            <p className="mt-1 text-body-md font-semibold text-on-surface">
              {formatAmount(record.cycle.amount)}
            </p>
          </div>
          <div className="p-4">
            <p className="text-label-sm uppercase tracking-[0.1em] text-on-surface-variant">Due Date</p>
            <p className="mt-1 text-body-md font-semibold text-on-surface">
              {formatDate(record.cycle.dueDate)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <h2 className="text-body-lg font-semibold text-on-surface">Payment Details</h2>
        <div className="mt-2">
          <DetailRow label="Status" value={status.label} />
          <DetailRow
            label="Period"
            value={`${new Date(record.cycle.year, record.cycle.month - 1).toLocaleDateString("en-IN", { month: "long" })} ${record.cycle.year}`}
          />
          <DetailRow label="Amount" value={formatAmount(record.cycle.amount)} />
          <DetailRow label="Due Date" value={formatDate(record.cycle.dueDate)} />
          <DetailRow label="Paid On" value={formatDate(record.paidOn)} />
          <DetailRow label="Payment Method" value={record.method} />
          <DetailRow label="Receipt No." value={record.receiptNo} />
          {(record.block || record.floor || record.doorNo) && (
            <DetailRow
              label="Unit Location"
              value={[record.block && `Block ${record.block}`, record.floor && `Floor ${record.floor}`, record.doorNo]
                .filter(Boolean)
                .join(" · ")}
            />
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-body-lg font-semibold text-on-surface">Payment History</h2>
            <p className="text-label-sm text-on-surface-variant">
              All cycles for House {record.label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-label-md no-underline transition-colors ${
              showHistory
                ? "border-primary bg-primary text-on-primary hover:opacity-90"
                : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            History
            <span className="material-symbols-outlined text-[18px]">
              {showHistory ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>

        {showHistory && (
          <div className="mt-3 space-y-3">
            {history.length === 0 && (
              <p className="text-body-sm text-on-surface-variant">No maintenance cycles yet.</p>
            )}
            {history.map((row) => {
              const rowStatus = STATUS_UI[row.status];
              return (
                <div
                  key={row.cycleId}
                  className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${rowStatus.iconBox}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-semibold text-on-surface">
                      {new Date(row.year, row.month - 1).toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      · {formatAmount(row.amount)}
                    </p>
                    <p className="truncate text-label-sm text-on-surface-variant">
                      {row.paidOn ? `Paid on ${formatDate(row.paidOn)}${row.method ? ` · ${row.method}` : ""}` : `Due by ${formatDate(row.dueDate)}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm font-semibold ${rowStatus.pill}`}
                  >
                    {rowStatus.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
