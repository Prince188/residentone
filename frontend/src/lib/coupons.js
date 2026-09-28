import api from "./api";

export const validateCouponCode = (payload) => api.post("/coupons/validate", payload);

// Admin API
export const getAdminCoupons = (params) => api.get("/coupons/admin", { params });
export const createAdminCoupon = (payload) => api.post("/coupons/admin", payload);
export const updateAdminCoupon = (id, payload) => api.patch(`/coupons/admin/${id}`, payload);
export const deleteAdminCoupon = (id) => api.delete(`/coupons/admin/${id}`);
