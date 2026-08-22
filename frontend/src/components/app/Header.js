import { Link } from "react-router-dom";
import useAuthStore from "../../stores/auth.store";
import SocietySelector from "./SocietySelector";
import UserMenu from "./UserMenu";

export default function Header({ onMenuClick }) {
  const user = useAuthStore((state) => state.user);
  const isPlatformAdmin = user?.role === "super_admin";

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
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 md:px-3 md:py-2">
            <span className="material-symbols-outlined shrink-0 text-primary text-[22px] hidden sm:block">
              admin_panel_settings
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-body-sm font-semibold text-on-surface">
                ResidentOne
              </span>
              <span className="hidden sm:block truncate text-label-sm text-on-surface-variant">
                Super Admin Dashboard
              </span>
            </span>
          </div>
        ) : (
          <SocietySelector />
        )}
      </div>

      <div className="shrink-0 flex items-center gap-1 md:gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-error" />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
