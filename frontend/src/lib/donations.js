import api from "./api";

export function extractApiError(error, fallback = "Operation failed") {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export function extractDonationList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data?.data)) return raw.data.data;
  if (Array.isArray(raw.data?.items)) return raw.data.items;
  if (Array.isArray(raw.data?.donations)) return raw.data.donations;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.donations)) return raw.donations;
  return [];
}

export const getDonations = async (params = {}) => {
  const res = await api.get("/donations", { params });
  return {
    ...res,
    data: extractDonationList(res?.data),
    pagination: res?.data?.pagination,
  };
};

export const getMyDonations = async (params = {}) => {
  const res = await api.get("/donations/my", { params });
  return {
    ...res,
    data: extractDonationList(res?.data),
    pagination: res?.data?.pagination,
  };
};

export const createDonation = (payload) => api.post("/donations", payload);
export const cancelDonation = (id, reason) => api.post(`/donations/${id}/cancel`, { reason });
export const getDonationReceipt = (id) => api.get(`/donations/${id}/receipt`);
export const exportDonationsExcel = (params = {}) =>
  api.get("/donations/export", { responseType: "blob", params });

export function formatAmount(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export const DONATION_PURPOSES = [
  { id: "ganesh_utsav", label: "Ganesh Utsav" },
  { id: "navratri", label: "Navratri" },
  { id: "diwali", label: "Diwali Celebration" },
  { id: "temple_maintenance", label: "Temple Maintenance" },
  { id: "security_fund", label: "Guard Welfare Fund" },
  { id: "charity", label: "Charity & Relief" },
  { id: "others", label: "General Donation" },
];
