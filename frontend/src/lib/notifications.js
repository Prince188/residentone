import api from "./api";

export async function getNotifications(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append("page", String(params.page));
  if (params.limit) query.append("limit", String(params.limit));
  if (params.unreadOnly !== undefined && params.unreadOnly !== null) {
    query.append("unreadOnly", String(params.unreadOnly));
  }
  if (params.type && params.type !== "all") query.append("type", params.type);
  if (params.search) query.append("search", params.search.trim());

  const qs = query.toString();
  return api.get(`/notifications${qs ? `?${qs}` : ""}`);
}

export async function getUnreadNotificationCount() {
  return api.get("/notifications/unread-count");
}

export async function markNotificationAsRead(id) {
  return api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead() {
  return api.patch("/notifications/read-all");
}

export async function deleteNotification(id) {
  return api.delete(`/notifications/${id}`);
}

export async function clearAllNotifications(readOnly = false) {
  return api.delete(`/notifications/clear-all?readOnly=${readOnly}`);
}

export const NOTIFICATION_TYPE_CONFIG = {
  notice: {
    label: "Notice",
    icon: "campaign",
    colorClass: "bg-sky-100 text-sky-700 border-sky-200",
    iconBg: "bg-sky-50 text-sky-600",
  },
  maintenance: {
    label: "Maintenance",
    icon: "receipt_long",
    colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    iconBg: "bg-emerald-50 text-emerald-600",
  },
  collection: {
    label: "Collection",
    icon: "celebration",
    colorClass: "bg-amber-100 text-amber-800 border-amber-200",
    iconBg: "bg-amber-50 text-amber-600",
  },
  complaint: {
    label: "Complaint",
    icon: "handyman",
    colorClass: "bg-rose-100 text-rose-700 border-rose-200",
    iconBg: "bg-rose-50 text-rose-600",
  },
  amenity: {
    label: "Amenity",
    icon: "pool",
    colorClass: "bg-indigo-100 text-indigo-700 border-indigo-200",
    iconBg: "bg-indigo-50 text-indigo-600",
  },
  poll: {
    label: "Poll",
    icon: "how_to_vote",
    colorClass: "bg-purple-100 text-purple-700 border-purple-200",
    iconBg: "bg-purple-50 text-purple-600",
  },
  survey: {
    label: "Survey",
    icon: "quiz",
    colorClass: "bg-teal-100 text-teal-700 border-teal-200",
    iconBg: "bg-teal-50 text-teal-600",
  },
  visitor: {
    label: "Visitor",
    icon: "badge",
    colorClass: "bg-blue-100 text-blue-700 border-blue-200",
    iconBg: "bg-blue-50 text-blue-600",
  },
  chat: {
    label: "Chat",
    icon: "chat",
    colorClass: "bg-violet-100 text-violet-700 border-violet-200",
    iconBg: "bg-violet-50 text-violet-600",
  },
  emergency: {
    label: "Emergency",
    icon: "emergency",
    colorClass: "bg-red-100 text-red-700 border-red-200",
    iconBg: "bg-red-50 text-red-600",
  },
  system: {
    label: "Alert",
    icon: "notifications",
    colorClass: "bg-slate-100 text-slate-700 border-slate-200",
    iconBg: "bg-slate-50 text-slate-600",
  },
};

export function getNotificationTypeConfig(type) {
  return NOTIFICATION_TYPE_CONFIG[type] || NOTIFICATION_TYPE_CONFIG.system;
}

export function formatTimeAgo(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 45) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function extractApiError(err, fallback = "Something went wrong") {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
}
