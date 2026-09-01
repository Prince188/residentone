import api from "./api";

export const getSurveys = () => api.get("/surveys");
export const getSurvey = (id) => api.get(`/surveys/${id}`);
export const createSurvey = (payload) => api.post("/surveys", payload);
export const submitSurvey = (id, answers) => api.post(`/surveys/${id}/submit`, { answers });
export const updateSurvey = (id, payload) => api.patch(`/surveys/${id}`, payload);
export const closeSurvey = (id) => api.post(`/surveys/${id}/close`);
export const deleteSurvey = (id) => api.delete(`/surveys/${id}`);

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || error?.response?.data?.message || fallback;
}
export function formatEndDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  if (d <= now) return "Closed";
  const diff = d - now;
  const days = Math.floor(diff / (1000*60*60*24));
  if (days > 0) return `Closes ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  const hrs = Math.floor(diff / (1000*60*60));
  return `Closes in ${hrs} hr${hrs!==1?"s":""}`;
}
