import api from "./api";

export const getComplaints = (params = {}) => api.get("/complaints", { params });
export const getComplaint = (id) => api.get(`/complaints/${id}`);
export const createComplaint = (payload) => api.post("/complaints", payload);
export const updateComplaintStatus = (id, status) =>
  api.patch(`/complaints/${id}/status`, { status });
export const assignComplaint = (id, assignedTo) =>
  api.patch(`/complaints/${id}/assign`, { assignedTo });
export const getComplaintStats = () => api.get("/complaints/stats");

export const CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "security", label: "Security" },
  { value: "common_area", label: "Common Area" },
  { value: "parking", label: "Parking" },
  { value: "other", label: "Other" },
];

export const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-slate-100 text-slate-700" },
  { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800" },
];

export const STATUSES = [
  "open",
  "in_progress",
  "on_hold",
  "resolved",
  "closed",
  "reopened",
];

export const STATUS_UI = {
  open: {
    label: "Open",
    pill: "bg-slate-100 text-slate-800",
    stripe: "bg-slate-400",
    card: "border-outline-variant bg-surface-container-lowest",
    icon: "radio_button_unchecked",
  },
  in_progress: {
    label: "In Progress",
    pill: "bg-amber-100 text-amber-800",
    stripe: "bg-amber-500",
    card: "border-amber-200 bg-amber-50",
    icon: "hourglass_top",
  },
  on_hold: {
    label: "On Hold",
    pill: "bg-zinc-100 text-zinc-700",
    stripe: "bg-zinc-400",
    card: "border-zinc-200 bg-zinc-50",
    icon: "pause_circle",
  },
  resolved: {
    label: "Resolved",
    pill: "bg-emerald-100 text-emerald-800",
    stripe: "bg-emerald-500",
    card: "border-emerald-200 bg-emerald-50",
    icon: "check_circle",
  },
  closed: {
    label: "Closed",
    pill: "bg-neutral-100 text-neutral-600",
    stripe: "bg-neutral-400",
    card: "border-neutral-200 bg-neutral-50",
    icon: "task_alt",
  },
  reopened: {
    label: "Reopened",
    pill: "bg-red-100 text-red-800",
    stripe: "bg-red-500",
    card: "border-red-200 bg-red-50",
    icon: "restart_alt",
  },
};

export function extractApiError(error, fallback) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.error?.details?.[0]?.message ||
    fallback
  );
}

export function timeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
