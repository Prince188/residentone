import api from "./api";

export async function getEvents(params = {}) {
  try {
    const res = await api.get("/events", { params });
    return res.data?.data ?? res.data ?? [];
  } catch (err) {
    if (err?.response?.status === 404) {
      return [];
    }
    throw err;
  }
}

export async function createEvent(payload) {
  const res = await api.post("/events", payload);
  return res.data?.data ?? res.data;
}

export async function getEvent(id) {
  const res = await api.get(`/events/${id}`);
  return res.data?.data ?? res.data;
}

export async function updateEvent(id, payload) {
  const res = await api.put(`/events/${id}`, payload);
  return res.data?.data ?? res.data;
}

export async function deleteEvent(id) {
  const res = await api.delete(`/events/${id}`);
  return res.data?.data ?? res.data;
}
