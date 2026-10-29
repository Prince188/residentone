import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import {
  getExpenses,
  formatAmount,
  formatDate,
  getExpenseCategoryMeta,
  exportExpensesExcel,
  downloadClientExpenseCsv,
} from "../../lib/expenses";
import { getEvent } from "../../lib/events";

export default function EventExpenseDetailsPage() {
  const { eventId } = useParams();
  const isGeneral = eventId === "general";
  const activeSociety = useSocietyStore(selectActiveSociety);
  const societyId = activeSociety?.id || activeSociety?._id;
  const societyName = activeSociety?.name || "Society";

  const [search, setSearch] = useState("");
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: eventData } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      if (isGeneral) return null;
      const res = await getEvent(eventId);
      return res?.data ?? res;
    },
    enabled: Boolean(eventId && !isGeneral),
  });

  const eventName = isGeneral
    ? "General Operations & Utilities"
    : eventData?.name || eventData?.title || "Society Event";
  const eventCategory = isGeneral ? "operations" : eventData?.category || "festival";
  const eventStatus = isGeneral ? "active" : eventData?.status || "active";
  const budget = Number(eventData?.budget || eventData?.estimatedCost || 0);

  const { data: expensesData = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses", societyId],
    queryFn: async () => {
      const res = await getExpenses();
      const raw = Array.isArray(res) ? res : res?.data?.expenses ?? res?.data?.data ?? res?.expenses ?? res?.data ?? [];
      return Array.isArray(raw) ? raw : [];
    },
    enabled: Boolean(societyId),
  });
  const expenses = useMemo(() => {
    return Array.isArray(expensesData) ? expensesData : [];
  }, [expensesData]);

  // Filter vouchers belonging strictly to this event/fund
  const eventExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (exp.isCancelled || exp.isActive === false) return false;
      if (isGeneral) {
        return !exp.eventId && !exp.event?._id && !exp.event?.id && !exp.eventTag && !exp.event;
      }
      const expEventId = String(exp.eventId || exp.event?._id || exp.event?.id || "");
      if (expEventId && expEventId === String(eventId)) return true;

      const tag = String(exp.eventTag || exp.event || "").trim().toLowerCase();
      if (tag && eventName && tag === eventName.trim().toLowerCase()) return true;

      return false;
    });
  }, [expenses, eventId, isGeneral, eventName]);

  // Search filter
  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eventExpenses;
    return eventExpenses.filter((item) => {
      return (
        (item.title || item.description || "").toLowerCase().includes(q) ||
        (item.vendorName || item.payee || "").toLowerCase().includes(q) ||
        (item.notes || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q)
      );
    });
  }, [eventExpenses, search]);

  const totalSpent = useMemo(() => {
    return eventExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [eventExpenses]);

  const handleDownloadExcel = async () => {
    try {
      setExporting(true);
      // Try backend endpoint first
      try {
        const res = await exportExpensesExcel({ eventId });
        const blob = new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        const cleanName = eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
        link.href = url;
        link.setAttribute("download", `${cleanName}_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (backendErr) {
        // Fallback to client-side CSV
        downloadClientExpenseCsv({
          eventName,
          expenses: eventExpenses,
          societyName,
        });
      }
      setToastMsg(`Downloaded Excel for ${eventName}`);
      setTimeout(() => setToastMsg(""), 3500);
    } catch (err) {
      setErrorMsg("Failed to download expenses spreadsheet");
      setTimeout(() => setErrorMsg(""), 3500);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 space-y-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 p-4 text-emerald-800 text-sm font-medium shadow-sm">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          {toastMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200/80 p-4 text-red-800 text-sm font-medium shadow-sm">
          <span className="material-symbols-outlined text-red-600">error</span>
          {errorMsg}
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
        <Link to="/expenses" className="hover:text-primary transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">payments</span>
          Expenses
        </Link>
        <span>/</span>
        <span className="text-on-surface font-semibold truncate max-w-sm">{eventName}</span>
      </div>

      {/* Event Header Banner */}
      <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
              isGeneral
                ? "bg-emerald-50 text-emerald-700"
                : "bg-purple-50 text-purple-700"
            }`}
          >
            <span className="material-symbols-outlined text-[32px]">
              {isGeneral ? "domain" : "celebration"}
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">{eventName}</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-700">
                {eventCategory}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-emerald-700">
                {eventStatus}
              </span>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">
              {isGeneral
                ? "Electricity, water, guard wages, repair AMC, and operational fund vouchers"
                : "All specific expenses incurred for this event with itemized bills and receipts"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadExcel}
            disabled={exporting || eventExpenses.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/95 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              {exporting ? "hourglass_top" : "download"}
            </span>
            {exporting ? "Exporting..." : "Download Excel"}
          </button>

          <Link
            to="/expenses"
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Event Cards
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Total Event Spent
          </span>
          <p className="mt-2 text-2xl font-bold text-rose-700">{formatAmount(totalSpent)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{eventExpenses.length} vouchers recorded</p>
        </div>

        {budget > 0 ? (
          <div className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Allocated Budget
            </span>
            <p className="mt-2 text-2xl font-bold text-on-surface">{formatAmount(budget)}</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              Balance:{" "}
              <span
                className={`font-semibold ${
                  budget - totalSpent >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatAmount(budget - totalSpent)}
              </span>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Budget Status
            </span>
            <p className="mt-2 text-base font-semibold text-on-surface">General Allocation</p>
            <p className="mt-1 text-xs text-on-surface-variant">Paid from society treasury</p>
          </div>
        )}

        <div className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Average per Voucher
          </span>
          <p className="mt-2 text-2xl font-bold text-on-surface">
            {formatAmount(eventExpenses.length > 0 ? Math.round(totalSpent / eventExpenses.length) : 0)}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">Expense density</p>
        </div>

        <div className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Export Status
          </span>
          <p className="mt-2 text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            Excel Ready
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Only {eventName} items
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${eventName} vouchers by title, vendor, or notes...`}
            className="w-full rounded-xl border border-outline-variant bg-surface py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-on-surface-variant">
            Showing {filteredExpenses.length} of {eventExpenses.length} vouchers
          </span>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="border-b border-black/[0.06] bg-[#FAFBF9] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
            <h3 className="text-sm font-bold text-on-surface">
              Expense Vouchers for {eventName}
            </h3>
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={exporting || eventExpenses.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Download Spreadsheet (.xlsx)
          </button>
        </div>

        {loadingExpenses ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[32px] text-primary">
              progress_activity
            </span>
            <p className="mt-2 text-sm">Loading expense vouchers...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[44px] text-outline">receipt</span>
            <h4 className="mt-2 text-base font-semibold text-on-surface">No vouchers found</h4>
            <p className="mt-1 text-sm">
              {search
                ? "No vouchers match your search keywords."
                : `No expenses have been recorded for ${eventName} yet.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/[0.06] bg-[#FAFBF9] text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3.5">Expense Details</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Vendor / Payee</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Payment Mode</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {filteredExpenses.map((exp) => {
                  const meta = getExpenseCategoryMeta(exp.category);
                  const billUrl = exp.receiptUrl || exp.billUrl;
                  return (
                    <tr
                      key={exp._id || exp.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-on-surface">
                          {exp.title || exp.description}
                        </div>
                        {exp.notes ? (
                          <div className="mt-0.5 text-xs text-on-surface-variant line-clamp-1">
                            {exp.notes}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.bg} ${meta.text}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {meta.icon}
                          </span>
                          {meta.label}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-on-surface whitespace-nowrap">
                        {exp.vendorName || exp.payee || "—"}
                      </td>

                      <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                        {formatDate(exp.date || exp.expenseDate || exp.createdAt)}
                      </td>

                      <td className="px-4 py-4 text-on-surface-variant capitalize whitespace-nowrap">
                        {(exp.paymentMethod || exp.paymentMode || "bank_transfer").replace(/_/g, " ")}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-rose-700 whitespace-nowrap">
                        {formatAmount(exp.amount)}
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {billUrl ? (
                          <button
                            onClick={() => setReceiptPreviewUrl(billUrl)}
                            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface px-2.5 py-1 text-xs text-primary hover:bg-surface-container font-medium"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              attach_file
                            </span>
                            View Bill
                          </button>
                        ) : (
                          <span className="text-xs text-outline">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill Preview Modal */}
      {receiptPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-w-2xl w-full rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h3 className="text-sm font-bold text-on-surface">Expense Voucher Bill Preview</h3>
              <button
                onClick={() => setReceiptPreviewUrl(null)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={receiptPreviewUrl}
                alt="Expense Bill"
                className="max-h-[65vh] w-auto rounded-lg object-contain shadow-sm"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <a
                href={receiptPreviewUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Open Full Size
              </a>
              <button
                onClick={() => setReceiptPreviewUrl(null)}
                className="rounded-xl border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
