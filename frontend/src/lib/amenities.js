import api from "./api";

export const getAmenities = () => api.get("/amenities");
export const getAmenity = (id) => api.get(`/amenities/${id}`);
export const createAmenity = (payload) => api.post("/amenities", payload);
export const updateAmenity = (id, payload) => api.patch(`/amenities/${id}`, payload);
export const deleteAmenity = (id) => api.delete(`/amenities/${id}`);
export const getSlots = (id, date) => api.get(`/amenities/${id}/slots`, { params: { date } });
export const bookAmenity = (id, payload) => api.post(`/amenities/${id}/book`, payload);
export const cancelBooking = (bookingId) => api.post(`/amenities/bookings/${bookingId}/cancel`);
export const getMyBookings = () => api.get("/amenities/bookings/my");
export const getAllBookings = (params) => api.get("/amenities/bookings/all", { params });

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || fallback;
}
