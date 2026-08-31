import api from "./api";

export const DOCUMENT_CATEGORIES = [
  { value: "bill", label: "Bill", icon: "receipt_long" },
  { value: "collection", label: "Collection", icon: "volunteer_activism" },
  { value: "expense", label: "Expense", icon: "payments" },
  { value: "navratri", label: "Navratri", icon: "celebration" },
  { value: "other", label: "Other", icon: "folder_open" },
];

export const getDocuments = (params = {}) => api.get("/documents", { params });
export const uploadDocument = (formData) =>
  api.post("/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const downloadDocument = (id) =>
  api.get(`/documents/${id}/download`, { responseType: "blob" });
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || error?.response?.data?.message || fallback;
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
