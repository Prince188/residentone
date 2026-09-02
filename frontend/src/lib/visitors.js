import api from "./api";

export const getVisitors = (params) => api.get("/visitors", { params });
export const getVisitorStats = () => api.get("/visitors/stats");
export const preApproveVisitor = (payload) => api.post("/visitors/pre-approve", payload);
export const logWalkInVisitor = (payload) => api.post("/visitors/walk-in", payload);
export const verifyPasscode = (passcode) => api.post("/visitors/verify-code", { passcode });
export const checkInVisitor = (id) => api.post(`/visitors/${id}/check-in`);
export const checkOutVisitor = (id, notes) => api.post(`/visitors/${id}/check-out`, { notes });
export const respondVisitorApproval = (id, action) => api.post(`/visitors/${id}/respond`, { action });
export const cancelVisitorPass = (id) => api.delete(`/visitors/${id}`);
export const getPublicVisitorPass = (id) => api.get(`/visitors/pass/${id}/public`);

export function extractApiError(err, fallback = "Operation failed") {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
}
