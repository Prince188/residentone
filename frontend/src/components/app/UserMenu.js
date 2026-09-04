import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import { getUnreadNotificationCount } from "../../lib/notifications";
import sound from "../../lib/sound";

export default function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeSocietyId = activeSociety?.id;

  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const containerRef = useRef(null);

  useEffect(() => {
    return sound.subscribeMute((muted) => setIsMuted(muted));
  }, []);

  const handleToggleSound = (e) => {
    e.stopPropagation();
    const next = sound.toggleMute();
    if (!next) {
      sound.playNotification();
    }
  };

  // Unread notification count query (shared cache with NotificationBell)
  const countQuery = useQuery({
    queryKey: ["notifications-unread-count", activeSocietyId],
    queryFn: async () => {
      const res = await getUnreadNotificationCount();
      return res.data?.data?.unreadCount || 0;
    },
    enabled: Boolean(activeSocietyId),
    refetchInterval: 30000,
  });
  const unreadCount = countQuery.data || 0;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate("/login");
  };

  const firstName = user?.name?.split(" ")[0] || "Account";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="relative flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-container-low cursor-pointer"
      >
        <div className="relative">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm font-semibold">
            {firstName.charAt(0).toUpperCase()}
          </span>
          {unreadCount > 0 && (
            <span
              title={`${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`}
              className="lg:hidden absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[9px] font-black text-white ring-2 ring-surface-container-lowest shadow-2xs animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <span className="hidden md:block truncate text-body-sm font-medium text-on-surface max-w-[10rem]">
          {firstName}
        </span>
        <span
          className={`material-symbols-outlined hidden md:block text-on-surface-variant text-[20px] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-4 pt-4 pb-3 border-b border-outline-variant">
            <p className="truncate text-body-md font-semibold text-on-surface">{user?.name}</p>
            <p className="truncate text-label-sm text-on-surface-variant">{user?.email}</p>
          </div>
          <div className="py-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate("/profile");
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">person</span>
              Profile
            </button>

            {/* Notifications Item with Unread Badge */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">notifications</span>
                <span>Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Audio Alerts Toggle (tablet & mobile only, since desktop has it in navbar) */}
            <div className="lg:hidden border-y border-outline-variant/50 my-1 py-0.5">
              <button
                type="button"
                role="menuitem"
                onClick={handleToggleSound}
                className="flex w-full items-center justify-between px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                    {isMuted ? "volume_off" : "volume_up"}
                  </span>
                  <span>Sound Alerts</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isMuted
                      ? "bg-surface-container text-outline"
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isMuted ? "bg-outline" : "bg-primary"}`} />
                  {isMuted ? "Muted" : "Active"}
                </span>
              </button>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate("/settings");
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">settings</span>
              Settings
            </button>

            <div className="border-t border-outline-variant/60 my-1" />

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-body-sm text-error hover:bg-error-container hover:text-on-error-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
