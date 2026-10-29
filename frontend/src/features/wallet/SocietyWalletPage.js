import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import { getWalletSummary, exportWalletExcel, formatAmount, formatDate } from "../../lib/expenses";

export default function SocietyWalletPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const societyId = activeSociety?.id || activeSociety?._id;

  const [txFilter, setTxFilter] = useState("all"); // 'all', 'income', 'expense'
  const [exporting, setExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: walletSummary, isLoading } = useQuery({
    queryKey: ["wallet-summary", societyId],
    queryFn: () => getWalletSummary(),
    enabled: Boolean(societyId),
  });

  const wallet = walletSummary?.wallet || {};
  const transactions = walletSummary?.recentTransactions || [];
  const eventSummaries = walletSummary?.eventSummaries || [];

  const netBalance = Number(wallet.netBalance || 0);
  const totalIncome = Number(wallet.totalIncome || 0);
  const totalExpenses = Number(wallet.totalExpenses || 0);
  const breakdown = wallet.breakdown || {};

  const filteredTransactions = useMemo(() => {
    if (txFilter === "income") return transactions.filter((t) => t.type === "income");
    if (txFilter === "expense") return transactions.filter((t) => t.type === "expense");
    return transactions;
  }, [transactions, txFilter]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await exportWalletExcel();
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Society_Financial_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatusMsg("Financial statement Excel downloaded successfully");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Failed to download financial statement");
      setTimeout(() => setErrorMsg(""), 3500);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-6">
      {/* Toast Alert */}
      {statusMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-medium">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm font-medium">
          <span className="material-symbols-outlined text-red-600">error</span>
          {errorMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">account_balance_wallet</span>
            <h1 className="text-2xl font-bold text-on-surface">Society Treasury & Wallet</h1>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Consolidated cashflow, operating balance, dues revenue, and expense outflows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            {exporting ? "Exporting..." : "Download Financial Report"}
          </button>

          <Link
            to="/expenses"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            Manage Expenses
          </Link>
        </div>
      </div>

      {/* Main Treasury Balance Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 p-6 md:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">account_balance</span>
              {activeSociety?.name || "Society"} Treasury
            </div>
            <p className="mt-3 text-sm text-emerald-200 font-medium">Net Operating Treasury Balance</p>
            <h2 className="mt-1 text-4xl md:text-5xl font-extrabold tracking-tight">
              {formatAmount(netBalance)}
            </h2>
            <p className="mt-2 text-xs text-emerald-300">
              Computed in real-time across maintenance, collections, donations & verified vouchers
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8">
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-200">Total Inflow</span>
              <p className="mt-1 text-2xl font-bold text-emerald-300">+{formatAmount(totalIncome)}</p>
              <p className="mt-0.5 text-xs text-emerald-400">All revenues received</p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-200">Total Outflow</span>
              <p className="mt-1 text-2xl font-bold text-rose-300">-{formatAmount(totalExpenses)}</p>
              <p className="mt-0.5 text-xs text-emerald-400">Disbursed expenses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Stream Breakdown Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Maintenance Revenue</span>
            <span className="material-symbols-outlined text-emerald-700 bg-emerald-50 p-2 rounded-xl text-[20px]">build</span>
          </div>
          <p className="mt-2 text-xl font-bold text-on-surface">{formatAmount(breakdown.maintenance || 0)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Monthly dues collected</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Special Collections</span>
            <span className="material-symbols-outlined text-sky-700 bg-sky-50 p-2 rounded-xl text-[20px]">handshake</span>
          </div>
          <p className="mt-2 text-xl font-bold text-on-surface">{formatAmount(breakdown.collections || 0)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Festivals & capital drives</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Donations</span>
            <span className="material-symbols-outlined text-purple-700 bg-purple-50 p-2 rounded-xl text-[20px]">volunteer_activism</span>
          </div>
          <p className="mt-2 text-xl font-bold text-on-surface">{formatAmount(breakdown.donations || 0)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Mandir & welfare contributions</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Transfer Fees</span>
            <span className="material-symbols-outlined text-amber-700 bg-amber-50 p-2 rounded-xl text-[20px]">real_estate_agent</span>
          </div>
          <p className="mt-2 text-xl font-bold text-on-surface">{formatAmount(breakdown.transferFees || 0)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Resale NOC charges</p>
        </div>
      </div>

      {/* Event Summaries Section (if any events exist) */}
      {eventSummaries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-on-surface">Event Financial Breakdown</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventSummaries.map((evt) => (
              <div key={evt.id || evt._id} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-on-surface">{evt.name || evt.title}</span>
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 capitalize">
                    {evt.category || "Event"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-on-surface-variant">
                  <span>Expenses Spent:</span>
                  <span className="font-bold text-rose-700">{formatAmount(evt.totalSpent || evt.expenses || 0)}</span>
                </div>
                {evt.budget > 0 && (
                  <div className="mt-1 flex items-center justify-between text-xs text-on-surface-variant">
                    <span>Budget Allocated:</span>
                    <span className="font-semibold">{formatAmount(evt.budget)}</span>
                  </div>
                )}
                <Link
                  to={`/expenses/events/${evt.id || evt._id}`}
                  className="mt-3 block text-center rounded-xl bg-surface-container py-1.5 text-xs font-semibold text-primary hover:bg-surface-container-high transition-colors"
                >
                  View Event Ledger →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unified Transaction Stream */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant bg-surface-container-low px-5 py-3.5 gap-3">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Live Financial Cashflow Ledger</h3>
            <p className="text-xs text-on-surface-variant">Chronological feed of inflows and outflows</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-surface p-1 border border-outline-variant text-xs">
            <button
              onClick={() => setTxFilter("all")}
              className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                txFilter === "all" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTxFilter("income")}
              className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                txFilter === "income" ? "bg-emerald-700 text-white" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Inflow (+)
            </button>
            <button
              onClick={() => setTxFilter("expense")}
              className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                txFilter === "expense" ? "bg-rose-700 text-white" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Outflow (-)
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-on-surface-variant">Loading financial ledger...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[44px] text-outline">history</span>
            <p className="mt-2 text-sm font-semibold">No transactions recorded under this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold uppercase text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3.5">Transaction</th>
                  <th className="px-4 py-3.5">Source / Category</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Payment Method</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredTransactions.map((tx, idx) => {
                  const isIncome = tx.type === "income";
                  return (
                    <tr key={tx._id || tx.id || idx} className="hover:bg-surface-container-low/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`material-symbols-outlined p-1.5 rounded-xl text-[18px] ${
                            isIncome ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {isIncome ? "arrow_downward" : "arrow_upward"}
                          </span>
                          <div>
                            <div className="font-semibold text-on-surface">{tx.title || tx.description}</div>
                            {tx.reference && <div className="text-xs text-on-surface-variant">Ref: {tx.reference}</div>}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-on-surface-variant capitalize whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isIncome ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                        }`}>
                          {(tx.category || tx.source || "general").replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                        {formatDate(tx.date || tx.createdAt)}
                      </td>

                      <td className="px-4 py-4 capitalize text-on-surface-variant whitespace-nowrap">
                        {(tx.paymentMethod || tx.method || "online").replace(/_/g, " ")}
                      </td>

                      <td className={`px-4 py-4 text-right font-bold whitespace-nowrap ${
                        isIncome ? "text-emerald-700" : "text-rose-700"
                      }`}>
                        {isIncome ? `+${formatAmount(tx.amount)}` : `-${formatAmount(tx.amount)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
