import api from "./api";

export const COLLECTION_CATEGORIES = [
  { value: "festival", label: "Festival", icon: "celebration" },
  { value: "event", label: "Event", icon: "event" },
  { value: "celebration", label: "Celebration", icon: "cake" },
  { value: "repair", label: "Repair", icon: "build" },
  { value: "welfare", label: "Welfare", icon: "volunteer_activism" },
  { value: "other", label: "Other", icon: "payments" },
];

export const getCollections = () => api.get("/collections");
export const getCollection = (id) => api.get(`/collections/${id}`);
export const createCollection = (payload) => api.post("/collections", payload);
export const updateCollection = (id, payload) => api.patch(`/collections/${id}`, payload);
export const closeCollection = (id) => api.post(`/collections/${id}/close`);
export const deleteCollection = (id) => api.delete(`/collections/${id}`);
export const getCollectionUnits = (id) => api.get(`/collections/${id}/units`);
export const getCollectionUnitDetail = (collectionId, unitId) => api.get(`/collections/${collectionId}/units/${unitId}`);
export const recordCollectionPayment = (collectionId, unitId, payload) => api.post(`/collections/${collectionId}/units/${unitId}/pay`, payload);
export const removeCollectionPayment = (collectionId, unitId) => api.post(`/collections/${collectionId}/units/${unitId}/unpay`);
export const createRazorpayOrder = (collectionId, unitId) => api.post(`/collections/${collectionId}/units/${unitId}/create-order`);
export const verifyRazorpayPayment = (collectionId, unitId, payload) => api.post(`/collections/${collectionId}/units/${unitId}/verify`, payload);
export const exportCollectionExcel = (id) => api.get(`/collections/${id}/export`, { responseType: "blob" });
export const getCollectionReceipt = (collectionId, unitId) => api.get(`/collections/${collectionId}/units/${unitId}/receipt`);

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || error?.response?.data?.message || fallback;
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

export const CATEGORY_UI = {
  festival: { label: "Festival", pill: "bg-pink-100 text-pink-800", icon: "celebration" },
  event: { label: "Event", pill: "bg-violet-100 text-violet-800", icon: "event" },
  celebration: { label: "Celebration", pill: "bg-amber-100 text-amber-800", icon: "cake" },
  repair: { label: "Repair", pill: "bg-slate-100 text-slate-700", icon: "build" },
  welfare: { label: "Welfare", pill: "bg-emerald-100 text-emerald-800", icon: "volunteer_activism" },
  other: { label: "Other", pill: "bg-zinc-100 text-zinc-700", icon: "payments" },
};

export const STATUS_UI = {
  active: { label: "Active", card: "border-outline-variant bg-surface-container-lowest", pill: "bg-emerald-100 text-emerald-800", stripe: "bg-emerald-500", iconBox: "bg-emerald-100 text-emerald-700", icon: "schedule" },
  closed: { label: "Closed", card: "border-outline-variant bg-surface-container-lowest", pill: "bg-zinc-100 text-zinc-700", stripe: "bg-zinc-400", iconBox: "bg-zinc-100 text-zinc-700", icon: "task_alt" },
  pending: { label: "Pending", card: "border-amber-200 bg-amber-50", pill: "bg-amber-100 text-amber-800", stripe: "bg-amber-500", iconBox: "bg-amber-100 text-amber-700", icon: "schedule" },
  overdue: { label: "Overdue", card: "border-red-200 bg-red-50", pill: "bg-red-100 text-red-800", stripe: "bg-red-500", iconBox: "bg-red-100 text-red-700", icon: "error" },
  paid: { label: "Paid", card: "border-emerald-200 bg-emerald-50", pill: "bg-emerald-100 text-emerald-800", stripe: "bg-emerald-500", iconBox: "bg-emerald-100 text-emerald-700", icon: "check_circle" },
  late_paid: { label: "Late Paid", card: "border-violet-200 bg-violet-50", pill: "bg-violet-100 text-violet-800", stripe: "bg-violet-500", iconBox: "bg-violet-100 text-violet-700", icon: "history_toggle_off" },
};
