import api from "./api";

export const getSocietyDirectory = (params) => api.get("/memberships/directory", { params });

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || fallback;
}
