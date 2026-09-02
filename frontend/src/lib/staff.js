import api from "./api";

export async function lookupUserByPhone(phone) {
  return api.get(`/staff/lookup-user?phone=${encodeURIComponent(phone)}`);
}

export async function getStaffList() {
  return api.get("/staff");
}

export async function addStaffMember(data) {
  return api.post("/staff", data);
}

export async function updateStaffMember(id, data) {
  return api.patch(`/staff/${id}`, data);
}

export async function removeStaffMember(id) {
  return api.delete(`/staff/${id}`);
}
