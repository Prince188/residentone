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
export const getPlatformMaintenanceAnalytics = (params) =>
  api.get("/societies/maintenance-analytics", { params });
export const getPlatformCollectionsAnalytics = (params) =>
  api.get("/societies/collections-analytics", { params });
export const updateSociety = (id, payload) => api.patch(`/societies/${id}`, payload);
export const createSubscriptionOrder = (id, payload) =>
  api.post(`/societies/${id}/subscription/order`, payload);
export const paySocietySubscription = (id, payload) =>
  api.post(`/societies/${id}/pay-subscription`, payload);
export const uploadSocietyLogo = (payload) => {
  if (typeof FormData !== "undefined" && payload instanceof FormData) {
    return api.post("/societies/upload-logo", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
  return api.post("/societies/upload-logo", payload);
};

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
  standard: "All-in-One",
  standard_semi_annual: "6 Months Plan",
  standard_yearly: "12 Months Plan",
  starter: "Basic",
  professional: "Standard",
  enterprise: "Premium",
};

export const SUBSCRIPTION_PLAN_RATES = {
  standard: 2,
  starter: 6,
  professional: 10,
  enterprise: 15,
};

export const BILLING_DURATIONS = [
  {
    id: "semi_annual",
    name: "6 Months",
    subTitle: "Semi-Annual access",
    months: 6,
    basePrice: 2100,
    perMonthRate: 350,
    badge: null,
  },
  {
    id: "yearly",
    name: "12 Months",
    subTitle: "Annual uninterrupted",
    months: 12,
    basePrice: 4000,
    perMonthRate: 333,
    badge: "SAVE ₹200",
    popular: true,
  },
];

export function calculateSocietySubscriptionAmount(unitsCount = 1, billingCycle = "yearly") {
  const units = Math.max(1, Number(unitsCount) || 1);
  const isSemiAnnual = ["semi_annual", "half_yearly", "6months"].includes(billingCycle);
  const months = isSemiAnnual ? 6 : 12;
  const basePrice = isSemiAnnual ? 2100 : 4000;
  const baseUnitsIncluded = 200;
  const extraUnits = Math.max(0, units - baseUnitsIncluded);
  const overageRatePerUnitMonth = 2;
  const overageAmount = extraUnits * overageRatePerUnitMonth * months;
  const totalBase = basePrice + overageAmount;

  return {
    isSemiAnnual,
    months,
    basePrice,
    baseUnitsIncluded,
    units,
    extraUnits,
    overageRatePerUnitMonth,
    overageAmount,
    totalBase,
    monthlyRateEffective: Math.round(totalBase / months),
  };
}

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
