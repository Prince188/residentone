import api from "./api";

export const getVisitors = (params) => api.get("/visitors", { params });
export const getVisitorStats = () => api.get("/visitors/stats");
export const preApproveVisitor = (payload) => api.post("/visitors/pre-approve", payload);
export const logWalkInVisitor = (payload) => api.post("/visitors/walk-in", payload);
export const verifyPasscode = (passcode) => api.post("/visitors/verify-code", { passcode });
export const checkInVisitor = (id) => api.post(`/visitors/${id}/check-in`);
export const checkOutVisitor = (id, notes) => api.post(`/visitors/${id}/check-out`, { notes });
export const respondVisitorApproval = (id, action) => {
  const norm = String(action || "").toLowerCase().trim();
  let mapped = "approve";
  if (norm === "approved" || norm === "approve") mapped = "approve";
  else if (norm === "rejected" || norm === "reject" || norm === "denied" || norm === "deny") mapped = "reject";
  else if (norm === "leave_at_gate" || norm === "gate") mapped = "leave_at_gate";
  return api.post(`/visitors/${id}/respond`, { action: mapped });
};
export const cancelVisitorPass = (id) => api.delete(`/visitors/${id}`);
export const getPublicVisitorPass = (id) => api.get(`/visitors/pass/${id}/public`);

// Parcel Hub APIs
export const getGateParcels = (params) => api.get("/visitors/parcels", { params });
export const logGateParcel = (payload) => api.post("/visitors/parcels/log", payload);
export const verifyParcelPickupCode = (parcelCode) =>
  api.post("/visitors/parcels/verify-pickup", { parcelCode });
export const collectGateParcel = (id) => api.post(`/visitors/parcels/${id}/collect`);

export function extractApiError(err, fallback = "Operation failed") {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
}
