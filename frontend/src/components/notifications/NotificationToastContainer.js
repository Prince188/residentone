import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNotificationTypeConfig } from "../../lib/notifications";
import { respondVisitorApproval } from "../../lib/visitors";
import sound from "../../lib/sound";

// Global lightweight event emitter for toasts
const toastListeners = new Set();

export function showNotificationToast(notification) {
  toastListeners.forEach((listener) => listener(notification));
}

export default function NotificationToastContainer() {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleNewToast = (notification) => {
      if (!notification) return;
      const title =
        typeof notification === "string"
          ? notification
          : notification.title || notification.message || "Notification";
      const body = typeof notification === "string" ? "" : notification.body || notification.message || "";
      const type = notification.type || "info";

      const id = notification.id || `toast-${Date.now()}-${Math.random()}`;
      const toastItem = {
        ...notification,
        title,
        body: body !== title ? body : "",
        type,
        toastId: id,
        createdAt: new Date(),
      };

      setToasts((prev) => [toastItem, ...prev.slice(0, 4)]); // Keep max 5

      // Auto dismiss after 4.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.toastId !== id));
      }, 4500);
    };

    toastListeners.add(handleNewToast);
    return () => {
      toastListeners.delete(handleNewToast);
    };
  }, []);

  const handleDismiss = (toastId) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  };

  const handleClick = (toast) => {
    handleDismiss(toast.toastId);
    if (toast.link) {
      navigate(toast.link);
    }
  };

  const handleVisitorAction = async (e, toast, visitorId, action) => {
    e.stopPropagation();
    handleDismiss(toast.toastId);
    try {
      await respondVisitorApproval(visitorId, action);
      if (action === "approved" || action === "approve") {
        sound.playSuccess();
        showNotificationToast({
          title: "Entry Approved",
          body: "Security gate informed in real-time.",
          type: "success",
        });
      } else if (action === "leave_at_gate") {
        sound.playSuccess();
        showNotificationToast({
          title: "Marked: Leave at Gate",
          body: "Guard instructed to hold parcel.",
          type: "info",
        });
      } else {
        sound.playAlert();
        showNotificationToast({
          title: "Entry Denied",
          body: "Security gate informed.",
          type: "error",
        });
      }
    } catch (err) {
      showNotificationToast({
        title: "Action Failed",
        body: err?.response?.data?.error?.message || "Failed to update visitor request",
        type: "error",
      });
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((toast) => {
        const config = getNotificationTypeConfig(toast.type);
        const visitorId =
          toast.visitorId ||
          toast.metadata?.visitorId ||
          toast.data?.visitorId ||
          toast.visitor?._id ||
          toast.visitor?.id;

        return (
          <div
            key={toast.toastId}
            onClick={() => handleClick(toast)}
            className="pointer-events-auto group relative flex items-start gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest/95 backdrop-blur-md p-4 shadow-2xl transition-all duration-200 hover:scale-[1.02] cursor-pointer animate-in slide-in-from-top-4 fade-in duration-300"
          >
            {/* Icon */}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs ${config.iconBg}`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {config.icon}
              </span>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${config.colorClass}`}
                >
                  {config.label}
                </span>
                <span className="text-[11px] text-outline">Just now</span>
              </div>
              <h4 className="mt-1 text-body-sm font-bold text-on-surface">
                {toast.title}
              </h4>
              {toast.body ? (
                <p className="mt-0.5 text-body-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                  {toast.body}
                </p>
              ) : null}

              {/* 1-Tap Quick Actions for Visitor Approval */}
              {visitorId && (
                <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-outline-variant/50">
                  <button
                    type="button"
                    onClick={(e) => handleVisitorAction(e, toast, visitorId, "approved")}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleVisitorAction(e, toast, visitorId, "leave_at_gate")}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2 py-1.5 text-[11px] font-bold text-sky-900 hover:bg-sky-100 transition-colors cursor-pointer"
                    title="Leave at Gate"
                  >
                    <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                    <span>Gate</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleVisitorAction(e, toast, visitorId, "rejected")}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-error/30 bg-error/10 px-2 py-1.5 text-[11px] font-bold text-error hover:bg-error/20 transition-colors cursor-pointer"
                    title="Deny Entry"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                    <span>Deny</span>
                  </button>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(toast.toastId);
              }}
              className="shrink-0 p-1 text-outline hover:text-on-surface rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
