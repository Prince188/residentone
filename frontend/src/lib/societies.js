import api from "./api";

export const registerSociety = (payload) => api.post("/societies/register", payload);
export const listSocieties = (params) => api.get("/societies", { params });
export const getSocietyStats = () => api.get("/societies/stats");
export const getSociety = (id) => api.get(`/societies/${id}`);
export const createSocietyManually = (payload) => api.post("/societies", payload);
export const approveSociety = (id) => api.patch(`/societies/${id}/approve`);
export const rejectSociety = (id, reason) =>
  api.patch(`/societies/${id}/reject`, { reason });
export const suspendSociety = (id) => api.patch(`/societies/${id}/suspend`);
export const activateSociety = (id) => api.patch(`/societies/${id}/activate`);
export const archiveSociety = (id) => api.patch(`/societies/${id}/archive`);
export const unarchiveSociety = (id) => api.patch(`/societies/${id}/unarchive`);
export const deleteSocietyPermanently = (id) => api.delete(`/societies/${id}/permanent`);

export const getHistoricalAnalytics = (params) => api.get("/societies/analytics", { params });
export const updateSociety = (id, payload) => api.patch(`/societies/${id}`, payload);
export const paySocietySubscription = (id, payload) => api.post(`/societies/${id}/pay-subscription`, payload);

export const SOCIETY_STATUS_LABELS = {
  pending: "Pending",
  active: "Active",
  trial: "Trial",
  rejected: "Rejected",
  suspended: "Suspended",
  churned: "Churned",
  archived: "Archived",
};

export const SUBSCRIPTION_PLAN_LABELS = {
  starter: "Basic",
  professional: "Standard",
  enterprise: "Premium",
};

export const SUBSCRIPTION_PLAN_RATES = {
  starter: 6,
  professional: 10,
  enterprise: 15,
};

export const SOCIETY_TYPE_LABELS = {
  apartment: "Apartment",
  row_house: "Row House",
  mixed: "Mixed",
};

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || fallback;
}

export function extractFieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  const map = {};
  for (const d of details) {
    if (d.field && !map[d.field]) map[d.field] = d.message;
  }
  return map;
}
