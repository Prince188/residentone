import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, {
  selectActiveSociety,
  selectActiveMembership,
} from "../../stores/society.store";
import { SUBSCRIPTION_PLAN_LABELS } from "../../lib/societies";
import SocietySelector from "./SocietySelector";
import UserMenu from "./UserMenu";
import NotificationBell from "../notifications/NotificationBell";
import sound from "../../lib/sound";

export default function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isPlatformAdmin = user?.role?.includes("super_admin");
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const isSuperAdminManaging = useSocietyStore((state) => state.isSuperAdminManaging);
  const exitSuperAdminSocietyMode = useSocietyStore((state) => state.exitSuperAdminSocietyMode);
  const openUpgradeModal = useSocietyStore((state) => state.openUpgradeModal);

  const isAdmin = activeMembership?.role === "society_admin" || isPlatformAdmin;
  const currentPlanId = activeSociety?.subscriptionPlan || "starter";
  const planName = SUBSCRIPTION_PLAN_LABELS[currentPlanId] || "Basic";

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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 md:gap-4 border-b border-black/[0.06] bg-[#F8FAF9]/80 backdrop-blur-xl px-margin-mobile md:px-margin-desktop shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-black/[0.04] hover:text-slate-900 transition-colors cursor-pointer md:hidden active:scale-95"
      >
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>

      <Link
        to="/dashboard"
        className="shrink-0 flex items-center gap-2 no-underline active:scale-95 transition-transform"
      >
        <img
          src="/logo-mark.png"
          alt="ResidentOne"
          className="h-7 w-7 object-contain sm:hidden"
        />
        <img
          src="/logo-transparent.png"
          alt="ResidentOne"
          className="h-7 w-auto object-contain hidden sm:block"
        />
      </Link>

      <div className="min-w-0 flex-1 flex justify-start md:justify-center">
        {isPlatformAdmin ? (
          isSuperAdminManaging && activeSociety ? (
            <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3.5 py-1.5 shadow-xs">
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
              {activeSociety.isSubscriptionPaid && (
                <div className="hidden sm:flex items-center gap-1 shrink-0 ml-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300/70 px-2.5 py-0.5 text-[10px] font-bold">
                    <span className="material-symbols-outlined text-[12px] text-emerald-600">verified</span>
                    <span>{planName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={openUpgradeModal}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                    title="Upgrade subscription plan"
                  >
                    <span className="material-symbols-outlined text-[12px]">upgrade</span>
                    <span>Upgrade</span>
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleExitSocietyMode}
                className="ml-2 inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1 text-[12px] font-semibold text-white no-underline transition-all hover:bg-primary/90 cursor-pointer active:scale-95"
                title="Exit back to Platform Dashboard"
              >
                <span className="material-symbols-outlined text-[14px]">logout</span>
                <span className="hidden md:inline">Exit</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 md:px-3 md:py-2">
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
          <div className="flex items-center gap-2">
            <SocietySelector />
            {activeSociety && activeSociety.isSubscriptionPaid && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  title={`Active Plan: ${planName}`}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                  <span>{planName}</span>
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openUpgradeModal}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2.5 py-0.5 text-[11px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Upgrade subscription plan"
                  >
                    <span className="material-symbols-outlined text-[13px]">upgrade</span>
                    <span className="hidden sm:inline">Upgrade</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-1 md:gap-2">
        {/* Audio Alerts Toggle */}
        <button
          type="button"
          onClick={handleToggleSound}
          title={isMuted ? "Audio Muted - Click to Unmute" : "Audio Alerts Active - Click to Mute"}
          className={`hidden lg:flex h-10 w-10 items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 ${
            isMuted
              ? "text-slate-400 hover:text-slate-700 hover:bg-black/[0.04]"
              : "text-primary hover:bg-primary/10"
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {isMuted ? "volume_off" : "volume_up"}
          </span>
        </button>

        {/* Notification Bell */}
        <div className="hidden lg:block">
          <NotificationBell />
        </div>

        {/* User Profile Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
