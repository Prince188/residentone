import { Link } from "react-router-dom";
import SocietySelector from "./SocietySelector";
import UserMenu from "./UserMenu";

export default function Header({ onMenuClick }) {
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
        <SocietySelector />
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
