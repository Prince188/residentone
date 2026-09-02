import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getNotificationTypeConfig } from "../../lib/notifications";

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
      if (!notification || !notification.title) return;
      const id = notification.id || `toast-${Date.now()}-${Math.random()}`;
      const toastItem = {
        ...notification,
        toastId: id,
        createdAt: new Date(),
      };

      setToasts((prev) => [toastItem, ...prev.slice(0, 4)]); // Keep max 5

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.toastId !== id));
      }, 6000);
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

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:top-20 sm:bottom-auto z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((toast) => {
        const config = getNotificationTypeConfig(toast.type);
        return (
          <div
            key={toast.toastId}
            onClick={() => handleClick(toast)}
            className="pointer-events-auto group relative flex items-start gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xl transition-all duration-200 hover:scale-[1.02] cursor-pointer animate-in slide-in-from-right-5 fade-in duration-300"
          >
            {/* Icon */}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {config.icon}
              </span>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${config.colorClass}`}
                >
                  {config.label}
                </span>
                <span className="text-[11px] text-outline">Just now</span>
              </div>
              <h4 className="mt-1 text-body-sm font-bold text-on-surface truncate">
                {toast.title}
              </h4>
              <p className="mt-0.5 text-body-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                {toast.body}
              </p>
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
