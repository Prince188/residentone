import api from "./api";

export async function changePassword({ currentPassword, newPassword }) {
  return api.post("/users/change-password", { currentPassword, newPassword });
}

export function extractApiError(err, fallback = "Something went wrong") {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
}
