import { showNotificationToast } from "../components/notifications/NotificationToastContainer";

export const toast = {
  success: (title, body = "") => {
    showNotificationToast({
      title: typeof title === "string" ? title : title?.title || "Success",
      body: typeof title === "string" ? body : title?.body || "",
      type: "success",
    });
  },
  error: (title, body = "") => {
    showNotificationToast({
      title: typeof title === "string" ? title : title?.title || "Error",
      body: typeof title === "string" ? body : title?.body || "",
      type: "error",
    });
  },
  info: (title, body = "") => {
    showNotificationToast({
      title: typeof title === "string" ? title : title?.title || "Info",
      body: typeof title === "string" ? body : title?.body || "",
      type: "info",
    });
  },
  warning: (title, body = "") => {
    showNotificationToast({
      title: typeof title === "string" ? title : title?.title || "Warning",
      body: typeof title === "string" ? body : title?.body || "",
      type: "warning",
    });
  },
  custom: (options) => {
    showNotificationToast(options);
  },
};

export default toast;
