import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import useSocietyStore, { selectActiveMembership } from "../../stores/society.store";
import { UNIT_STATUS, getUnitStatuses } from "./MaintenancePage";

const MOCK_DUES = {
  paid: { amount: 0, periodLabel: "Jul 2026", hint: "Paid on 05 Jul 2026" },
  pending: { amount: 2500, periodLabel: "Jul 2026", hint: "Due by 15 Jul 2026 (in 12 days)" },
  overdue: { amount: 5000, periodLabel: "Jun – Jul 2026", hint: "Overdue since 15 Jun 2026" },
};

const MOCK_RECEIPTS = [
  { id: 1, period: "Jun 2026", amount: 2500, paidOn: "05 Jun 2026", receiptNo: "RCPT-2026-0062", method: "UPI" },
  { id: 2, period: "May 2026", amount: 2500, paidOn: "04 May 2026", receiptNo: "RCPT-2026-0047", method: "Bank Transfer" },
  { id: 3, period: "Apr 2026", amount: 2500, paidOn: "07 Apr 2026", receiptNo: "RCPT-2026-0031", method: "UPI" },
];

function formatAmount(value) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function ReceiptRow({ receipt }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:border-outline">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tertiary-fixed text-on-tertiary-fixed">
        <span className="material-symbols-outlined text-[20px]">receipt_long</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md font-semibold text-on-surface">
          {receipt.period} Maintenance
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {receipt.receiptNo} · Paid on {receipt.paidOn} · {receipt.method}
        </p>
      </div>
      <p className="shrink-0 text-body-md font-semibold text-on-surface">
        {formatAmount(receipt.amount)}
      </p>
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        title="Download receipt"
      >
        <span className="material-symbols-outlined text-[18px]">download</span>
      </button>
    </div>
  );
}

export default function MaintenanceDetailPage() {
  const { unitId } = useParams();
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [showHistory, setShowHistory] = useState(false);

  const units = activeMembership?.units || [];
  const unit = units.find((u) => u.id === unitId) || null;

  if (!unit) {
    return (
      <div className="mx-auto max-w-4xl space-y-stack-lg">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-error">lock</span>
          <h1 className="mt-3 text-headline-sm text-on-surface">House not found</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            This house is not assigned to you.
          </p>
          <Link
            to="/maintenance"
            className="mt-4 inline-block text-label-md text-primary no-underline hover:underline"
          >
            Back to Maintenance
          </Link>
        </div>
      </div>
    );
  }

  const statusKey = getUnitStatuses(units)[unit.id] || "pending";
  const status = UNIT_STATUS[statusKey];
  const due = MOCK_DUES[statusKey];
  const isPaid = statusKey === "paid";

  return (
    <div className="mx-auto max-w-4xl space-y-stack-lg">
      <section>
        <Link
          to="/maintenance"
          className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Maintenance
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-headline-md text-on-surface">House {unit.label}</h1>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${status.pill}`}
          >
            <span className="material-symbols-outlined text-[13px]">{status.icon}</span>
            {status.label}
          </span>
        </div>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          {unit.isOwner ? "Owner" : "Renter"}
          {(unit.block || unit.floor) &&
            ` · ${[unit.block, unit.floor].filter(Boolean).join(" · ")}`}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <div className="bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed p-6 sm:p-8">
          <p className="text-label-md uppercase tracking-[0.14em] text-primary-fixed-dim">
            Current Due
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-headline-md font-bold text-white">
                {isPaid ? "All caught up" : formatAmount(due.amount)}
              </p>
              <p className="mt-1 text-label-md text-primary-fixed-dim">
                {due.periodLabel} · {due.hint}
              </p>
            </div>
            {!isPaid && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-label-md text-primary transition-colors hover:bg-primary-fixed"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                Pay Now
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
            <p className="text-label-sm uppercase tracking-[0.1em] text-on-surface-variant">Your Role</p>
            <p className="mt-1 text-body-md font-semibold text-on-surface">
              {unit.isOwner ? "Owner" : "Renter"}
            </p>
          </div>
          <div className="p-4">
            <p className="text-label-sm uppercase tracking-[0.1em] text-on-surface-variant">Monthly</p>
            <p className="mt-1 text-body-md font-semibold text-on-surface">{formatAmount(2500)}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-body-lg font-semibold text-on-surface">Payment History</h2>
            <p className="text-label-sm text-on-surface-variant">
              Past maintenance receipts for House {unit.label}
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
            {MOCK_RECEIPTS.map((receipt) => (
              <ReceiptRow key={receipt.id} receipt={receipt} />
            ))}
            {MOCK_RECEIPTS.length === 0 && (
              <p className="text-body-sm text-on-surface-variant">No receipts yet.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
