import api from "./api";

export const getHouseCards = () => api.get("/units");
export const getHouse = (unitId) => api.get(`/units/${unitId}`);
export const checkOwnerByPhone = (unitId, phone) =>
  api.post(`/units/${unitId}/check-owner`, { phone });
export const assignOwnerToHouse = (unitId, payload) =>
  api.post(`/units/${unitId}/assign-owner`, payload);
export const unassignOwnerFromHouse = (unitId) =>
  api.post(`/units/${unitId}/unassign-owner`);
export const createHouseInviteLink = (unitId) =>
  api.post(`/units/${unitId}/invite-link`);
export const getHouseInvitePreview = (token) => api.get(`/units/invite/${token}`);
export const submitHouseInvite = (token, payload) =>
  api.post(`/units/invite/${token}`, payload);

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || fallback;
}
