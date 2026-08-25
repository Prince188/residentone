import api from "./api";

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const getCycles = () => api.get("/maintenance/cycles");
export const getLatestCycle = () => api.get("/maintenance/cycles/latest");
export const getCycleUnits = (cycleId) =>
  api.get(`/maintenance/cycles/${cycleId}/units`);
export const getCycleUnitDetail = (cycleId, unitId) =>
  api.get(`/maintenance/cycles/${cycleId}/units/${unitId}`);
export const getUnitHistory = (unitId) =>
  api.get(`/maintenance/units/${unitId}/history`);
export const createCycle = (payload) => api.post("/maintenance/cycles", payload);
export const recordPayment = (cycleId, unitId, payload) =>
  api.post(`/maintenance/cycles/${cycleId}/units/${unitId}/pay`, payload);
export const removePayment = (cycleId, unitId) =>
  api.post(`/maintenance/cycles/${cycleId}/units/${unitId}/unpay`);

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || fallback;
}

export function formatAmount(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Shared status → UI classes (cards, pills)
export const STATUS_UI = {
  paid: {
    label: "Paid",
    card: "border-emerald-200 bg-emerald-50",
    stripe: "bg-emerald-500",
    iconBox: "bg-emerald-100 text-emerald-700",
    pill: "bg-emerald-100 text-emerald-800",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: "check_circle",
    colorClass: "text-emerald-700",
  },
  pending: {
    label: "Pending",
    card: "border-amber-200 bg-amber-50",
    stripe: "bg-amber-500",
    iconBox: "bg-amber-100 text-amber-700",
    pill: "bg-amber-100 text-amber-800",
    chip: "bg-amber-50 text-amber-800 border-amber-200",
    icon: "schedule",
    colorClass: "text-amber-700",
  },
  overdue: {
    label: "Overdue",
    card: "border-red-200 bg-red-50",
    stripe: "bg-red-500",
    iconBox: "bg-red-100 text-red-700",
    pill: "bg-red-100 text-red-800",
    chip: "bg-red-50 text-red-800 border-red-200",
    icon: "error",
    colorClass: "text-red-700",
  },
  late_paid: {
    label: "Late Paid",
    card: "border-violet-200 bg-violet-50",
    stripe: "bg-violet-500",
    iconBox: "bg-violet-100 text-violet-700",
    pill: "bg-violet-100 text-violet-800",
    chip: "bg-violet-50 text-violet-800 border-violet-200",
    icon: "history_toggle_off",
    colorClass: "text-violet-700",
  },
};

export function periodLabel(month, year) {
  return `${MONTHS[month - 1] || month} ${year}`;
}
