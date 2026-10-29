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
  exportExpensesExcel,
  downloadClientExpenseCsv,
} from "../../lib/expenses";
import { getEvents } from "../../lib/events";
import { uploadSocietyLogo } from "../../lib/societies";
import { hasPermission } from "../../lib/permissions";

export default function ManageExpensesPage() {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);

  const societyId = activeSociety?.id || activeSociety?._id;
  const societyName = activeSociety?.name || "Society";
  const canManage = hasPermission(activeMembership?.role, "manage_expenses");

  // View Mode: 'events' (default cards view matching mobile app) or 'all' (master table view)
  const [viewMode, setViewMode] = useState("events");

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState("all");

  // Modal & Export States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingCardId, setExportingCardId] = useState(null);
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
  const expenses = useMemo(() => {
    return Array.isArray(expensesData) ? expensesData : [];
  }, [expensesData]);

  const { data: eventsData = [] } = useQuery({
    queryKey: ["events", societyId],
    queryFn: async () => {
      const res = await getEvents();
      const raw = Array.isArray(res) ? res : res?.data?.events ?? res?.data?.data ?? res?.events ?? res?.data ?? [];
      return Array.isArray(raw) ? raw : [];
    },
    enabled: Boolean(societyId),
  });
  const events = useMemo(() => {
    return Array.isArray(eventsData) ? eventsData : [];
  }, [eventsData]);

  // Group Expenses by Event / Fund Cards (Parity with Mobile App)
  const eventCards = useMemo(() => {
    // 1. General Society Operations & Utilities Card
    const generalExpenses = expenses.filter(
      (e) => !e.isCancelled && !e.eventId && !e.event?._id && !e.event?.id && !e.eventTag && !e.event
    );
    const generalTotal = generalExpenses.reduce((s, i) => s + (Number(i.amount) || 0), 0);

    const cards = [
      {
        id: "general",
        name: "General Operations & Utilities",
        subtitle: "Daily bills, electricity, water, security wages, and office repairs",
        category: "operations",
        count: generalExpenses.length,
        total: generalTotal,
        isGeneral: true,
        expenses: generalExpenses,
      },
    ];

    // 2. Map Events from DB
    const eventMap = new Map();
    events.forEach((evt) => {
      const id = String(evt._id || evt.id);
      eventMap.set(id, {
        id,
        _id: evt._id || evt.id,
        name: evt.name || evt.title || "Society Event",
        category: evt.category || "festival",
        startDate: evt.startDate,
        endDate: evt.endDate,
        budget: Number(evt.budget || evt.estimatedCost || 0),
        status: evt.status || "active",
        count: 0,
        total: 0,
        expenses: [],
      });
    });

    // 3. Accumulate Expenses per Event
    expenses.forEach((item) => {
      if (item.isCancelled) return;
      if (!item.eventId && !item.event?._id && !item.event?.id && !item.eventTag && !item.event) return;

      const eId = item.eventId ? String(item.eventId || item.event?._id || item.event?.id) : null;
      let matched = null;

      if (eId && eventMap.has(eId)) {
        matched = eventMap.get(eId);
      } else {
        const nameToMatch = String(item.eventTag || item.event || "").trim().toLowerCase();
        for (const evt of eventMap.values()) {
          if (evt.name.trim().toLowerCase() === nameToMatch) {
            matched = evt;
            break;
          }
        }
        if (!matched && nameToMatch) {
          matched = {
            id: nameToMatch,
            name: item.eventTag || item.event,
            category: "event",
            count: 0,
            total: 0,
            status: "active",
            expenses: [],
          };
          eventMap.set(nameToMatch, matched);
        }
      }

      if (matched) {
        matched.count += 1;
        matched.total += Number(item.amount) || 0;
        matched.expenses.push(item);
      }
    });

    eventMap.forEach((evt) => {
      cards.push(evt);
    });

    // Filter cards by search query
    const q = search.trim().toLowerCase();
    if (!q) return cards;

    return cards.filter((card) => {
      if (card.name.toLowerCase().includes(q)) return true;
      if (card.category.toLowerCase().includes(q)) return true;
      return card.expenses.some(
        (e) =>
          (e.title || "").toLowerCase().includes(q) ||
          (e.vendorName || "").toLowerCase().includes(q) ||
          (e.notes || "").toLowerCase().includes(q)
      );
    });
  }, [expenses, events, search]);

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
      date: exp.date || exp.expenseDate
        ? new Date(exp.date || exp.expenseDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      paymentMethod: exp.paymentMethod || exp.paymentMode || "bank_transfer",
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
      setErrorMsg("Failed to upload bill receipt. Please try again.");
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

  // Master Export All Society Expenses
  const handleExportAllExcel = async () => {
    try {
      setExportingAll(true);
      const res = await exportWalletExcel();
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${societyName.replace(/[^a-zA-Z0-9_-]/g, "_")}_All_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatusMsg("All Society Expenses spreadsheet downloaded");
      setTimeout(() => setStatusMsg(""), 3500);
    } catch (err) {
      // Fallback to client CSV
      downloadClientExpenseCsv({
        eventName: "All Society Expenses",
        expenses: expenses.filter((e) => !e.isCancelled),
        societyName,
      });
      setStatusMsg("All Society Expenses report downloaded");
      setTimeout(() => setStatusMsg(""), 3500);
    } finally {
      setExportingAll(false);
    }
  };

  // Single Event Card Excel Export Handler
  const handleDownloadCardExcel = async (card) => {
    try {
      setExportingCardId(card.id);
      try {
        const res = await exportExpensesExcel({ eventId: card.id });
        const blob = new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        const cleanName = card.name.replace(/[^a-zA-Z0-9_-]/g, "_");
        link.href = url;
        link.setAttribute("download", `${cleanName}_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (backendErr) {
        // Instant Fallback to client-side CSV
        downloadClientExpenseCsv({
          eventName: card.name,
          expenses: card.expenses || [],
          societyName,
        });
      }
      setStatusMsg(`Downloaded expenses Excel for "${card.name}"`);
      setTimeout(() => setStatusMsg(""), 3500);
    } catch (err) {
      setErrorMsg(`Failed to download spreadsheet for ${card.name}`);
      setTimeout(() => setErrorMsg(""), 3500);
    } finally {
      setExportingCardId(null);
    }
  };

  // Filtered expenses for 'All' table view
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      if (item.isCancelled) return false;
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
    return expenses.reduce((sum, item) => {
      if (item.isCancelled) return sum;
      return sum + (Number(item.amount) || 0);
    }, 0);
  }, [expenses]);

  const generalSpent = useMemo(() => {
    return expenses
      .filter((x) => !x.isCancelled && !x.eventId && !x.event?._id && !x.event?.id && !x.eventTag)
      .reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  }, [expenses]);

  const eventsSpent = useMemo(() => {
    return expenses
      .filter((x) => !x.isCancelled && (x.category === "events" || x.eventId || x.eventTag))
      .reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  }, [expenses]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-6">
      {/* Toast notifications */}
      {statusMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 p-4 text-emerald-800 text-sm font-medium shadow-sm">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200/80 p-4 text-red-800 text-sm font-medium shadow-sm">
          <span className="material-symbols-outlined text-red-600">error</span>
          {errorMsg}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[30px]">payments</span>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">
              Society Expenses & Event Accounts
            </h1>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Select an event or fund tag to view its itemized vouchers and download per-event Excel spreadsheets.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle Pill */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-black/[0.04]">
            <button
              onClick={() => setViewMode("events")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "events"
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              By Event Cards
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "all"
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">table_rows</span>
              All Expenses Table
            </button>
          </div>

          <button
            onClick={handleExportAllExcel}
            disabled={exportingAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors shadow-sm disabled:opacity-50"
            title="Download full society treasury expense report"
          >
            <span className="material-symbols-outlined text-[17px]">
              {exportingAll ? "hourglass_top" : "download"}
            </span>
            {exportingAll ? "Exporting..." : "Export All Excel"}
          </button>

          <Link
            to="/wallet"
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3.5 py-2 text-xs font-semibold text-primary hover:bg-surface-container transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[17px]">account_balance_wallet</span>
            View Wallet
          </Link>

          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary/95 transition-all shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[17px]">add</span>
              Record Expense
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Total Spending
            </span>
            <span className="material-symbols-outlined text-rose-600 bg-rose-50 p-2 rounded-xl text-[20px]">
              trending_down
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-on-surface">{formatAmount(totalSpent)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Across {expenses.filter((e) => !e.isCancelled).length} recorded vouchers
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              General Operations
            </span>
            <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-2 rounded-xl text-[20px]">
              domain
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-on-surface">{formatAmount(generalSpent)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Electricity, security, repairs</p>
        </div>

        <div className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Events & Festivals
            </span>
            <span className="material-symbols-outlined text-purple-600 bg-purple-50 p-2 rounded-xl text-[20px]">
              celebration
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-on-surface">{formatAmount(eventsSpent)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Festivals, sports & gatherings</p>
        </div>

        <div className="rounded-2xl border border-black/[0.05] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Event Accounts
            </span>
            <span className="material-symbols-outlined text-amber-600 bg-amber-50 p-2 rounded-xl text-[20px]">
              folder_open
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-on-surface">{eventCards.length} Funds</p>
          <p className="mt-1 text-xs text-on-surface-variant">Select any fund below to view</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              viewMode === "events"
                ? "Search event names, festivals, operations..."
                : "Search expenses by title, vendor, notes..."
            }
            className="w-full rounded-xl border border-outline-variant bg-surface py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
          />
        </div>

        {viewMode === "all" && events.length > 0 && (
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

      {/* ========================================================================= */}
      {/* MODE 1: BY EVENT / FUND CARDS VIEW (DEFAULT - MATCHES MOBILE APP)         */}
      {/* ========================================================================= */}
      {viewMode === "events" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">category</span>
              Select an Event / Fund to View Expenses
            </h2>
            <span className="text-xs text-on-surface-variant">
              {eventCards.length} event fund cards available
            </span>
          </div>

          {loadingExpenses ? (
            <div className="rounded-2xl border border-black/[0.05] bg-white py-16 text-center text-on-surface-variant shadow-sm">
              <span className="material-symbols-outlined animate-spin text-[32px] text-primary">
                progress_activity
              </span>
              <p className="mt-2 text-sm">Loading event accounts...</p>
            </div>
          ) : eventCards.length === 0 ? (
            <div className="rounded-2xl border border-black/[0.05] bg-white py-16 text-center text-on-surface-variant shadow-sm">
              <span className="material-symbols-outlined text-[44px] text-outline">folder_off</span>
              <h3 className="mt-2 text-base font-semibold text-on-surface">No matching events</h3>
              <p className="mt-1 text-sm">Try clearing your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {eventCards.map((card) => {
                const isCardExporting = exportingCardId === card.id;
                const isGeneral = card.isGeneral;
                const linkTarget = isGeneral
                  ? "/expenses/events/general"
                  : `/expenses/events/${card.id}`;

                return (
                  <div
                    key={card.id}
                    className="group flex flex-col justify-between rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5"
                  >
                    <div>
                      {/* Top Row: Icon + Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner ${
                            isGeneral
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[24px]">
                            {isGeneral ? "domain" : "celebration"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-slate-700">
                            {card.category || "event"}
                          </span>
                          {card.status && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-emerald-700">
                              {card.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Title & Subtitle */}
                      <div className="mt-3.5">
                        <Link
                          to={linkTarget}
                          className="text-base font-bold text-on-surface hover:text-primary transition-colors group-hover:text-primary"
                        >
                          {card.name}
                        </Link>
                        <p className="mt-1 text-xs text-on-surface-variant line-clamp-2">
                          {card.subtitle ||
                            `View and download ${card.name} expenses, bills, and payment vouchers.`}
                        </p>
                      </div>

                      {/* Financial Metrics */}
                      <div className="mt-4 rounded-xl bg-slate-50/80 p-3 flex items-center justify-between border border-black/[0.03]">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                            Total Spent
                          </span>
                          <p className="text-lg font-bold text-rose-700 leading-tight">
                            {formatAmount(card.total)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                            Vouchers
                          </span>
                          <p className="text-xs font-semibold text-on-surface leading-tight">
                            {card.count} {card.count === 1 ? "entry" : "entries"}
                          </p>
                        </div>
                      </div>

                      {/* Budget Indicator if applicable */}
                      {card.budget > 0 && (
                        <div className="mt-2.5 space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
                            <span>Budget: {formatAmount(card.budget)}</span>
                            <span>{Math.round((card.total / card.budget) * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                card.total > card.budget ? "bg-rose-600" : "bg-emerald-600"
                              }`}
                              style={{
                                width: `${Math.min(100, Math.round((card.total / card.budget) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-5 pt-3.5 border-t border-black/[0.05] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleDownloadCardExcel(card)}
                        disabled={isCardExporting || card.count === 0}
                        title={`Download Excel spreadsheet only for ${card.name}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[16px] text-emerald-700">
                          {isCardExporting ? "hourglass_top" : "download"}
                        </span>
                        {isCardExporting ? "Exporting..." : "Download Excel"}
                      </button>

                      <Link
                        to={linkTarget}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                      >
                        View Items
                        <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: ALL SOCIETY EXPENSES TABLE VIEW                                   */}
      {/* ========================================================================= */}
      {viewMode === "all" && (
        <div className="space-y-4">
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

          {/* Expenses Table */}
          <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
            {loadingExpenses ? (
              <div className="py-16 text-center text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[32px] text-primary">
                  progress_activity
                </span>
                <p className="mt-2 text-sm">Loading expense ledger...</p>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="py-16 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[44px] text-outline">
                  receipt_long
                </span>
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
                  <thead className="border-b border-black/[0.06] bg-[#FAFBF9] text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
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
                  <tbody className="divide-y divide-black/[0.05]">
                    {filteredExpenses.map((exp) => {
                      const meta = getExpenseCategoryMeta(exp.category);
                      const linkedEvent = events.find(
                        (e) =>
                          (e._id || e.id) ===
                          (exp.eventId || exp.event?._id || exp.event?.id)
                      );
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
                            {linkedEvent ? (
                              <Link
                                to={`/expenses/events/${linkedEvent._id || linkedEvent.id}`}
                                className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded px-1.5 py-0.5"
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  celebration
                                </span>
                                {linkedEvent.name || linkedEvent.title}
                              </Link>
                            ) : null}
                            {exp.notes ? (
                              <div className="mt-0.5 text-xs text-on-surface-variant truncate max-w-xs">
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
                                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface px-2 py-1 text-xs text-primary hover:bg-surface-container font-medium"
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
                                  <span className="material-symbols-outlined text-[18px]">
                                    delete
                                  </span>
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
        </div>
      )}

      {/* Record / Edit Expense Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-w-lg w-full rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <h3 className="text-base font-bold text-on-surface">
                {editingExpense ? "Edit Expense Voucher" : "Record New Expense"}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Expense Title / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lift AMC maintenance, Electric bill"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 15000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Date *
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
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
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Payment Method
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Tag to Specific Event / Function (Optional)
                </label>
                <select
                  value={form.eventId}
                  onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="">General Society Operations (No specific event)</option>
                  {events.map((evt) => (
                    <option key={evt._id || evt.id} value={evt._id || evt.id}>
                      🎉 {evt.name || evt.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Vendor / Payee Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Otis Elevators Pvt Ltd"
                  value={form.vendorName}
                  onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Bill / Voucher Receipt Image
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="text-xs text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:bg-primary/90"
                  />
                  {uploadingReceipt && (
                    <span className="text-xs text-primary animate-pulse">Uploading...</span>
                  )}
                </div>
                {form.receiptUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Bill attached successfully
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Notes / Reference Number
                </label>
                <textarea
                  rows={2}
                  placeholder="Invoice #, cheque number, or transaction notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06]">
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
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saving..." : editingExpense ? "Update Expense" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-w-md w-full rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600">warning</span>
              Confirm Expense Cancellation
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Are you sure you want to cancel this expense voucher? This action will be recorded in the transparency audit log.
            </p>
            <div className="mt-3">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Reason for cancellation *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Duplicate entry, incorrect vendor amount"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Keep Expense
              </button>
              <button
                onClick={() =>
                  deleteMutation.mutate({
                    id: deleteConfirmId,
                    reason: deleteReason || "Cancelled by committee admin",
                  })
                }
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Cancelling..." : "Cancel Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Preview Modal */}
      {receiptPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-w-2xl w-full rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
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
