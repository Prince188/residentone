import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveSociety,
  selectActiveMembership,
} from "../../stores/society.store";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  formatAmount,
  formatDate,
  extractApiError,
  EXPENSE_CATEGORIES,
  getExpenseCategoryMeta,
  exportWalletExcel,
} from "../../lib/expenses";
import { getEvents } from "../../lib/events";
import { uploadSocietyLogo } from "../../lib/societies";
import { hasPermission } from "../../lib/permissions";

export default function ManageExpensesPage() {
  // navigate
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);

  const societyId = activeSociety?.id || activeSociety?._id;
  const canManage = hasPermission(activeMembership?.role, "manage_expenses");

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState("all");

  // Modal States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [exporting, setExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "utilities",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "bank_transfer",
    vendorName: "",
    eventId: "",
    receiptUrl: "",
    notes: "",
  });
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Queries
  const { data: expensesData = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses", societyId],
    queryFn: async () => {
      const res = await getExpenses();
      const raw = Array.isArray(res) ? res : res?.data?.expenses ?? res?.data?.data ?? res?.expenses ?? res?.data ?? [];
      return Array.isArray(raw) ? raw : [];
    },
    enabled: Boolean(societyId),
  });
  const expenses = Array.isArray(expensesData) ? expensesData : [];

  const { data: eventsData = [] } = useQuery({
    queryKey: ["events", societyId],
    queryFn: async () => {
      const res = await getEvents();
      const raw = Array.isArray(res) ? res : res?.data?.events ?? res?.data?.data ?? res?.events ?? res?.data ?? [];
      return Array.isArray(raw) ? raw : [];
    },
    enabled: Boolean(societyId),
  });
  const events = Array.isArray(eventsData) ? eventsData : [];

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingExpense) {
        return updateExpense(editingExpense._id || editingExpense.id, payload);
      }
      return createExpense(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses", societyId]);
      queryClient.invalidateQueries(["wallet-summary", societyId]);
      setIsAddEditOpen(false);
      setEditingExpense(null);
      setStatusMsg(editingExpense ? "Expense updated successfully" : "Expense recorded successfully");
      setTimeout(() => setStatusMsg(""), 3500);
    },
    onError: (err) => {
      setErrorMsg(extractApiError(err, "Failed to save expense"));
      setTimeout(() => setErrorMsg(""), 4000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }) => deleteExpense(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses", societyId]);
      queryClient.invalidateQueries(["wallet-summary", societyId]);
      setDeleteConfirmId(null);
      setDeleteReason("");
      setStatusMsg("Expense deleted successfully");
      setTimeout(() => setStatusMsg(""), 3500);
    },
    onError: (err) => {
      setErrorMsg(extractApiError(err, "Failed to delete expense"));
      setTimeout(() => setErrorMsg(""), 4000);
    },
  });

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setForm({
      title: "",
      amount: "",
      category: "utilities",
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: "bank_transfer",
      vendorName: "",
      eventId: "",
      receiptUrl: "",
      notes: "",
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (exp) => {
    setEditingExpense(exp);
    setForm({
      title: exp.title || exp.description || "",
      amount: String(exp.amount || ""),
      category: exp.category || "others",
      date: exp.date ? new Date(exp.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      paymentMethod: exp.paymentMethod || "bank_transfer",
      vendorName: exp.vendorName || exp.payee || "",
      eventId: exp.eventId || exp.event?._id || exp.event?.id || "",
      receiptUrl: exp.receiptUrl || exp.billUrl || "",
      notes: exp.notes || "",
    });
    setIsAddEditOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingReceipt(true);
      const fd = new FormData();
      fd.append("logo", file);
      const res = await uploadSocietyLogo(fd);
      const url = res.data?.data?.url || res.data?.url || res.data?.data;
      if (url) {
        setForm((prev) => ({ ...prev, receiptUrl: url }));
      }
    } catch (err) {
      setErrorMsg("Failed to upload bill image. Please try again.");
      setTimeout(() => setErrorMsg(""), 3500);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrorMsg("Title/Description is required");
      return;
    }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      setErrorMsg("Please enter a valid amount greater than ₹0");
      return;
    }

    const payload = {
      title: form.title.trim(),
      amount: amt,
      category: form.category,
      date: form.date,
      paymentMethod: form.paymentMethod,
      vendorName: form.vendorName.trim(),
      notes: form.notes.trim(),
      receiptUrl: form.receiptUrl || undefined,
      eventId: form.eventId || undefined,
    };

    saveMutation.mutate(payload);
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const res = await exportWalletExcel();
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Society_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatusMsg("Expenses Excel downloaded successfully");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Failed to download expenses spreadsheet");
      setTimeout(() => setErrorMsg(""), 3500);
    } finally {
      setExporting(false);
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (item.title || "").toLowerCase().includes(q) ||
        (item.vendorName || "").toLowerCase().includes(q) ||
        (item.notes || "").toLowerCase().includes(q);

      const matchCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      const itemEventId = item.eventId || item.event?._id || item.event?.id;
      const matchEvent =
        selectedEventId === "all" || itemEventId === selectedEventId;

      return matchSearch && matchCategory && matchEvent;
    });
  }, [expenses, search, selectedCategory, selectedEventId]);

  // Aggregate stats
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [expenses]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredExpenses]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-6">
      {/* Toast notifications */}
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
            <span className="material-symbols-outlined text-primary text-[28px]">payments</span>
            <h1 className="text-2xl font-bold text-on-surface">Society Expenses & Ledgers</h1>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Track utilities, AMC repairs, staff salaries, vendor bills, and event spending with full transparency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            {exporting ? "Exporting..." : "Export Excel"}
          </button>

          <Link
            to="/wallet"
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-primary hover:bg-surface-container transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            View Wallet
          </Link>

          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary/90 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Record Expense
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Spending</span>
            <span className="material-symbols-outlined text-rose-600 bg-rose-50 p-2 rounded-xl text-[20px]">trending_down</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-on-surface">{formatAmount(totalSpent)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Across {expenses.length} recorded vouchers</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Filtered Total</span>
            <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-xl text-[20px]">filter_alt</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-on-surface">{formatAmount(filteredTotal)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{filteredExpenses.length} entries matching filters</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Events & Festivals</span>
            <span className="material-symbols-outlined text-purple-600 bg-purple-50 p-2 rounded-xl text-[20px]">celebration</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-on-surface">
            {formatAmount(
              expenses
                .filter((x) => x.category === "events" || x.eventId)
                .reduce((sum, x) => sum + (Number(x.amount) || 0), 0)
            )}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">{events.length} active society events</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Utilities & Staff</span>
            <span className="material-symbols-outlined text-amber-600 bg-amber-50 p-2 rounded-xl text-[20px]">bolt</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-on-surface">
            {formatAmount(
              expenses
                .filter((x) => x.category === "utilities" || x.category === "salaries")
                .reduce((sum, x) => sum + (Number(x.amount) || 0), 0)
            )}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">Electricity, water, guard wages</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses by title, vendor, reference..."
              className="w-full rounded-xl border border-outline-variant bg-surface py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            />
          </div>

          {events.length > 0 && (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
            >
              <option value="all">All Events & General</option>
              {events.map((evt) => (
                <option key={evt._id || evt.id} value={evt._id || evt.id}>
                  🎉 {evt.name || evt.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              selectedCategory === "all"
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            All Categories
          </button>
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        {loadingExpenses ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
            <p className="mt-2 text-sm">Loading expense ledger...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[44px] text-outline">receipt_long</span>
            <h3 className="mt-2 text-base font-semibold text-on-surface">No expenses found</h3>
            <p className="mt-1 text-sm">
              {search || selectedCategory !== "all" || selectedEventId !== "all"
                ? "Try clearing your filters or search terms."
                : "No expense vouchers have been recorded for this society yet."}
            </p>
            {canManage && (
              <button
                onClick={handleOpenAdd}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Record First Expense
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3.5">Expense Details</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Vendor / Payee</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Method</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-center">Receipt</th>
                  {canManage && <th className="px-4 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredExpenses.map((exp) => {
                  const meta = getExpenseCategoryMeta(exp.category);
                  const linkedEvent = events.find(
                    (e) => (e._id || e.id) === (exp.eventId || exp.event?._id || exp.event?.id)
                  );
                  return (
                    <tr key={exp._id || exp.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-on-surface">{exp.title || exp.description}</div>
                        {linkedEvent ? (
                          <Link
                            to={`/expenses/events/${linkedEvent._id || linkedEvent.id}`}
                            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded px-1.5 py-0.5"
                          >
                            <span className="material-symbols-outlined text-[13px]">celebration</span>
                            {linkedEvent.name || linkedEvent.title}
                          </Link>
                        ) : null}
                        {exp.notes ? (
                          <div className="mt-0.5 text-xs text-on-surface-variant truncate max-w-xs">{exp.notes}</div>
                        ) : null}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.bg} ${meta.text}`}>
                          <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                          {meta.label}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-on-surface whitespace-nowrap">
                        {exp.vendorName || exp.payee || "—"}
                      </td>

                      <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                        {formatDate(exp.date || exp.createdAt)}
                      </td>

                      <td className="px-4 py-4 text-on-surface-variant capitalize whitespace-nowrap">
                        {(exp.paymentMethod || "bank_transfer").replace(/_/g, " ")}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-rose-700 whitespace-nowrap">
                        {formatAmount(exp.amount)}
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {exp.receiptUrl || exp.billUrl ? (
                          <button
                            onClick={() => setReceiptPreviewUrl(exp.receiptUrl || exp.billUrl)}
                            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface px-2 py-1 text-xs text-primary hover:bg-surface-container font-medium"
                          >
                            <span className="material-symbols-outlined text-[15px]">attach_file</span>
                            View Bill
                          </button>
                        ) : (
                          <span className="text-xs text-outline">—</span>
                        )}
                      </td>

                      {canManage && (
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(exp)}
                              title="Edit expense"
                              className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(exp._id || exp.id)}
                              title="Delete expense"
                              className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h2 className="text-lg font-bold text-on-surface">
                {editingExpense ? "Edit Expense Voucher" : "Record Society Expense"}
              </h2>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Title / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lift AMC monthly servicing, Diesel for generator"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Payment Method
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="upi">UPI / QR</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Petty Cash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Vendor / Payee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Otis Elevators Ltd, Torrent Power"
                    value={form.vendorName}
                    onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Linked Society Event (Optional)
                  </label>
                  <select
                    value={form.eventId}
                    onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="">General Society Expense</option>
                    {events.map((evt) => (
                      <option key={evt._id || evt.id} value={evt._id || evt.id}>
                        🎉 {evt.name || evt.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Bill / Voucher Attachment
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="text-xs text-on-surface-variant file:mr-2 file:rounded-lg file:border-0 file:bg-surface-container file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-on-surface hover:file:bg-surface-container-high"
                  />
                  {uploadingReceipt && (
                    <span className="text-xs text-primary animate-pulse">Uploading bill...</span>
                  )}
                  {form.receiptUrl && !uploadingReceipt && (
                    <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check</span> Attached
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Notes / Internal Reference
                </label>
                <textarea
                  rows="2"
                  placeholder="Invoice number, cheque number, or notes for committee..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending || uploadingReceipt}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saving..." : editingExpense ? "Update Expense" : "Record Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="text-lg font-bold text-on-surface">Delete Expense Voucher?</h3>
            </div>
            <p className="text-sm text-on-surface-variant">
              Are you sure you want to delete this expense voucher? This will remove it from the society expense ledger.
            </p>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                Reason for cancellation/deletion (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Duplicate entry, incorrect amount"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Keep Expense
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: deleteConfirmId, reason: deleteReason })}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Preview Modal */}
      {receiptPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setReceiptPreviewUrl(null)}>
          <div className="relative max-w-2xl max-h-[90vh] bg-surface rounded-2xl overflow-hidden p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setReceiptPreviewUrl(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <img src={receiptPreviewUrl} alt="Bill Voucher" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
