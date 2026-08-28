import api from "./api";
export const getFamilyMembers = () => api.get("/family-members");
export const addFamilyMember = (payload) => api.post("/family-members", payload);
export const removeFamilyMember = (id) => api.delete(`/family-members/${id}`);
export function extractApiError(e, fallback) {
  return e?.response?.data?.error?.message || fallback;
}
