import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import useAuthStore from "../stores/auth.store";

const navItems = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export default function Navbar() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
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
      <nav className="bg-surface-container-lowest fixed top-0 w-full z-50 border-b border-surface-variant">
        <div className="flex justify-between items-center max-w-container-max mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop h-16 md:h-24">
          <Link
            to="/"
            className="text-[20px] md:text-[24px] font-bold text-on-surface flex items-center gap-2 tracking-tight no-underline shrink-0"
          >
            <span className="material-symbols-outlined text-primary text-[28px] md:text-[32px]">
              apartment
            </span>
            ResidentOne
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex space-x-8 lg:space-x-12">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`font-label-md text-label-md uppercase tracking-widest h-16 md:h-24 flex items-center transition-colors cursor-pointer active:opacity-80 no-underline ${
                  location.pathname === item.to ? "text-primary" : "text-on-surface hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="font-label-md text-label-md text-on-surface hover:text-primary transition-colors uppercase tracking-widest no-underline"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="font-label-md text-label-md text-on-surface hover:text-primary transition-colors uppercase tracking-widest no-underline"
              >
                Login
              </Link>
            )}
            <Link
              to="/create-society"
              className="bg-primary text-on-primary font-label-md text-label-md px-5 lg:px-6 py-3 rounded-lg hover:bg-inverse-surface transition-colors uppercase tracking-widest no-underline flex items-center gap-2 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              Create Society
            </Link>
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/create-society"
              aria-label="Create Society"
              className="bg-primary text-on-primary font-label-md px-3.5 py-2 rounded-lg transition-colors no-underline flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              <span className="text-[11px] sm:text-[12px] tracking-widest uppercase font-semibold">
                Create
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[22px]">
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
        className={`fixed top-16 left-0 w-full bg-surface-container-lowest border-b border-outline-variant/20 shadow-[0_16px_32px_-16px_rgba(0,23,75,0.18)] z-40 md:hidden transition-all duration-300 ease-out overflow-hidden ${
          open ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div className="px-4 sm:px-6 py-6">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold tracking-widest uppercase transition-colors no-underline ${
                  location.pathname === item.to
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-surface hover:bg-surface-container"
                }`}
              >
                {item.label}
                <span className="material-symbols-outlined text-[18px] opacity-60">arrow_forward</span>
              </Link>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-outline-variant/20">
            <div className="grid grid-cols-2 gap-3">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 bg-inverse-surface text-white rounded-xl py-3.5 text-sm font-semibold no-underline hover:bg-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">dashboard</span>
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 bg-white border border-outline-variant/40 text-on-surface rounded-xl py-3.5 text-sm font-semibold no-underline hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Login
                </Link>
              )}
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3.5 text-sm font-semibold no-underline hover:bg-[#0040b8] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Join
              </Link>
            </div>
            <Link
              to="/create-society"
              onClick={() => setOpen(false)}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-surface-container border border-outline-variant/30 text-on-surface rounded-xl py-3.5 text-sm font-bold tracking-widest uppercase no-underline hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              Create Society
            </Link>
            <p className="text-center text-xs text-on-surface-variant mt-4 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              Trusted by 500+ societies
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
