import api from "./api";

export const validateReferralCode = (code) => api.post("/referrals/validate", { code });
export const getMyReferralInfo = () => api.get("/referrals/my-code");

// Admin API
export const getAdminReferrals = (params) => api.get("/referrals/admin/all", { params });
export const dispatchReferralGift = (id, payload) => api.patch(`/referrals/admin/${id}/dispatch-gift`, payload);
export const getReferralSettings = () => api.get("/referrals/admin/settings");
export const updateReferralSettings = (payload) => api.put("/referrals/admin/settings", payload);
