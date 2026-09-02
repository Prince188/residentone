import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationTypeConfig,
  formatTimeAgo,
} from "../../lib/notifications";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeSocietyId = activeSociety?.id;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Query: Unread Count
  const countQuery = useQuery({
    queryKey: ["notifications-unread-count", activeSocietyId],
    queryFn: async () => {
      const res = await getUnreadNotificationCount();
      return res.data?.data?.unreadCount || 0;
    },
    enabled: Boolean(activeSocietyId),
    refetchInterval: 30000,
  });

  // Query: Recent Notifications for Dropdown
  const listQuery = useQuery({
    queryKey: ["notifications-dropdown", activeSocietyId, filter],
    queryFn: async () => {
      const res = await getNotifications({
        limit: 15,
        unreadOnly: filter === "unread" ? true : undefined,
      });
      return res.data;
    },
    enabled: Boolean(activeSocietyId && isOpen),
    staleTime: 5000,
  });

  const unreadCount = countQuery.data || 0;
  const notifications = listQuery.data?.data || [];

  // Mutation: Mark single as read
  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  // Mutation: Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  // Mutation: Delete notification
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  const handleItemClick = (notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDeleteItem = (e, id) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[22px]">
          {unreadCount > 0 ? "notifications_active" : "notifications"}
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-surface animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline-variant/60 px-4 py-3 bg-surface-container-low">
            <div className="flex items-center gap-2">
              <h2 className="text-title-sm font-bold text-on-surface">Notifications</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label-sm font-semibold text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-label-sm font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-outline-variant/40 px-3 pt-2 gap-2 bg-surface-container-lowest">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-label-md font-medium rounded-t-lg transition-colors cursor-pointer ${
                filter === "all"
                  ? "border-b-2 border-primary text-primary font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-label-md font-medium rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                filter === "unread"
                  ? "border-b-2 border-primary text-primary font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/40 max-h-[380px]">
            {listQuery.isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-surface-container-high shrink-0" />
                    <div className="flex-1 space-y-1.5 py-1">
                      <div className="h-3.5 w-3/4 rounded bg-surface-container-high" />
                      <div className="h-3 w-1/2 rounded bg-surface-container-high" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[42px] text-outline/60 mb-2">
                  notifications_paused
                </span>
                <p className="text-body-md font-medium text-on-surface">
                  {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-label-sm text-outline mt-1">
                  {filter === "unread"
                    ? "You're all caught up with your updates!"
                    : "When important updates occur, they'll appear here."}
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const config = getNotificationTypeConfig(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-surface-container-low ${
                      !n.isRead ? "bg-primary/5" : "bg-surface-container-lowest"
                    }`}
                  >
                    {/* Icon Badge */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {config.icon}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <h3
                          className={`text-body-sm truncate ${
                            !n.isRead
                              ? "font-bold text-on-surface"
                              : "font-semibold text-on-surface/90"
                          }`}
                        >
                          {n.title}
                        </h3>
                        <span className="shrink-0 text-[11px] text-outline">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-body-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${config.colorClass}`}
                        >
                          {config.label}
                        </span>
                        {n.link && (
                          <span className="text-[11px] font-medium text-primary hover:underline">
                            View details →
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread indicator & Delete */}
                    <div className="flex flex-col items-center justify-between self-stretch shrink-0">
                      {!n.isRead ? (
                        <span className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/20" />
                      ) : (
                        <span className="h-2 w-2" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(e, n.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-outline hover:text-error hover:bg-error/10 rounded transition-all cursor-pointer"
                        title="Delete notification"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-outline-variant/60 p-2.5 bg-surface-container-low flex items-center justify-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-label-sm font-semibold text-primary hover:underline text-center no-underline inline-flex items-center gap-1"
            >
              <span>Open Notification Center</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
