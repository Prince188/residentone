import { useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  STATUS_UI,
  extractApiError,
  formatAmount,
  formatDate,
  getCycleUnitDetail,
  getUnitHistory,
  getReceipt,
} from "../../lib/maintenance";

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

export default function MaintenanceDetailPage() {
  const { unitId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cycleId = searchParams.get("cycle");
  const [showHistory, setShowHistory] = useState(false);

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

  if (!cycleId) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <h1 className="page-title">Missing period</h1>
          <p className="page-subtitle">Open this page from the Maintenance grid.</p>
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
          {extractApiError(detailQuery.error, "Failed to load your dues.")}
        </div>
        <Link to="/maintenance" className="inline-block text-label-md text-primary hover:underline">
          Back to Maintenance
        </Link>
      </div>
    );
  }

  const record = detailQuery.data;
  const status = STATUS_UI[record.status];
  const isSettled = ["paid", "late_paid"].includes(record.status);
  const history = historyQuery.data || [];

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <section>
        <Link
          to="/maintenance"
          className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Maintenance
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
        <p className="page-subtitle">{record.isOwner ? "Owner" : "Renter"}</p>
      </section>

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
          <p className="text-label-md uppercase tracking-[0.14em] text-white/70">Current Due</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-headline-md font-bold text-white">
                {isSettled ? "All caught up" : formatAmount(record.cycle.amount)}
              </p>
              <p className="mt-1 text-label-md text-white/70">
                Due by {formatDate(record.cycle.dueDate)}
                {!isSettled && record.status === "overdue" && " · Please clear your dues"}
              </p>
            </div>
            {!isSettled ? (
              <button
                type="button"
                onClick={() => navigate(`/maintenance/${unitId}/pay?cycle=${cycleId}`)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-label-md text-primary transition-colors hover:bg-primary-fixed"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                Pay Now
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await getReceipt(cycleId, unitId);
                    const data = res.data.data;
                    // Generate printable receipt HTML
                    const html = `
                      <html><head><title>Receipt ${data.receiptNo}</title>
                      <style>
                        body{font-family:Arial,sans-serif;padding:32px;color:#1a1a1a}
                        .header{border-bottom:2px solid #1a73e8;padding-bottom:16px;margin-bottom:20px}
                        .header h1{margin:0;color:#1a73e8;font-size:22px}
                        .header p{margin:4px 0;color:#555;font-size:13px}
                        .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:14px}
                        .label{color:#666} .value{font-weight:600}
                        .total{font-size:16px;font-weight:800;margin-top:12px;border-top:2px solid #1a73e8;padding-top:12px}
                        .footer{margin-top:24px;font-size:11px;color:#888;text-align:center}
                      </style></head><body>
                      <div class="header">
                        <h1>${data.society.name}</h1>
                        <p>${data.society.address}</p>
                        <h2 style="margin-top:16px;font-size:18px">Maintenance Receipt</h2>
                        <p>Receipt No: <b>${data.receiptNo}</b> | Date: ${new Date(data.payment.paidOn).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                      </div>
                      <div class="row"><span class="label">House</span><span class="value">House ${data.unit.label}${data.unit.block ? " · Block " + data.unit.block : ""}</span></div>
                      <div class="row"><span class="label">Resident</span><span class="value">${data.unit.ownerName} ${data.unit.ownerPhone ? "· " + data.unit.ownerPhone : ""}</span></div>
                      <div class="row"><span class="label">Period</span><span class="value">${new Date(data.cycle.year, data.cycle.month - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span></div>
                      <div class="row"><span class="label">Due Date</span><span class="value">${new Date(data.cycle.dueDate).toLocaleDateString("en-IN")}</span></div>
                      <div class="row"><span class="label">Payment Method</span><span class="value">${data.payment.method}${data.payment.razorpayPaymentId ? " · " + data.payment.razorpayPaymentId : ""}</span></div>
                      <div class="row"><span class="label">Maintenance Amount</span><span class="value">₹${Number(data.payment.amount).toLocaleString("en-IN")}</span></div>
                      <div class="row"><span class="label">Gateway Fee ${data.payment.fee ? "(2% + GST)" : "(Cash - No Fee)"}</span><span class="value">₹${Number(data.payment.fee || 0).toLocaleString("en-IN")}</span></div>
                      <div class="row total"><span>Total Paid</span><span>₹${Number(data.payment.totalAmount).toLocaleString("en-IN")}</span></div>
                      <div class="row"><span class="label">Status</span><span class="value" style="color:#0a7a42">${data.status.toUpperCase()}</span></div>
                      <div class="footer">This is a computer generated receipt from ResidentOne. For queries contact society office.<br/>Thank you for your payment!</div>
                      </body></html>
                    `;
                    const win = window.open("", "_blank");
                    win.document.write(html);
                    win.document.close();
                    win.focus();
                    win.print();
                  } catch (e) {
                    alert(extractApiError(e, "Failed to download receipt. Make sure payment is completed."));
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-label-md font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download Receipt
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
              {record.isOwner ? "Owner" : "Renter"}
            </p>
          </div>
          <div className="p-4">
            <p className="text-label-sm uppercase tracking-[0.1em] text-on-surface-variant">Monthly</p>
            <p className="mt-1 text-body-md font-semibold text-on-surface">
              {formatAmount(record.cycle.amount)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-body-lg font-semibold text-on-surface">Payment Details</h2>
          {isSettled && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await getReceipt(cycleId, unitId);
                  const data = res.data.data;
                  const html = `
                    <html><head><title>Receipt ${data.receiptNo}</title>
                    <style>
                      body{font-family:Arial,sans-serif;padding:32px;color:#1a1a1a}
                      .header{border-bottom:2px solid #1a73e8;padding-bottom:16px;margin-bottom:20px}
                      .header h1{margin:0;color:#1a73e8;font-size:22px}
                      .header p{margin:4px 0;color:#555;font-size:13px}
                      .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:14px}
                      .label{color:#666} .value{font-weight:600}
                      .total{font-size:16px;font-weight:800;margin-top:12px;border-top:2px solid #1a73e8;padding-top:12px}
                      .footer{margin-top:24px;font-size:11px;color:#888;text-align:center}
                    </style></head><body>
                    <div class="header">
                      <h1>${data.society.name}</h1>
                      <p>${data.society.address}</p>
                      <h2 style="margin-top:16px;font-size:18px">Maintenance Receipt</h2>
                      <p>Receipt No: <b>${data.receiptNo}</b> | Date: ${new Date(data.payment.paidOn).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                    <div class="row"><span class="label">House</span><span class="value">House ${data.unit.label}</span></div>
                    <div class="row"><span class="label">Period</span><span class="value">${new Date(data.cycle.year, data.cycle.month - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span></div>
                    <div class="row"><span class="label">Gateway Fee</span><span class="value">₹${Number(data.payment.fee || 0).toLocaleString("en-IN")}</span></div>
                    <div class="row total"><span>Total Paid</span><span>₹${Number(data.payment.totalAmount).toLocaleString("en-IN")}</span></div>
                    </body></html>
                  `;
                  const win = window.open("", "_blank");
                  win.document.write(html);
                  win.document.close();
                  win.print();
                } catch (e) {
                  alert(extractApiError(e, "Failed to download receipt."));
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-label-sm font-semibold text-primary hover:bg-primary/20"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download Receipt
            </button>
          )}
        </div>
        <div className="mt-2">
          <DetailRow
            label="Period"
            value={`${new Date(record.cycle.year, record.cycle.month - 1).toLocaleDateString("en-IN", { month: "long" })} ${record.cycle.year}`}
          />
          <DetailRow label="Amount" value={formatAmount(record.amount || record.cycle.amount)} />
          {record.fee > 0 && <DetailRow label="Gateway Fee (2% + GST)" value={formatAmount(record.fee)} />}
          <DetailRow label="Total Paid" value={record.totalAmount ? formatAmount(record.totalAmount) : formatAmount(record.cycle.amount)} />
          <DetailRow label="Due Date" value={formatDate(record.cycle.dueDate)} />
          <DetailRow label="Paid On" value={formatDate(record.paidOn)} />
          <DetailRow label="Payment Method" value={record.method} />
          <DetailRow label="Receipt No." value={record.receiptNo} />
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
                      {row.paidOn
                        ? `Paid on ${formatDate(row.paidOn)}${row.method ? ` · ${row.method}` : ""}`
                        : `Due by ${formatDate(row.dueDate)}`}
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
