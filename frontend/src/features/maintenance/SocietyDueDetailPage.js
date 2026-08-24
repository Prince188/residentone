import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership } from "../../stores/society.store";
import { getHouseCards, getHouse, extractApiError } from "../../lib/houses";
import { DUES_STATUS } from "./SocietyDuesPage";

const ADMIN_ROLES = ["super_admin", "society_admin"];

// Mock payment record per unit until maintenance API is wired
const MOCK_PAYMENT = {
  paid: {
    period: "Jul 2026",
    amount: 2500,
    dueDate: "15 Jul 2026",
    paidOn: "05 Jul 2026",
    method: "UPI",
    receiptNo: "RCPT-2026-0074",
    note: "Paid on time",
  },
  pending: {
    period: "Jul 2026",
    amount: 2500,
    dueDate: "15 Jul 2026",
    paidOn: null,
    method: null,
    receiptNo: null,
    note: "Due in 12 days",
  },
  overdue: {
    period: "Jun – Jul 2026",
    amount: 5000,
    dueDate: "15 Jun 2026",
    paidOn: null,
    method: null,
    receiptNo: null,
    note: "Overdue since 15 Jun 2026 · Late fee ₹100 applicable",
  },
  late_paid: {
    period: "May 2026",
    amount: 2500,
    dueDate: "15 May 2026",
    paidOn: "28 May 2026",
    method: "Bank Transfer",
    receiptNo: "RCPT-2026-0052",
    note: "Paid 13 days after due date · Late fee ₹100 charged",
  },
};

function formatAmount(value) {
  return `₹${value.toLocaleString("en-IN")}`;
}

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
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [showHistory, setShowHistory] = useState(false);
  const isAdmin = ADMIN_ROLES.includes(activeMembership?.role);

  // House summary (label + owner) comes from the house cards endpoint
  const housesQuery = useQuery({
    queryKey: ["dues-house-cards"],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: isAdmin,
  });
  const house = (housesQuery.data || []).find((h) => h.id === unitId) || null;

  // Full unit details (block/floor/door no)
  const houseDetailQuery = useQuery({
    queryKey: ["house-detail", unitId],
    queryFn: async () => (await getHouse(unitId)).data.data,
    enabled: Boolean(isAdmin && unitId),
  });
  const detail = houseDetailQuery.data || null;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="mt-3 text-headline-sm text-on-surface">Admins only</h1>
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

  if (housesQuery.isLoading || houseDetailQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-stack-lg">
        <div className="h-8 w-40 animate-pulse rounded bg-surface-container-high" />
        <div className="h-48 animate-pulse rounded-2xl bg-surface-container-high" />
      </div>
    );
  }

  if (!house) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">search_off</span>
          <h1 className="mt-3 text-headline-sm text-on-surface">House not found</h1>
          <Link
            to="/dues"
            className="mt-4 inline-block text-label-md text-primary no-underline hover:underline"
          >
            Back to Society Dues
          </Link>
        </div>
      </div>
    );
  }

  if (housesQuery.isError || houseDetailQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(housesQuery.error || houseDetailQuery.error, "Failed to load house.")}
        </div>
      </div>
    );
  }

  // Mock status until maintenance API is wired — derive consistently with list page
  const order = ["paid", "pending", "overdue", "late_paid"];
  const allHouses = housesQuery.data || [];
  const statusKey = order[allHouses.findIndex((h) => h.id === unitId) % order.length] || "pending";
  const status = DUES_STATUS[statusKey];
  const payment = MOCK_PAYMENT[statusKey];
  const isSettled = statusKey === "paid" || statusKey === "late_paid";

  return (
    <div className="mx-auto max-w-3xl space-y-stack-lg">
      <section>
        <Link
          to="/dues"
          className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Society Dues
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-headline-md text-on-surface">House {house.label}</h1>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${status.pill}`}
          >
            <span className="material-symbols-outlined text-[13px]">{status.icon}</span>
            {status.label}
          </span>
        </div>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Owner: {house.owner ? `${house.owner.name}${house.owner.phone ? ` · ${house.owner.phone}` : ""}` : "Not assigned"}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
        <div className={`p-6 sm:p-8 ${isSettled ? "bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900" : "bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed"}`}>
          <p className="text-label-md uppercase tracking-[0.14em] text-white/70">
            {payment.period} Maintenance
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-headline-md font-bold text-white">{formatAmount(payment.amount)}</p>
              <p className="mt-1 text-label-md text-white/70">{payment.note}</p>
            </div>
            {!isSettled && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-label-md text-primary transition-colors hover:bg-primary-fixed"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                Record Payment
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <h2 className="text-body-lg font-semibold text-on-surface">Payment Details</h2>
        <div className="mt-2">
          <DetailRow label="Status" value={status.label} />
          <DetailRow label="Period" value={payment.period} />
          <DetailRow label="Amount" value={formatAmount(payment.amount)} />
          <DetailRow label="Monthly Charge" value={formatAmount(2500)} />
          <DetailRow label="Due Date" value={payment.dueDate} />
          <DetailRow label="Paid On" value={payment.paidOn} />
          <DetailRow label="Payment Method" value={payment.method} />
          <DetailRow label="Receipt No." value={payment.receiptNo} />
          {detail && (detail.block || detail.floor || detail.doorNo) && (
            <DetailRow
              label="Unit Location"
              value={[detail.block && `Block ${detail.block}`, detail.floor && `Floor ${detail.floor}`, detail.doorNo]
                .filter(Boolean)
                .join(" · ")}
            />
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-body-lg font-semibold text-on-surface">Payment History</h2>
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
            {payment.paidOn ? (
              <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tertiary-fixed text-on-tertiary-fixed">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md font-semibold text-on-surface">
                    {payment.period} Maintenance
                  </p>
                  <p className="truncate text-label-sm text-on-surface-variant">
                    {payment.receiptNo} · Paid on {payment.paidOn} · {payment.method}
                  </p>
                </div>
                <p className="shrink-0 text-body-md font-semibold text-on-surface">
                  {formatAmount(2500)}
                </p>
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant">
                No recorded payments for this house yet.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
