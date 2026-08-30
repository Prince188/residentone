import api from "./api";

export const getBadges = () => api.get("/dashboard/badges");
export const markSeen = (feature) => api.post("/dashboard/badges/seen", { feature });
export const markSeenBulk = (features) => api.post("/dashboard/badges/seen", { features });
export const markAllSeen = () => api.post("/dashboard/badges/seen-all");

export const PATH_TO_FEATURE = {
  "/complaints": "complaints",
  "/complaints/new": "complaints",
  "/polls": "polls",
  "/polls/new": "polls",
  "/surveys": "surveys",
  "/surveys/new": "surveys",
};

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || fallback;
}
