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
