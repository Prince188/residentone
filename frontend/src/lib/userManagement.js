import api from "./api";

export const getAllUsersAdmin = (params) => api.get("/users/admin/all", { params });
export const updateUserAdmin = (id, payload) => api.patch(`/users/admin/${id}`, payload);
export const freezeUserAdmin = (id) => api.patch(`/users/admin/${id}/freeze`);
export const deleteUserAdmin = (id) => api.delete(`/users/admin/${id}`);
