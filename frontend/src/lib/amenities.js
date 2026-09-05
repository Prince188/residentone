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

export function getAmenityMeta(name = "", type = "free") {
  const n = (name || "").toLowerCase();
  let icon = "apartment";
  let iconBg = "bg-primary/10 text-primary border-primary/20";
  let stripe = "bg-primary";

  if (n.includes("pool") || n.includes("swim")) {
    icon = "pool";
    iconBg = "bg-cyan-500/10 text-cyan-700 border-cyan-200/60";
    stripe = "bg-cyan-500";
  } else if (n.includes("gym") || n.includes("fitness") || n.includes("workout")) {
    icon = "fitness_center";
    iconBg = "bg-orange-500/10 text-orange-700 border-orange-200/60";
    stripe = "bg-orange-500";
  } else if (n.includes("club") || n.includes("hall") || n.includes("banquet") || n.includes("party")) {
    icon = "celebration";
    iconBg = "bg-purple-500/10 text-purple-700 border-purple-200/60";
    stripe = "bg-purple-500";
  } else if (n.includes("tennis") || n.includes("badminton") || n.includes("squash") || n.includes("court")) {
    icon = "sports_tennis";
    iconBg = "bg-emerald-500/10 text-emerald-700 border-emerald-200/60";
    stripe = "bg-emerald-500";
  } else if (n.includes("garden") || n.includes("park") || n.includes("lawn")) {
    icon = "park";
    iconBg = "bg-lime-500/10 text-lime-800 border-lime-200/60";
    stripe = "bg-lime-600";
  } else if (n.includes("theatre") || n.includes("movie") || n.includes("cinema") || n.includes("av")) {
    icon = "theaters";
    iconBg = "bg-indigo-500/10 text-indigo-700 border-indigo-200/60";
    stripe = "bg-indigo-500";
  } else if (n.includes("spa") || n.includes("sauna") || n.includes("steam")) {
    icon = "hot_tub";
    iconBg = "bg-rose-500/10 text-rose-700 border-rose-200/60";
    stripe = "bg-rose-500";
  } else if (n.includes("game") || n.includes("billiards") || n.includes("pool table") || n.includes("tt") || n.includes("table tennis")) {
    icon = "sports_esports";
    iconBg = "bg-violet-500/10 text-violet-700 border-violet-200/60";
    stripe = "bg-violet-500";
  }

  const isPaid = type === "paid";
  return {
    icon,
    iconBg,
    stripe,
    isPaid,
    pricePill: isPaid
      ? "bg-amber-50 text-amber-800 border border-amber-200/60"
      : "bg-emerald-50 text-emerald-800 border border-emerald-200/60",
  };
}
