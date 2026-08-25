import api from "./api";

export const getSocietyDirectory = () => api.get("/memberships/directory");

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || fallback;
}
