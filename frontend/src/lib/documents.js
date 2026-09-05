import api from "./api";

export const DOCUMENT_CATEGORIES = [
  {
    value: "bill",
    label: "Bills",
    icon: "receipt_long",
    pill: "bg-blue-50 text-blue-700 border-blue-200/60",
    stripe: "bg-blue-500",
    iconBg: "bg-blue-100 text-blue-700",
  },
  {
    value: "collection",
    label: "Collections",
    icon: "volunteer_activism",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    stripe: "bg-emerald-500",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "expense",
    label: "Expenses",
    icon: "payments",
    pill: "bg-amber-50 text-amber-700 border-amber-200/60",
    stripe: "bg-amber-500",
    iconBg: "bg-amber-100 text-amber-700",
  },
  {
    value: "navratri",
    label: "Navratri",
    icon: "celebration",
    pill: "bg-purple-50 text-purple-700 border-purple-200/60",
    stripe: "bg-purple-500",
    iconBg: "bg-purple-100 text-purple-700",
  },
  {
    value: "other",
    label: "General / Other",
    icon: "folder_open",
    pill: "bg-zinc-100 text-zinc-700 border-zinc-200/60",
    stripe: "bg-zinc-400",
    iconBg: "bg-zinc-100 text-zinc-700",
  },
];

export function getFileTypeMeta(fileType, fileName = "") {
  const ext = fileName?.toLowerCase().split(".").pop() || "";
  const isPdf = fileType === "application/pdf" || ext === "pdf";
  const isImage = fileType?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

  if (isPdf) {
    return {
      typeLabel: "PDF",
      icon: "picture_as_pdf",
      iconBox: "bg-red-500/10 text-red-600 border border-red-200/60",
      badge: "bg-red-50 text-red-700 border border-red-200/70",
    };
  }
  if (isImage) {
    return {
      typeLabel: ext.toUpperCase() || "IMAGE",
      icon: "image",
      iconBox: "bg-sky-500/10 text-sky-600 border border-sky-200/60",
      badge: "bg-sky-50 text-sky-700 border border-sky-200/70",
    };
  }
  return {
    typeLabel: ext ? ext.toUpperCase() : "FILE",
    icon: "description",
    iconBox: "bg-primary/10 text-primary border border-primary/20",
    badge: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
  };
}

export const getDocuments = (params = {}) => api.get("/documents", { params });
export const uploadDocument = (formData) =>
  api.post("/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const downloadDocument = (id) =>
  api.get(`/documents/${id}/download`, { responseType: "blob" });
export const updateDocument = (id, payload) => api.patch(`/documents/${id}`, payload);
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
