import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import SocietySelector from "./SocietySelector";
import UserMenu from "./UserMenu";
import NotificationBell from "../notifications/NotificationBell";
import sound from "../../lib/sound";

export default function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isPlatformAdmin = user?.role?.includes("super_admin");
  const activeSociety = useSocietyStore(selectActiveSociety);
  const isSuperAdminManaging = useSocietyStore((state) => state.isSuperAdminManaging);
  const exitSuperAdminSocietyMode = useSocietyStore((state) => state.exitSuperAdminSocietyMode);

  const [isMuted, setIsMuted] = useState(sound.isMuted());

  useEffect(() => {
    return sound.subscribeMute((muted) => setIsMuted(muted));
  }, []);

  const handleToggleSound = () => {
    const next = sound.toggleMute();
    if (!next) {
      sound.playNotification();
    }
  };

  const handleExitSocietyMode = () => {
    exitSuperAdminSocietyMode();
    navigate("/dashboard");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 md:gap-4 border-b border-outline-variant bg-surface-container-lowest px-margin-mobile md:px-margin-desktop">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer md:hidden"
      >
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>

      <Link
        to="/dashboard"
        className="shrink-0 text-[20px] font-bold text-on-surface flex items-center gap-2 tracking-tight no-underline"
      >
        <span className="material-symbols-outlined text-primary text-[26px]">apartment</span>
        <span className="hidden sm:block">ResidentOne</span>
      </Link>

      <div className="min-w-0 flex-1 flex justify-start md:justify-center">
        {isPlatformAdmin ? (
          isSuperAdminManaging && activeSociety ? (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 shadow-sm">
              <span className="material-symbols-outlined shrink-0 text-primary text-[20px]">
                shield_person
              </span>
              <div className="min-w-0 leading-tight">
                <span className="block truncate text-body-sm font-bold text-on-surface">
                  {activeSociety.name}
                </span>
                <span className="hidden sm:block truncate text-[11px] font-semibold text-primary">
                  Super Admin Management Mode
                </span>
              </div>
              <button
                type="button"
                onClick={handleExitSocietyMode}
                className="ml-2 inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[12px] font-semibold text-on-primary no-underline transition-all hover:bg-primary/90 cursor-pointer"
                title="Exit back to Platform Dashboard"
              >
                <span className="material-symbols-outlined text-[14px]">logout</span>
                <span className="hidden md:inline">Exit</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 md:px-3 md:py-2">
              <span className="material-symbols-outlined shrink-0 text-primary text-[22px] hidden sm:block">
                admin_panel_settings
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-body-sm font-semibold text-on-surface">
                  ResidentOne
                </span>
                <span className="hidden sm:block truncate text-label-sm text-on-surface-variant">
                  Super Admin Platform Center
                </span>
              </span>
            </div>
          )
        ) : (
          <SocietySelector />
        )}
      </div>

      <div className="shrink-0 flex items-center gap-1 md:gap-2">
        <button
          type="button"
          onClick={handleToggleSound}
          title={isMuted ? "Audio Muted - Click to Unmute" : "Audio Alerts Active - Click to Mute"}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer ${
            isMuted
              ? "text-outline hover:text-on-surface hover:bg-surface-container-high"
              : "text-primary hover:bg-primary/10"
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {isMuted ? "volume_off" : "volume_up"}
          </span>
        </button>
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
