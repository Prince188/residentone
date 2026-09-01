import api from "./api";

export const getNotices = (limit) =>
  api.get("/notices", { params: limit ? { limit } : {} });
export const createNotice = (payload) => api.post("/notices", payload);
export const updateNotice = (id, payload) => api.patch(`/notices/${id}`, payload);
export const deleteNotice = (id) => api.delete(`/notices/${id}`);

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || fallback;
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
