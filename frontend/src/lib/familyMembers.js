import api from "./api";
export const getFamilyMembers = (params) => api.get("/family-members", { params });
export const addFamilyMember = (payload) => api.post("/family-members", payload);
export const updateFamilyMember = (id, payload) => api.patch(`/family-members/${id}`, payload);
export const removeFamilyMember = (id) => api.delete(`/family-members/${id}`);
export function extractApiError(e, fallback) {
  return e?.response?.data?.error?.message || fallback;
}
