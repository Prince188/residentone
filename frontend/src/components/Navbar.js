import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import useAuthStore from "../stores/auth.store";
import useSocietyModalStore from "../stores/societyModal.store";

const FEATURE_DROPDOWN_MODULES = [
  {
    title: "Maintenance & UPI",
    desc: "Automated billing, instant WhatsApp links & zero-reconciliation Cashfree UPI.",
    icon: "payments",
    tint: "bg-emerald-50 text-emerald-700",
    to: "/features",
  },
  {
    title: "Gate Security & Intercom",
    desc: "Digital visitor passes, guard console & live guard audio intercom.",
    icon: "shield_person",
    tint: "bg-primary-light text-primary",
    to: "/features",
  },
  {
    title: "Audit & AGM Accounting",
    desc: "Statutory audit ledgers, expense logs & CA-ready Excel exports.",
    icon: "account_balance",
    tint: "bg-blue-50 text-blue-700",
    to: "/features",
  },
  {
    title: "Helpdesk & Amenities",
    desc: "Complaint SLA resolution & clubhouse conflict-free bookings.",
    icon: "support_agent",
    tint: "bg-purple-50 text-purple-700",
    to: "/features",
  },
];

const navItems = [
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export default function Navbar() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openSocietyModal = useSocietyModalStore((s) => s.open);
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  // Track scroll position for dynamic floating island elevation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close drawer and mega-menu on route change
  useEffect(() => {
    setOpen(false);
    setFeaturesOpen(false);
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
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 pointer-events-none ${
          isScrolled ? "py-2.5 sm:py-3.5 px-3 sm:px-6" : "py-0 px-0"
        }`}
      >
        <nav
          className={`pointer-events-auto transition-all duration-300 mx-auto ${
            isScrolled
              ? "max-w-6xl bg-white/95 backdrop-blur-2xl rounded-full border border-black/[0.08] shadow-[0_12px_36px_rgba(0,33,22,0.08)] px-4 sm:px-6 h-14 md:h-16"
              : "w-full bg-white/85 backdrop-blur-xl border-b border-black/[0.05] shadow-[0_2px_12px_rgba(0,33,22,0.03)] px-4 sm:px-margin-mobile md:px-margin-desktop h-16 md:h-20"
          } flex items-center justify-between`}
        >
          {/* Logo */}
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

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 bg-surface-container/60 p-1 rounded-full border border-black/[0.04]">
            {/* Features with Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setFeaturesOpen(true)}
              onMouseLeave={() => setFeaturesOpen(false)}
            >
              <Link
                to="/features"
                className={`text-body-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-150 no-underline inline-flex items-center gap-1 ${
                  location.pathname === "/features" || featuresOpen
                    ? "bg-white text-primary font-semibold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-white/60"
                }`}
              >
                <span>Features</span>
                <span
                  className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                    featuresOpen ? "rotate-180 text-primary" : "text-on-surface-muted"
                  }`}
                >
                  expand_more
                </span>
              </Link>

              {/* Mega-Menu Dropdown */}
              {featuresOpen && (
                <div className="absolute top-full left-0 pt-2.5 w-[560px] animate-fade-slide-up z-50">
                  <div className="bg-white rounded-2xl border border-black/[0.08] shadow-[0_20px_50px_rgba(0,33,22,0.14)] p-4 overflow-hidden">
                    <div className="text-[11px] font-bold text-on-surface-muted uppercase tracking-wider px-2 pb-2 border-b border-black/[0.04] flex items-center justify-between">
                      <span>Platform Modules</span>
                      <span className="text-[10px] text-primary font-semibold">Zero Setup Fee</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2.5">
                      {FEATURE_DROPDOWN_MODULES.map((mod) => (
                        <Link
                          key={mod.title}
                          to={mod.to}
                          onClick={() => setFeaturesOpen(false)}
                          className="p-2.5 rounded-xl hover:bg-surface-container transition-all flex items-start gap-3 no-underline group"
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${mod.tint} group-hover:scale-105 transition-transform`}
                          >
                            <span className="material-symbols-outlined text-[20px]">{mod.icon}</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">
                              {mod.title}
                            </div>
                            <div className="text-[11px] text-on-surface-variant mt-0.5 leading-snug line-clamp-2">
                              {mod.desc}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-black/[0.05] bg-surface-container/40 -mx-4 -mb-4 p-3 px-4 flex items-center justify-between">
                      <span className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-primary">verified</span>
                        All 8+ modules unlocked with every plan
                      </span>
                      <Link
                        to="/features"
                        onClick={() => setFeaturesOpen(false)}
                        className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 no-underline"
                      >
                        <span>Explore all modules</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Other Nav Items */}
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-body-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-150 no-underline ${
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
              onClick={(e) => {
                e.preventDefault();
                openSocietyModal();
              }}
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
              onClick={(e) => {
                e.preventDefault();
                openSocietyModal();
              }}
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
        </nav>
      </header>

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
            {/* Features link on mobile */}
            <Link
              to="/features"
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl text-body-sm font-semibold transition-all no-underline ${
                location.pathname === "/features"
                  ? "bg-primary text-white shadow-xs"
                  : "text-on-surface hover:bg-surface-container"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                Features &amp; Modules
              </span>
              <span className="material-symbols-outlined text-[18px] opacity-60">chevron_right</span>
            </Link>

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
                <span className="material-symbols-outlined text-[18px] opacity-60">chevron_right</span>
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
              onClick={() => {
                setOpen(false);
                openSocietyModal();
              }}
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
