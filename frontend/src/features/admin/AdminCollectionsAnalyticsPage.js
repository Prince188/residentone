import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPlatformCollectionsAnalytics } from "../../lib/societies";

function formatCurrency(amount = 0) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCategoryBadge(category = "") {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "festival":
      return "bg-pink-100 text-pink-800 border-pink-200";
    case "event":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "celebration":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "repair":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "welfare":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

export default function AdminCollectionsAnalyticsPage() {
  const [selectedSocietyId, setSelectedSocietyId] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("all"); // 'all' | 'online' | 'offline'
  const [selectedPeriod, setSelectedPeriod] = useState("all"); // 'all' | 'this_month' | 'last_month' | 'this_year'
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Compute month / year query parameters based on selectedPeriod
  const periodParams = useMemo(() => {
    const now = new Date();
    if (selectedPeriod === "this_month") {
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    if (selectedPeriod === "last_month") {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { year: last.getFullYear(), month: last.getMonth() + 1 };
    }
    if (selectedPeriod === "this_year") {
      return { year: now.getFullYear() };
    }
    return {};
  }, [selectedPeriod]);

  const queryParams = {
    ...periodParams,
    societyId: selectedSocietyId || undefined,
    collectionId: selectedCollectionId || undefined,
    method: selectedMethod !== "all" ? selectedMethod : undefined,
    page,
    limit,
  };

  const analyticsQuery = useQuery({
    queryKey: ["superadmin-collections-analytics", queryParams],
    queryFn: async () => (await getPlatformCollectionsAnalytics(queryParams)).data.data,
    refetchInterval: 20000,
  });

  const data = analyticsQuery.data || {
    summary: {},
    byCollection: [],
    bySociety: [],
    monthlyTrend: [],
    transactions: [],
    allCollections: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  };

  const summary = data.summary || {
    totalAmount: 0,
    totalCount: 0,
    onlineAmount: 0,
    onlineCount: 0,
    offlineAmount: 0,
    offlineCount: 0,
    onlinePercent: 0,
    offlinePercent: 0,
    avgAmount: 0,
    activeDrivesCount: 0,
  };

  const byCollection = data.byCollection || [];
  const bySociety = data.bySociety || [];
  const monthlyTrend = data.monthlyTrend || [];
  const transactions = data.transactions || [];
  const allCollections = data.allCollections || [];
  const pagination = data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  // Filter transactions in memory if user typed a search term
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter(
      (tx) =>
        (tx.receiptNo || "").toLowerCase().includes(q) ||
        (tx.collectionTitle || "").toLowerCase().includes(q) ||
        (tx.societyName || "").toLowerCase().includes(q) ||
        (tx.unitLabel || "").toLowerCase().includes(q) ||
        (tx.residentName || "").toLowerCase().includes(q) ||
        (tx.residentPhone || "").includes(q)
    );
  }, [transactions, searchQuery]);

  // Find max monthly trend for chart scaling
  const maxMonthlyAmount = Math.max(1, ...monthlyTrend.map((m) => m.total || 0));

  // Export filtered transactions to CSV
  const handleExportCSV = () => {
    if (!transactions.length) return;
    const headers = [
      "Receipt No",
      "Collection Drive",
      "Category",
      "Society",
      "City",
      "Unit",
      "Block",
      "Resident Name",
      "Phone",
      "Amount (₹)",
      "Fee (₹)",
      "Total (₹)",
      "Payment Mode",
      "Gateway",
      "Date",
      "Status",
    ];

    const rows = filteredTransactions.map((tx) => [
      `"${tx.receiptNo || ""}"`,
      `"${tx.collectionTitle || ""}"`,
      `"${tx.collectionCategory || ""}"`,
      `"${tx.societyName || ""}"`,
      `"${tx.societyCity || ""}"`,
      `"${tx.unitLabel || ""}"`,
      `"${tx.unitBlock || ""}"`,
      `"${tx.residentName || ""}"`,
      `"${tx.residentPhone || ""}"`,
      tx.amount || 0,
      tx.fee || 0,
      tx.totalAmount || tx.amount || 0,
      `"${tx.method || ""}"`,
      `"${tx.paymentGateway || ""}"`,
      `"${formatDate(tx.paidOn)} ${formatTime(tx.paidOn)}"`,
      `"${(tx.gatewayStatus || "PAID").toUpperCase()}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ResidentOne_Fund_Collections_Export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-20 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-label-sm font-semibold text-primary no-underline hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to Dashboard
            </Link>
            <span className="text-outline/40">/</span>
            <span className="text-label-sm font-medium text-on-surface-variant">
              Platform Collections
            </span>
          </div>
          <h1 className="text-headline-md sm:text-headline-lg font-black text-on-surface tracking-tight mt-1">
            Platform Fund Collections
          </h1>
          <p className="text-body-sm text-on-surface-variant max-w-3xl mt-0.5">
            Real-time audit and breakdown of all special drives, festival funds, and welfare collections across
            residential societies — tracking online Cashfree split vs offline cash handovers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={!filteredTransactions.length}
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-label-md font-bold text-on-surface shadow-xs transition-all hover:bg-surface-container-low hover:border-indigo-500/40 active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px] text-indigo-600">
              download
            </span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/70 bg-surface-container-lowest p-3.5 shadow-xs">
        {/* Time Period Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Time" },
            { id: "this_month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "this_year", label: "This Year (2026)" },
          ].map((period) => (
            <button
              key={period.id}
              onClick={() => {
                setSelectedPeriod(period.id);
                setPage(1);
              }}
              className={`rounded-xl px-3.5 py-1.5 text-label-sm font-bold transition-all ${
                selectedPeriod === period.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Filters Group: Method, Society, Campaign */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Method Filter */}
          <select
            value={selectedMethod}
            onChange={(e) => {
              setSelectedMethod(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-label-sm font-semibold text-on-surface focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Methods (Online + Cash)</option>
            <option value="online">Online Only (Cashfree / UPI)</option>
            <option value="offline">Offline Only (Cash / Handover)</option>
          </select>

          {/* Society Dropdown Filter */}
          <select
            value={selectedSocietyId}
            onChange={(e) => {
              setSelectedSocietyId(e.target.value);
              setSelectedCollectionId(""); // Reset campaign filter when society changes
              setPage(1);
            }}
            className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-label-sm font-semibold text-on-surface focus:border-indigo-500 focus:outline-none max-w-[190px] truncate"
          >
            <option value="">All Societies ({bySociety.length})</option>
            {bySociety.map((soc) => (
              <option key={soc.societyId} value={soc.societyId}>
                {soc.name}
              </option>
            ))}
          </select>

          {/* Collection Campaign Filter */}
          <select
            value={selectedCollectionId}
            onChange={(e) => {
              setSelectedCollectionId(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-label-sm font-semibold text-on-surface focus:border-indigo-500 focus:outline-none max-w-[200px] truncate"
          >
            <option value="">All Campaigns ({allCollections.length || byCollection.length})</option>
            {(allCollections.length ? allCollections : byCollection).map((col) => {
              const colId = col._id || col.collectionId;
              return (
                <option key={colId} value={colId}>
                  {col.title} ({col.category})
                </option>
              );
            })}
          </select>
        </div>
      </section>

      {/* 4 Primary Metric Summary Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Collections Raised */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-500/20 bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-indigo-500/5 p-6 shadow-sm transition-all hover:border-indigo-500/50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
              Total Funds Raised
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 shadow-sm">
              <span className="material-symbols-outlined text-[26px]">volunteer_activism</span>
            </span>
          </div>
          <p className="mt-4 text-[38px] font-extrabold leading-none text-indigo-900 tracking-tight">
            {analyticsQuery.isLoading ? "..." : formatCurrency(summary.totalAmount)}
          </p>
          <div className="mt-3 flex items-center justify-between text-label-sm text-on-surface-variant">
            <span>{summary.totalCount} total receipts recorded</span>
            <span className="font-semibold text-indigo-700">Avg {formatCurrency(summary.avgAmount)}/flat</span>
          </div>
        </div>

        {/* Card 2: Online Collections (Cashfree Gateway) */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-primary/5 p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                Online Collections
              </span>
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                Cashfree
              </span>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[26px]">account_balance</span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-[34px] font-extrabold leading-none text-primary tracking-tight">
              {analyticsQuery.isLoading ? "..." : formatCurrency(summary.onlineAmount)}
            </p>
            <span className="text-label-md font-black text-primary">
              ({summary.onlinePercent}%)
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-label-sm text-on-surface-variant">
            <span>{summary.onlineCount} online transactions</span>
            <span className="font-semibold text-primary">Auto Easy-Split</span>
          </div>
        </div>

        {/* Card 3: Offline Handover (Cash) */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/20 bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-amber-500/5 p-6 shadow-sm transition-all hover:border-amber-500/50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                Offline Handover
              </span>
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                Cash
              </span>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-sm">
              <span className="material-symbols-outlined text-[26px]">attach_money</span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-[34px] font-extrabold leading-none text-amber-800 tracking-tight">
              {analyticsQuery.isLoading ? "..." : formatCurrency(summary.offlineAmount)}
            </p>
            <span className="text-label-md font-black text-amber-800">
              ({summary.offlinePercent}%)
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-label-sm text-on-surface-variant">
            <span>{summary.offlineCount} cash receipts</span>
            <span className="font-semibold text-amber-800">Physical Ledger</span>
          </div>
        </div>

        {/* Card 4: Active Campaigns / Drives */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-outline-variant bg-surface-container-lowest p-6 shadow-sm transition-all hover:border-slate-400 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
              Active Campaigns
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm">
              <span className="material-symbols-outlined text-[26px]">campaign</span>
            </span>
          </div>
          <p className="mt-4 text-[38px] font-extrabold leading-none text-on-surface tracking-tight">
            {analyticsQuery.isLoading ? "..." : (summary.activeDrivesCount || byCollection.length)}
          </p>
          <div className="mt-3 flex items-center justify-between text-label-sm text-on-surface-variant">
            <span>Active Collection Drives</span>
            <span className="font-semibold text-slate-700">
              {bySociety.length} Societies
            </span>
          </div>
        </div>
      </section>

      {/* Visual Share Bar: Online vs Offline */}
      <section className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-title-md font-bold text-on-surface">
              Payment Method Adoption & Ratio
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Breakdown between online Cashfree digital collections and physical cash contributions
            </p>
          </div>
          <div className="flex items-center gap-4 text-label-sm font-bold">
            <span className="flex items-center gap-2 text-primary">
              <span className="h-3 w-3 rounded-full bg-primary" />
              Online (Cashfree): {formatCurrency(summary.onlineAmount)} ({summary.onlinePercent}%)
            </span>
            <span className="flex items-center gap-2 text-amber-800">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              Offline (Cash): {formatCurrency(summary.offlineAmount)} ({summary.offlinePercent}%)
            </span>
          </div>
        </div>

        {/* Bar */}
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            style={{ width: `${Math.max(summary.onlinePercent, 2)}%` }}
            className="bg-primary transition-all duration-700 hover:opacity-90"
            title={`Online: ${summary.onlinePercent}% (${formatCurrency(summary.onlineAmount)})`}
          />
          <div
            style={{ width: `${Math.max(summary.offlinePercent, 2)}%` }}
            className="bg-amber-500 transition-all duration-700 hover:opacity-90"
            title={`Offline: ${summary.offlinePercent}% (${formatCurrency(summary.offlineAmount)})`}
          />
        </div>
      </section>

      {/* 12-Month Historical Collections Trend */}
      <section className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-title-md font-bold text-on-surface">
              12-Month Collections Velocity Trend
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Monthly special drive fund collection volume across the entire platform
            </p>
          </div>
          <div className="flex items-center gap-3 text-label-sm font-semibold">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Online
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Cash
            </span>
          </div>
        </div>

        {/* Monthly Trend Bars */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-6 items-end h-56 border-b border-outline-variant/60 pb-3">
          {monthlyTrend.map((m, idx) => {
            const heightPercent = maxMonthlyAmount > 0 ? Math.round((m.total / maxMonthlyAmount) * 100) : 0;
            const onlineHeight = m.total > 0 ? Math.round((m.online / m.total) * 100) : 0;
            const offlineHeight = 100 - onlineHeight;

            return (
              <div key={idx} className="group flex flex-col items-center h-full justify-end">
                {/* Amount on hover tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-on-surface text-center mb-1 truncate max-w-full">
                  {formatCurrency(m.total)}
                </div>
                {/* Stacked bar */}
                <div
                  style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  className="w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col justify-end bg-surface-container-highest transition-all group-hover:scale-105"
                >
                  <div
                    style={{ height: `${offlineHeight}%` }}
                    className="w-full bg-amber-500"
                    title={`Cash: ${formatCurrency(m.offline)}`}
                  />
                  <div
                    style={{ height: `${onlineHeight}%` }}
                    className="w-full bg-primary"
                    title={`Online: ${formatCurrency(m.online)}`}
                  />
                </div>
                {/* Month Label */}
                <span className="mt-2 text-[10px] font-bold text-on-surface-variant truncate w-full text-center">
                  {m.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Campaigns / Drives Breakdown Table */}
      <section className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-title-md font-bold text-on-surface">
              Campaign Drives Performance
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Breakdown of funds raised per collection drive, category, and target progress
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-label-sm font-bold text-indigo-700">
            {byCollection.length} Active Campaigns
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-outline-variant/60">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low/70 text-label-sm uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="py-3 px-4 font-bold">Campaign & Category</th>
                <th className="py-3 px-4 font-bold">Society</th>
                <th className="py-3 px-4 font-bold text-right">Target / Per Flat</th>
                <th className="py-3 px-4 font-bold text-right">Total Raised</th>
                <th className="py-3 px-4 font-bold text-right">Online (Cashfree)</th>
                <th className="py-3 px-4 font-bold text-right">Offline (Cash)</th>
                <th className="py-3 px-4 font-bold text-center">Target Progress</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {byCollection.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                    No collection campaigns found matching filters.
                  </td>
                </tr>
              ) : (
                byCollection.map((col) => (
                  <tr key={col.collectionId} className="hover:bg-surface-container-lowest/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-on-surface">{col.title}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getCategoryBadge(col.category)}`}>
                          {col.category}
                        </span>
                        {col.dueDate && (
                          <span className="text-[11px] text-outline">
                            Due {formatDate(col.dueDate)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-on-surface">{col.societyName}</div>
                      <div className="text-[11px] text-outline capitalize">{col.societyCity || "India"}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {col.targetAmount > 0 ? (
                        <div className="font-bold text-on-surface">{formatCurrency(col.targetAmount)}</div>
                      ) : (
                        <div className="font-medium text-outline">Open Target</div>
                      )}
                      {col.amountPerUnit > 0 && (
                        <div className="text-[11px] text-outline">
                          {formatCurrency(col.amountPerUnit)}/flat
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-indigo-900">
                      {formatCurrency(col.totalAmount)}
                      <div className="text-[11px] font-normal text-outline">
                        {col.totalCount} receipts
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-primary">
                      {formatCurrency(col.onlineAmount)}
                      <div className="text-[11px] font-normal text-outline">
                        {col.onlineCount} online
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-800">
                      {formatCurrency(col.offlineAmount)}
                      <div className="text-[11px] font-normal text-outline">
                        {col.offlineCount} cash
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 font-bold text-label-sm text-indigo-700">
                        {col.targetAmount > 0 ? `${col.percentTarget}%` : `${col.totalCount} Flats`}
                      </div>
                      {col.targetAmount > 0 && (
                        <div className="w-16 h-1.5 bg-surface-container-highest rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, col.percentTarget)}%` }}
                            className="h-full bg-indigo-600 rounded-full"
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                        col.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {col.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Society-wise Performance Table */}
      <section className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-title-md font-bold text-on-surface">
              Society Collection Performance
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Ranking of societies by total fund campaign collections & online gateway adoption
            </p>
          </div>
          <span className="rounded-full bg-surface-container-low px-3 py-1 text-label-sm font-bold text-on-surface">
            {bySociety.length} Societies
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-outline-variant/60">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low/70 text-label-sm uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="py-3 px-4 font-bold">Society</th>
                <th className="py-3 px-4 font-bold text-center">Units</th>
                <th className="py-3 px-4 font-bold text-right">Total Raised</th>
                <th className="py-3 px-4 font-bold text-right">Online (Cashfree)</th>
                <th className="py-3 px-4 font-bold text-right">Offline (Cash)</th>
                <th className="py-3 px-4 font-bold text-center">Online Share</th>
                <th className="py-3 px-4 font-bold text-right">Last Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {bySociety.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                    No collection records found matching filters.
                  </td>
                </tr>
              ) : (
                bySociety.map((soc) => (
                  <tr key={soc.societyId} className="hover:bg-surface-container-lowest/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-on-surface">{soc.name}</div>
                      <div className="text-[12px] text-outline capitalize">{soc.city || "India"}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-on-surface-variant">
                      {soc.totalUnits || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-indigo-900">
                      {formatCurrency(soc.totalAmount)}
                      <div className="text-[11px] font-normal text-outline">
                        {soc.totalCount} receipts
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-primary">
                      {formatCurrency(soc.onlineAmount)}
                      <div className="text-[11px] font-normal text-outline">
                        {soc.onlineCount} online
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-800">
                      {formatCurrency(soc.offlineAmount)}
                      <div className="text-[11px] font-normal text-outline">
                        {soc.offlineCount} cash
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 font-bold text-label-sm text-primary">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        {soc.onlinePercent}%
                      </div>
                      <div className="w-16 h-1.5 bg-surface-container-highest rounded-full mx-auto mt-1 overflow-hidden">
                        <div
                          style={{ width: `${soc.onlinePercent}%` }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right text-label-sm text-on-surface-variant whitespace-nowrap">
                      {formatDate(soc.lastPaymentDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detailed Fund Collection Transactions Ledger */}
      <section className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-title-md font-bold text-on-surface">
              Platform Collection Transactions Log
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Chronological ledger of every fund collection receipt cleared across the platform
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search receipt, drive, resident..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low pl-9 pr-3 py-1.5 text-body-sm text-on-surface focus:border-indigo-500 focus:outline-none placeholder:text-outline"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto rounded-2xl border border-outline-variant/60">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low/70 text-label-sm uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="py-3 px-4 font-bold">Receipt No</th>
                <th className="py-3 px-4 font-bold">Campaign Drive</th>
                <th className="py-3 px-4 font-bold">Society</th>
                <th className="py-3 px-4 font-bold">House / Flat</th>
                <th className="py-3 px-4 font-bold">Resident</th>
                <th className="py-3 px-4 font-bold text-right">Amount</th>
                <th className="py-3 px-4 font-bold text-center">Payment Mode</th>
                <th className="py-3 px-4 font-bold text-right">Date & Time</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-on-surface-variant">
                    {analyticsQuery.isLoading ? "Loading platform collection transactions..." : "No collection transactions found."}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-surface-container-lowest/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 text-label-sm">
                      {tx.receiptNo}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-on-surface">{tx.collectionTitle}</div>
                      <span className={`inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-bold uppercase mt-0.5 ${getCategoryBadge(tx.collectionCategory)}`}>
                        {tx.collectionCategory}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-on-surface">{tx.societyName}</div>
                      <div className="text-[11px] text-outline capitalize">{tx.societyCity || "India"}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-on-surface">
                      {tx.unitLabel}{tx.unitBlock ? ` · Block ${tx.unitBlock}` : ""}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-on-surface">{tx.residentName}</div>
                      {tx.residentPhone && (
                        <div className="text-[11px] text-outline">{tx.residentPhone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-on-surface">
                      {formatCurrency(tx.amount)}
                      {tx.fee > 0 && (
                        <div className="text-[10px] text-outline font-normal">
                          + ₹{tx.fee} fee
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {tx.isOnline ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          <span className="material-symbols-outlined text-[13px]">bolt</span>
                          Online ({tx.paymentGateway})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                          <span className="material-symbols-outlined text-[13px]">payments</span>
                          Cash Handover
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-label-sm text-on-surface-variant whitespace-nowrap">
                      <div>{formatDate(tx.paidOn)}</div>
                      <div className="text-[11px] text-outline">{formatTime(tx.paidOn)}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        PAID
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-label-sm text-on-surface-variant">
              Showing page <b>{pagination.page}</b> of <b>{pagination.totalPages}</b> ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-label-sm font-bold text-on-surface transition-all hover:bg-surface-container disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-label-sm font-bold text-on-surface transition-all hover:bg-surface-container disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
