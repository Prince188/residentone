import api from "./api";

export async function getAdminAppConfig() {
  return api.get("/app-config/admin");
}

export async function updateLauncherIcon(payload) {
  return api.patch("/app-config/launcher-icon", payload);
}

export async function getMobileAppConfig() {
  return api.get("/app-config/mobile");
}
