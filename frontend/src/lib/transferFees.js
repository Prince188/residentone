import api from "./api";

export function extractApiError(error, fallback = "Operation failed") {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export function extractTransferFeeList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data?.data)) return raw.data.data;
  if (Array.isArray(raw.data?.transferFees)) return raw.data.transferFees;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.transferFees)) return raw.transferFees;
  return [];
}

export const getTransferFees = async (params = {}) => {
  const res = await api.get("/transfer-fees", { params });
  return {
    ...res,
    data: extractTransferFeeList(res?.data),
  };
};

export const getMyTransferFees = async (params = {}) => {
  const res = await api.get("/transfer-fees/my", { params });
  return {
    ...res,
    data: extractTransferFeeList(res?.data),
  };
};

export const createTransferFee = (payload) => api.post("/transfer-fees", payload);
export const cancelTransferFee = (id, reason) => api.post(`/transfer-fees/${id}/cancel`, { reason });
export const getTransferFeeReceipt = (id) => api.get(`/transfer-fees/${id}/receipt`);
export const exportTransferFeesExcel = (params = {}) =>
  api.get("/transfer-fees/export", { params, responseType: "blob" });

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
