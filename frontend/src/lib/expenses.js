import api from "./api";

export function extractApiError(error, fallback = "Operation failed") {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export async function getExpenses(params = {}) {
  const r = await api.get("/expenses", { params });
  return r.data?.data ?? r.data;
}

export async function createExpense(payload) {
  const r = await api.post("/expenses", payload);
  return r.data?.data ?? r.data;
}

export async function updateExpense(id, payload) {
  const r = await api.patch(`/expenses/${id}`, payload);
  return r.data?.data ?? r.data;
}

export async function deleteExpense(id, reason) {
  const r = await api.delete(`/expenses/${id}`, { data: { reason } });
  return r.data?.data ?? r.data;
}

export async function getWalletSummary() {
  const r = await api.get("/wallet/summary");
  return r.data?.data ?? r.data;
}

export async function exportWalletExcel() {
  return api.get("/wallet/export-excel", { responseType: "blob" });
}

export async function exportExpensesExcel(params = {}) {
  return api.get("/expenses/export-excel", { params, responseType: "blob" });
}

export function downloadClientExpenseCsv({ eventName = "Event", expenses = [], societyName = "Society" }) {
  const sanitize = (val) => {
    if (val == null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = [
    [`RESIDENTONE - EXPENSE STATEMENT`],
    [`Society:`, societyName],
    [`Event / Fund Tag:`, eventName],
    [`Generated On:`, new Date().toLocaleString("en-IN")],
    [],
    [`S.No`, `Date`, `Expense Title`, `Category`, `Vendor / Payee`, `Payment Mode`, `Amount (INR)`, `Bill Attached`, `Notes`],
  ];

  let totalAmount = 0;
  expenses.forEach((item, index) => {
    const amt = Number(item.amount) || 0;
    totalAmount += amt;
    const cat = (item.category || "others").replace(/_/g, " ").toUpperCase();
    const dateStr = item.date || item.expenseDate ? new Date(item.date || item.expenseDate).toLocaleDateString("en-IN") : "—";
    const hasBill = item.receiptUrl || item.billUrl ? "Yes" : "No";
    rows.push([
      index + 1,
      dateStr,
      item.title || item.description || "—",
      cat,
      item.vendorName || item.payee || "—",
      (item.paymentMethod || item.paymentMode || "cash").replace(/_/g, " ").toUpperCase(),
      amt.toFixed(2),
      hasBill,
      item.notes || "",
    ]);
  });

  rows.push([]);
  rows.push([`TOTAL`, ``, ``, ``, ``, `${expenses.length} Vouchers`, totalAmount.toFixed(2), ``, ``]);

  const csvContent = "\uFEFF" + rows.map((r) => r.map(sanitize).join(",")).join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const cleanName = eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
  link.setAttribute("href", url);
  link.setAttribute("download", `${cleanName}_Expenses_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatAmount(val) {
  return `₹${Number(val || 0).toLocaleString("en-IN")}`;
}

export function formatDate(val) {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export const EXPENSE_CATEGORIES = [
  { id: "utilities", label: "Utilities", icon: "bolt", bg: "bg-amber-100", text: "text-amber-800" },
  { id: "salaries", label: "Staff Salaries", icon: "badge", bg: "bg-sky-100", text: "text-sky-800" },
  { id: "repairs_amc", label: "Repairs & AMC", icon: "build", bg: "bg-red-100", text: "text-red-800" },
  { id: "events", label: "Events & Functions", icon: "celebration", bg: "bg-purple-100", text: "text-purple-800" },
  { id: "office_supplies", label: "Office & Supplies", icon: "inventory_2", bg: "bg-emerald-100", text: "text-emerald-800" },
  { id: "others", label: "General & Others", icon: "payments", bg: "bg-slate-100", text: "text-slate-800" },
];

export function getExpenseCategoryMeta(category = "others") {
  const found = EXPENSE_CATEGORIES.find((c) => c.id === category);
  return found || { id: "others", label: "General Expense", icon: "payments", bg: "bg-slate-100", text: "text-slate-800" };
}
