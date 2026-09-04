import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getHistoricalAnalytics } from "../../lib/societies";

function formatCurrency(amount = 0) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

export default function AdminAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialChart = searchParams.get("chart") || "revenue";

  const [activeTab, setActiveTab] = useState(initialChart); // 'revenue' | 'societies' | 'units' | 'transactions'
  const [startYear, setStartYear] = useState(2024);
  const [endYear, setEndYear] = useState(2026);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(null);

  const analyticsQuery = useQuery({
    queryKey: ["superadmin-historical-analytics", startYear, endYear],
    queryFn: async () => (await getHistoricalAnalytics({ startYear, endYear })).data.data,
  });

  const data = analyticsQuery.data || {
    summary: {},
    timeline: [],
    timeRange: { availableYears: [2024, 2025, 2026] },
  };

  const timeline = data.timeline || [];
  const summary = data.summary || {};

  // Find maximum values for scaling bars
  const maxRevenue = Math.max(1, ...timeline.map((t) => t.totalRevenue || 0));
  const maxCumulativeSocieties = Math.max(1, ...timeline.map((t) => t.cumulativeSocieties || 0));
  const maxCumulativeUnits = Math.max(1, ...timeline.map((t) => t.cumulativeUnits || 0));
  const maxTransactions = Math.max(1, ...timeline.map((t) => t.transactionCount || 0));

  const activeMonth = selectedMonthIdx !== null && timeline[selectedMonthIdx]
    ? timeline[selectedMonthIdx]
    : timeline[timeline.length - 1] || {};

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-16 animate-in fade-in duration-200">
      {/* Top Header & Navigation Breadcrumb */}
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
            <span className="text-label-sm font-medium text-on-surface-variant">Historical Analytics</span>
          </div>
          <h1 className="text-headline-md sm:text-headline-lg font-black text-on-surface tracking-tight mt-1">
            Platform Historical Analytics
          </h1>
          <p className="text-body-sm sm:text-body-md text-on-surface-variant mt-0.5">
            Multi-year retrospective insights, financial volume, onboarding rate, and expansion data from MongoDB.
          </p>
        </div>

        {/* Time Period / Year Range Filter Controls */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-2 shadow-sm">
          <span className="material-symbols-outlined text-[20px] text-primary ml-1">date_range</span>
          <span className="text-label-sm font-bold text-on-surface-variant">Period:</span>
          
          <div className="flex items-center gap-1.5">
            <select
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-label-sm font-bold text-on-surface focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
            <span className="text-label-sm font-bold text-outline">to</span>
            <select
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-label-sm font-bold text-on-surface focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>

          <div className="border-l border-outline-variant pl-2 flex gap-1">
            <button
              type="button"
              onClick={() => { setStartYear(2024); setEndYear(2026); }}
              className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                startYear === 2024 && endYear === 2026
                  ? "bg-primary text-white"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              All (24-26)
            </button>
            <button
              type="button"
              onClick={() => { setStartYear(2026); setEndYear(2026); }}
              className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                startYear === 2026 && endYear === 2026
                  ? "bg-primary text-white"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              2026
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Ribbon for Selected Time Range */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Range Revenue</span>
          <p className="mt-2 text-headline-sm font-black text-primary">
            {formatCurrency(summary.totalRevenue)}
          </p>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">SaaS dues & collections</span>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Avg. Monthly</span>
          <p className="mt-2 text-headline-sm font-black text-on-surface">
            {formatCurrency(summary.avgMonthlyRevenue)}
          </p>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">Monthly platform run rate</span>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Peak Month</span>
          <p className="mt-2 text-headline-sm font-black text-emerald-700">
            {formatCurrency(summary.peakRevenue)}
          </p>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">Highest revenue achieved</span>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Platform Societies</span>
          <p className="mt-2 text-headline-sm font-black text-on-surface">
            {summary.currentSocieties || 0}
          </p>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">Total onboarded complexes</span>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Housing Units</span>
          <p className="mt-2 text-headline-sm font-black text-sky-700">
            {summary.currentUnits || 0}
          </p>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">Residential flats/villas</span>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Transactions</span>
          <p className="mt-2 text-headline-sm font-black text-violet-700">
            {summary.totalTransactions || 0}
          </p>
          <span className="text-[11px] text-on-surface-variant mt-0.5 block">Processed DB transactions</span>
        </div>
      </div>

      {/* Main Interactive Chart Section with View Switcher */}
      <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-7 shadow-sm space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab("revenue"); setSearchParams({ chart: "revenue" }); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-label-md font-bold transition-all cursor-pointer ${
                activeTab === "revenue"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">payments</span>
              Revenue Analytics
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("societies"); setSearchParams({ chart: "growth" }); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-label-md font-bold transition-all cursor-pointer ${
                activeTab === "societies"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">apartment</span>
              Society Footprint
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("units"); setSearchParams({ chart: "units" }); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-label-md font-bold transition-all cursor-pointer ${
                activeTab === "units"
                  ? "bg-sky-700 text-white shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">home</span>
              Unit Scaling
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("transactions"); setSearchParams({ chart: "transactions" }); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-label-md font-bold transition-all cursor-pointer ${
                activeTab === "transactions"
                  ? "bg-violet-700 text-white shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              Transactions
            </button>
          </div>

          {/* Active Inspection Inspector Pill */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="rounded-xl border border-outline-variant bg-surface-container px-3.5 py-1.5 text-right">
              <span className="text-[11px] font-bold text-on-surface-variant block uppercase">
                {activeMonth.label || "Inspection"}
              </span>
              <span className="text-body-md font-extrabold text-on-surface">
                {activeTab === "revenue" && formatCurrency(activeMonth.totalRevenue)}
                {activeTab === "societies" && `${activeMonth.cumulativeSocieties || 0} Societies (+${activeMonth.newSocieties || 0})`}
                {activeTab === "units" && `${activeMonth.cumulativeUnits || 0} Units (+${activeMonth.newUnits || 0})`}
                {activeTab === "transactions" && `${activeMonth.transactionCount || 0} Transactions`}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Expanded Chart Canvas */}
        {analyticsQuery.isLoading ? (
          <div className="h-72 flex items-center justify-center text-body-md text-on-surface-variant">
            Loading historical data from MongoDB...
          </div>
        ) : timeline.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-body-md text-on-surface-variant">
            No records found for the selected time window.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex h-64 items-end gap-1.5 sm:gap-2 overflow-x-auto pb-2 pt-8">
              {timeline.map((item, idx) => {
                let heightPercent = 6;
                let barColor = "bg-primary/20 hover:bg-primary/40";
                let activeColor = "bg-gradient-to-t from-primary via-primary to-primary-container shadow-md";
                let tooltipText = "";

                if (activeTab === "revenue") {
                  heightPercent = (item.totalRevenue || 0) > 0 ? Math.max(6, Math.round(((item.totalRevenue || 0) / maxRevenue) * 100)) : 2;
                  tooltipText = formatCurrency(item.totalRevenue);
                } else if (activeTab === "societies") {
                  heightPercent = Math.max(6, Math.round(((item.cumulativeSocieties || 0) / maxCumulativeSocieties) * 100));
                  barColor = "bg-emerald-100 hover:bg-emerald-200";
                  activeColor = "bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 shadow-md";
                  tooltipText = `${item.cumulativeSocieties} Total (+${item.newSocieties})`;
                } else if (activeTab === "units") {
                  heightPercent = Math.max(6, Math.round(((item.cumulativeUnits || 0) / maxCumulativeUnits) * 100));
                  barColor = "bg-sky-100 hover:bg-sky-200";
                  activeColor = "bg-gradient-to-t from-sky-600 via-sky-500 to-cyan-400 shadow-md";
                  tooltipText = `${item.cumulativeUnits} Units`;
                } else if (activeTab === "transactions") {
                  heightPercent = Math.max(6, Math.round(((item.transactionCount || 0) / maxTransactions) * 100));
                  barColor = "bg-violet-100 hover:bg-violet-200";
                  activeColor = "bg-gradient-to-t from-violet-600 via-violet-500 to-purple-400 shadow-md";
                  tooltipText = `${item.transactionCount} Txns`;
                }

                const isSelected = selectedMonthIdx === idx || (selectedMonthIdx === null && idx === timeline.length - 1);

                return (
                  <div
                    key={item.periodKey || idx}
                    className="group relative flex-1 min-w-[28px] sm:min-w-[34px] flex flex-col items-center justify-end h-full cursor-pointer"
                    onMouseEnter={() => setSelectedMonthIdx(idx)}
                    onClick={() => setSelectedMonthIdx(idx)}
                  >
                    {/* Hover tooltip */}
                    {isSelected && (
                      <div className="absolute -top-9 z-20 whitespace-nowrap rounded-lg bg-on-surface px-2.5 py-1 text-[11px] font-bold text-white shadow-md animate-in fade-in zoom-in-95 duration-150">
                        {tooltipText}
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isSelected ? activeColor : barColor
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Month & Year Ticks */}
            <div className="flex justify-between gap-1 border-t border-outline-variant/60 pt-2.5 text-[10px] sm:text-[11px] font-semibold text-on-surface-variant overflow-x-auto">
              {timeline.map((item, idx) => {
                const isSelected = selectedMonthIdx === idx || (selectedMonthIdx === null && idx === timeline.length - 1);
                return (
                  <span
                    key={item.periodKey || idx}
                    className={`flex-1 min-w-[28px] sm:min-w-[34px] text-center truncate ${
                      isSelected ? "text-primary font-bold" : "text-on-surface-variant"
                    }`}
                  >
                    {item.month}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Complete Historical Monthly Breakdown Table */}
      <section className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/60 pb-3">
          <div>
            <h3 className="text-body-lg font-bold text-on-surface">Monthly Historical Telemetry Ledger</h3>
            <p className="text-label-sm text-on-surface-variant">
              Actual database audit figures across each month from {startYear} to {endYear}.
            </p>
          </div>
          <span className="text-[12px] font-semibold text-primary">
            {timeline.length} Months Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead>
              <tr className="border-b border-outline-variant text-[11px] uppercase tracking-wider text-outline">
                <th className="py-3 px-3 font-semibold">Month / Period</th>
                <th className="py-3 px-3 font-semibold text-right">SaaS Subscriptions</th>
                <th className="py-3 px-3 font-semibold text-right">Resident Maintenance</th>
                <th className="py-3 px-3 font-semibold text-right">New Societies</th>
                <th className="py-3 px-3 font-semibold text-right">Cumulative Societies</th>
                <th className="py-3 px-3 font-semibold text-right">Total Units</th>
                <th className="py-3 px-3 font-semibold text-right">Transactions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {timeline.slice().reverse().map((row) => (
                <tr key={row.periodKey} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-on-surface">
                    {row.label}
                  </td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-primary">
                    {formatCurrency(row.totalRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-on-surface-variant">
                    {formatCurrency(row.paymentRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {row.newSocieties > 0 ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                        +{row.newSocieties}
                      </span>
                    ) : (
                      <span className="text-outline">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-on-surface">
                    {row.cumulativeSocieties}
                  </td>
                  <td className="py-2.5 px-3 text-right text-on-surface-variant">
                    {row.cumulativeUnits}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-on-surface">
                    {row.transactionCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
