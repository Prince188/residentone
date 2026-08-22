import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/auth.store";

export default function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-container-low cursor-pointer"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm font-semibold">
          {firstName.charAt(0).toUpperCase()}
        </span>
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
          className="absolute right-0 mt-2 w-56 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg overflow-hidden z-50"
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
              <span className="material-symbols-outlined text-[20px]">person</span>
              Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate("/settings");
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              Settings
            </button>
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
