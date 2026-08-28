import api from "./api";

export const getPolls = () => api.get("/polls");
export const getPoll = (id) => api.get(`/polls/${id}`);
export const createPoll = (payload) => api.post("/polls", payload);
export const votePoll = (id, selectedOptionIndex) => api.post(`/polls/${id}/vote`, { selectedOptionIndex });
export const closePoll = (id) => api.post(`/polls/${id}/close`);
export const deletePoll = (id) => api.delete(`/polls/${id}`);

export function extractApiError(error, fallback) {
  return error?.response?.data?.error?.message || error?.response?.data?.message || fallback;
}

export function formatPollEndDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = d - now;
  if (diff <= 0) return "Closed";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) {
    if (hours < 1) {
      const mins = Math.floor(diff / (1000 * 60));
      return `Closes in ${mins} min`;
    }
    return `Closes in ${hours} hr${hours > 1 ? "s" : ""}`;
  }
  return `Closes ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;
}
