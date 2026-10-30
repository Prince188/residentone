import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import useAuthStore from "../stores/auth.store";
import useSocietyModalStore from "../stores/societyModal.store";

const navItems = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export default function Navbar() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openSocietyModal = useSocietyModalStore((s) => s.open);
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-2xl fixed top-0 w-full z-50 border-b border-black/[0.05] shadow-[0_2px_12px_rgba(0,33,22,0.03)] transition-all">
        <div className="flex justify-between items-center max-w-container-max mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop h-16 md:h-20">
          <Link
            to="/"
            className="flex items-center gap-2 tracking-tight no-underline shrink-0 group active:scale-[0.98] transition-transform"
          >
            <img
              src="/logo-transparent.png"
              alt="ResidentOne"
              className="h-8 md:h-9 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2 bg-surface-container/60 p-1 rounded-full border border-black/[0.04]">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-body-sm font-medium px-4 py-1.5 rounded-full transition-all duration-150 no-underline ${
                    isActive
                      ? "bg-white text-primary font-semibold shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-white/60"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary bg-primary-light px-4 py-2 rounded-full hover:bg-primary-fixed/40 transition-all no-underline active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-body-sm font-medium text-on-surface hover:text-primary px-4 py-2 rounded-full hover:bg-black/[0.03] transition-all no-underline"
              >
                Sign In
              </Link>
            )}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); openSocietyModal(); }}
              className="bg-primary text-white text-body-sm font-semibold px-5 py-2.5 rounded-full shadow-[0_2px_12px_rgba(0,105,72,0.24)] hover:bg-primary-hover active:scale-[0.97] transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              <span>Create Society</span>
            </button>
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); openSocietyModal(); }}
              aria-label="Create Society"
              className="bg-primary text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-[0_2px_8px_rgba(0,105,72,0.2)] active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_business</span>
              <span>Create</span>
            </button>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-black/[0.08] text-on-surface shadow-xs active:scale-95 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">
                {open ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer backdrop */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 top-16 bg-inverse-surface/20 backdrop-blur-sm z-40 md:hidden"
          tabIndex={-1}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-16 left-0 w-full bg-white/95 backdrop-blur-2xl border-b border-black/[0.08] shadow-[0_16px_36px_rgba(0,33,22,0.12)] z-40 md:hidden transition-all duration-300 ease-out overflow-hidden ${
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div className="px-5 py-6">
          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-body-sm font-semibold transition-all no-underline ${
                  location.pathname === item.to
                    ? "bg-primary text-white shadow-xs"
                    : "text-on-surface hover:bg-surface-container"
                }`}
              >
                {item.label}
                <span className="material-symbols-outlined text-[18px] opacity-60">arrow_forward_ios</span>
              </Link>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-black/[0.06]">
            <div className="grid grid-cols-2 gap-2.5">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1.5 bg-primary text-white rounded-full py-3 text-body-sm font-semibold no-underline shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">dashboard</span>
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1.5 bg-surface-container text-on-surface rounded-full py-3 text-body-sm font-semibold no-underline hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Sign In
                </Link>
              )}
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 bg-primary text-white rounded-full py-3 text-body-sm font-semibold no-underline shadow-[0_2px_10px_rgba(0,105,72,0.22)]"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Join
              </Link>
            </div>
            <button
              type="button"
              onClick={() => { setOpen(false); openSocietyModal(); }}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-primary-light text-primary border border-primary/20 rounded-full py-3 text-body-sm font-bold hover:bg-primary-fixed/50 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              Create Society
            </button>
            <p className="text-center text-xs text-on-surface-variant mt-4 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary">verified_user</span>
              Trusted by 500+ societies
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
