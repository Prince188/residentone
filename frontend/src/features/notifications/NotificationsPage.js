import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationTypeConfig,
  formatTimeAgo,
  extractApiError,
} from "../../lib/notifications";
import { respondVisitorApproval } from "../../lib/visitors";
import sound from "../../lib/sound";
import toast from "../../lib/toast";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const CATEGORIES = [
  { value: "all", label: "All Updates", icon: "all_inbox" },
  { value: "notice", label: "Notices", icon: "campaign" },
  { value: "maintenance", label: "Maintenance", icon: "receipt_long" },
  { value: "collection", label: "Collections", icon: "celebration" },
  { value: "complaint", label: "Complaints", icon: "handyman" },
  { value: "amenity", label: "Amenities", icon: "pool" },
  { value: "poll", label: "Polls", icon: "how_to_vote" },
  { value: "survey", label: "Surveys", icon: "quiz" },
  { value: "system", label: "System", icon: "notifications" },
];

export default function NotificationsPage() {
  const [selectedType, setSelectedType] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeSocietyId = activeSociety?.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "notifications-list",
      activeSocietyId,
      selectedType,
      unreadOnly,
      search,
      page,
    ],
    queryFn: async () => {
      const res = await getNotifications({
        page,
        limit: 15,
        type: selectedType === "all" ? undefined : selectedType,
        unreadOnly: unreadOnly ? true : undefined,
        search: search.trim() || undefined,
      });
      return res.data;
    },
    enabled: Boolean(activeSocietyId),
    placeholderData: (previousData) => previousData,
  });

  const notifications = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 15, total: 0, totalPages: 1 };
  const unreadCount = data?.unreadCount || 0;

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => clearAllNotifications(false),
    onSuccess: () => {
      setIsClearDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-dropdown"] });
    },
  });

  const handleCardClick = (notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleVisitorAction = async (e, notification, visitorId, action) => {
    e.stopPropagation();
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    try {
      await respondVisitorApproval(visitorId, action);
      if (action === "approved" || action === "approve") {
        sound.playSuccess();
        toast.success("Entry Approved", "Security gate informed.");
      } else if (action === "leave_at_gate") {
        sound.playSuccess();
        toast.success("Marked: Leave at Gate", "Security guard will hold parcel.");
      } else {
        sound.playAlert();
        toast.error("Entry Denied", "Security gate informed.");
      }
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
    } catch (err) {
      toast.error(extractApiError(err, "Failed to update visitor request"));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary mb-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[28px]">
              notifications_active
            </span>
            Notification Center
          </h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}
            {unreadCount > 0
              ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
              : "All caught up"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2 text-label-md font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">done_all</span>
              <span>Mark all as read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-label-md font-semibold text-outline hover:text-error hover:border-error/40 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
              <span className="hidden sm:inline">Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="space-y-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search notifications..."
              className="w-full rounded-xl border border-outline-variant bg-surface py-2 pl-9 pr-4 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Unread Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-label-md font-medium text-on-surface-variant">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span>Unread only</span>
          </label>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => {
                setSelectedType(cat.value);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-label-sm font-semibold transition-colors cursor-pointer ${
                selectedType === cat.value
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isError && (
        <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center text-body-md text-error">
          {extractApiError(error, "Failed to load notifications.")}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-outline-variant bg-surface-container-high"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 text-center">
          <span className="material-symbols-outlined text-[54px] text-outline/60 mb-3">
            notifications_off
          </span>
          <h3 className="text-title-md font-bold text-on-surface">No notifications found</h3>
          <p className="mt-1 max-w-sm text-body-sm text-on-surface-variant">
            {search || selectedType !== "all" || unreadOnly
              ? "Try adjusting your search or category filters."
              : "You're all caught up! New alerts and society announcements will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const config = getNotificationTypeConfig(n.type);
            return (
              <div
                key={n.id}
                onClick={() => handleCardClick(n)}
                className={`group relative flex items-start gap-4 rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer ${
                  !n.isRead
                    ? "border-primary/30 bg-primary/5 shadow-sm hover:border-primary/60"
                    : "border-outline-variant bg-surface-container-lowest hover:border-outline hover:shadow-sm"
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${config.iconBg}`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {config.icon}
                  </span>
                </div>

                {/* Main Body */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${config.colorClass}`}
                      >
                        {config.label}
                      </span>
                      {!n.isRead && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          New
                        </span>
                      )}
                    </div>
                    <span className="text-label-sm text-outline">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>

                  <h3
                    className={`mt-1 text-body-lg ${
                      !n.isRead
                        ? "font-bold text-on-surface"
                        : "font-semibold text-on-surface/90"
                    }`}
                  >
                    {n.title}
                  </h3>

                  <p className="mt-1 text-body-md text-on-surface-variant leading-relaxed">
                    {n.body}
                  </p>

                  {/* 1-Tap Quick Action Buttons for Visitor Requests */}
                  {(() => {
                    const visitorId = n.metadata?.visitorId || n.data?.visitorId || n.visitorId;
                    if (!visitorId) return null;
                    return (
                      <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2.5 border-t border-outline-variant/40">
                        <button
                          type="button"
                          onClick={(e) => handleVisitorAction(e, n, visitorId, "approved")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-label-md font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span>Approve Entry</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleVisitorAction(e, n, visitorId, "leave_at_gate")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 text-label-md font-bold text-sky-900 hover:bg-sky-100 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] text-sky-700">inventory_2</span>
                          <span>Leave at Gate</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleVisitorAction(e, n, visitorId, "rejected")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-error/30 bg-error/10 px-3.5 py-2 text-label-md font-bold text-error hover:bg-error/20 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          <span>Deny Entry</span>
                        </button>
                      </div>
                    );
                  })()}

                  {n.link && (
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline">
                        <span>Take action / View details</span>
                        <span className="material-symbols-outlined text-[16px]">
                          arrow_forward
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!n.isRead) markReadMutation.mutate(n.id);
                    }}
                    title={n.isRead ? "Read" : "Mark as read"}
                    className={`rounded-full p-1.5 transition-colors cursor-pointer ${
                      !n.isRead
                        ? "text-primary hover:bg-primary/10"
                        : "text-outline/40 hover:text-outline"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {n.isRead ? "mark_email_read" : "mark_email_unread"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(n.id);
                    }}
                    title="Delete notification"
                    className="rounded-full p-1.5 text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      delete
                    </span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-outline-variant/60 pt-4">
              <p className="text-label-md text-on-surface-variant">
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-label-md font-medium text-on-surface hover:bg-surface-container-low disabled:opacity-40 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-label-md font-medium text-on-surface hover:bg-surface-container-low disabled:opacity-40 cursor-pointer"
                >
                  Next
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm Clear All Dialog */}
      <ConfirmDialog
        open={isClearDialogOpen}
        title="Clear All Notifications?"
        message="Are you sure you want to clear all your notifications? This action cannot be undone."
        confirmText="Clear All"
        confirmVariant="error"
        onConfirm={() => clearAllMutation.mutate()}
        onCancel={() => setIsClearDialogOpen(false)}
        isLoading={clearAllMutation.isPending}
      />
    </div>
  );
}
