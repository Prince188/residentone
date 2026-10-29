
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import { getExpenses, formatAmount, formatDate, getExpenseCategoryMeta } from "../../lib/expenses";
import { getEvent } from "../../lib/events";

export default function EventExpenseDetailsPage() {
  const { eventId } = useParams();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const societyId = activeSociety?.id || activeSociety?._id;

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const res = await getEvent(eventId);
      return res?.data ?? res;
    },
    enabled: Boolean(eventId),
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses", societyId],
    queryFn: async () => {
      const res = await getExpenses();
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.expenses)) return res.expenses;
      return [];
    },
    enabled: Boolean(societyId),
  });

  const eventExpenses = expenses.filter(
    (exp) => (exp.eventId || exp.event?._id || exp.event?.id) === eventId
  );

  const totalSpent = eventExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const budget = Number(event?.budget || event?.estimatedCost || 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Link to="/expenses" className="hover:text-primary transition-colors">Expenses</Link>
        <span>/</span>
        <span className="text-on-surface font-semibold">Event Spending Breakdown</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-purple-600 bg-purple-100 p-2.5 rounded-2xl text-[28px]">celebration</span>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">{event?.name || event?.title || "Society Event"}</h1>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Category: <span className="capitalize font-semibold text-on-surface">{event?.category || "Festival"}</span> · Status: <span className="capitalize font-semibold text-emerald-700">{event?.status || "Active"}</span>
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/expenses"
          className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to All Expenses
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Event Expenses</span>
          <p className="mt-2 text-2xl font-bold text-rose-700">{formatAmount(totalSpent)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{eventExpenses.length} payment vouchers</p>
        </div>

        {budget > 0 && (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Allocated Budget</span>
            <p className="mt-2 text-2xl font-bold text-on-surface">{formatAmount(budget)}</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              Remaining: <span className={budget - totalSpent >= 0 ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                {formatAmount(budget - totalSpent)}
              </span>
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Avg. Per Voucher</span>
          <p className="mt-2 text-2xl font-bold text-on-surface">
            {formatAmount(eventExpenses.length > 0 ? totalSpent / eventExpenses.length : 0)}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">Expense density</p>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        <div className="border-b border-outline-variant bg-surface-container-low px-5 py-3">
          <h3 className="text-sm font-bold text-on-surface">Vouchers Incurred for this Event</h3>
        </div>

        {loadingExpenses ? (
          <div className="py-12 text-center text-on-surface-variant">Loading expenses...</div>
        ) : eventExpenses.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[36px] text-outline">receipt</span>
            <p className="mt-2 text-sm font-semibold">No expenses linked to this event yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold uppercase text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3">Expense</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Vendor / Payee</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {eventExpenses.map((exp) => {
                  const meta = getExpenseCategoryMeta(exp.category);
                  return (
                    <tr key={exp._id || exp.id} className="hover:bg-surface-container-low/50">
                      <td className="px-5 py-3.5 font-semibold text-on-surface">{exp.title}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.bg} ${meta.text}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-on-surface-variant">{exp.vendorName || "—"}</td>
                      <td className="px-4 py-3.5 text-on-surface-variant">{formatDate(exp.date)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-rose-700">{formatAmount(exp.amount)}</td>
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
