import { Link, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import {
  RESIDENT_NAV_SECTIONS,
  ADMIN_NAV_SECTIONS,
} from "../../config/navigation";
import { getSubscriptionRenewalMeta } from "../../features/dashboard/SubscriptionStatusCard";

function NavItem({ item, isCollapsed, onNavigate, isLocked }) {
  if (isLocked && item.to !== "/dashboard") {
    return (
      <div
        title="Locked: Subscription payment required to unlock this feature."
        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-400 opacity-50 cursor-not-allowed select-none ${
          isCollapsed ? "md:justify-center md:px-0" : ""
        }`}
      >
        <span className="material-symbols-outlined shrink-0 text-[19px]">{item.icon}</span>
        <span className={`truncate flex-1 ${isCollapsed ? "md:hidden" : ""}`}>{item.label}</span>
        <span className={`material-symbols-outlined text-[13px] text-amber-600 ${isCollapsed ? "md:hidden" : ""}`}>lock</span>
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={isCollapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] transition-all duration-150 active:scale-[0.98] ${
          isCollapsed ? "md:justify-center md:px-0" : ""
        } ${
          isActive
            ? "bg-primary text-white font-semibold shadow-[0_2px_10px_rgba(0,105,72,0.24)]"
            : "text-slate-600 font-medium hover:bg-black/[0.04] hover:text-slate-900"
        }`
      }
    >
      <span className="material-symbols-outlined shrink-0 text-[19px]">{item.icon}</span>
      <span className={`truncate ${isCollapsed ? "md:hidden" : ""}`}>{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar({ isCollapsed, onToggleCollapse, isDrawerOpen, onDrawerClose }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isPlatformAdmin = user?.role?.includes("super_admin");
  const isSuperAdminManaging = useSocietyStore((state) => state.isSuperAdminManaging);
  const activeSociety = useSocietyStore(selectActiveSociety);
  const exitSuperAdminSocietyMode = useSocietyStore((state) => state.exitSuperAdminSocietyMode);

  const renewalMeta = getSubscriptionRenewalMeta(activeSociety);
  const isSubscriptionExpired = Boolean(activeSociety?.isSubscriptionPaid) && renewalMeta.isExpired;
  const isSubscriptionUnpaid =
    Boolean(activeSociety) &&
    !activeSociety.isSubscriptionPaid &&
    !isPlatformAdmin;

  const isNavLocked = (isSubscriptionUnpaid || isSubscriptionExpired) && !isPlatformAdmin;

  // If Super Admin has entered a specific society, include resident nav + platform section
  const isManagingSpecificSociety = isPlatformAdmin && isSuperAdminManaging && Boolean(activeSociety);
  const platformSection = ADMIN_NAV_SECTIONS.find((s) => s.id === "platform");
  const navSections = isManagingSpecificSociety
    ? [
        ...RESIDENT_NAV_SECTIONS,
        ...(platformSection ? [platformSection] : []),
      ]
    : isPlatformAdmin
      ? ADMIN_NAV_SECTIONS
      : RESIDENT_NAV_SECTIONS;

  const handleExitToPlatform = () => {
    exitSuperAdminSocietyMode();
    onDrawerClose?.();
    navigate("/dashboard");
  };

  return (
    <>
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={onDrawerClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-black/[0.06] bg-[#FAFBF9]/85 backdrop-blur-2xl transform transition-all duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 ${isCollapsed ? "md:w-20" : "md:w-64"}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-black/[0.06] px-4">
          <Link to="/dashboard" className="flex items-center gap-2 no-underline overflow-hidden">
            <img
              src="/logo-mark.png"
              alt="ResidentOne"
              className={`h-8 w-8 object-contain shrink-0 ${isCollapsed ? "mx-auto" : "hidden"}`}
            />
            <img
              src="/logo-transparent.png"
              alt="ResidentOne"
              className={`h-8 w-auto object-contain ${isCollapsed ? "hidden" : "block"}`}
            />
          </Link>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 transition-colors cursor-pointer md:flex active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isCollapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>

        {/* Navigation scroll list */}
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3.5 py-4">
          {isManagingSpecificSociety && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className={`flex items-center gap-2 ${isCollapsed ? "md:justify-center" : ""}`}>
                <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                <span className={`text-[11px] font-bold uppercase tracking-wider text-primary truncate ${isCollapsed ? "md:hidden" : ""}`}>
                  Managing Society
                </span>
              </div>
              <p className={`text-[13px] font-bold text-on-surface truncate ${isCollapsed ? "md:hidden" : ""}`}>
                {activeSociety.name}
              </p>
              <button
                type="button"
                onClick={handleExitToPlatform}
                title={isCollapsed ? "Exit to Platform Admin" : undefined}
                className={`flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-1.5 px-2 text-[12px] font-semibold text-white shadow-xs hover:bg-primary/90 cursor-pointer active:scale-95 ${
                  isCollapsed ? "md:px-0" : ""
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span className={`${isCollapsed ? "md:hidden" : ""}`}>Exit to Platform</span>
              </button>
            </div>
          )}

          {isNavLocked && (
            <Link
              to="/dashboard"
              onClick={onDrawerClose}
              className={`rounded-2xl border p-3 space-y-1 block no-underline transition-all ${
                isSubscriptionExpired
                  ? "border-red-500/20 bg-red-500/10 hover:bg-red-500/15"
                  : "border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15"
              }`}
            >
              <div className={`flex items-center gap-2 ${isCollapsed ? "md:justify-center" : ""}`}>
                <span className={`material-symbols-outlined text-[18px] ${
                  isSubscriptionExpired ? "text-red-600" : "text-amber-600"
                }`}>
                  {isSubscriptionExpired ? "error" : "lock"}
                </span>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  isSubscriptionExpired ? "text-red-900" : "text-amber-900"
                } ${isCollapsed ? "md:hidden" : ""}`}>
                  {isSubscriptionExpired ? "Subscription Expired" : "Action Required"}
                </span>
              </div>
              <p className={`text-[11px] font-medium leading-snug ${
                isSubscriptionExpired ? "text-red-950" : "text-amber-950"
              } ${isCollapsed ? "md:hidden" : ""}`}>
                {isSubscriptionExpired
                  ? `Expired ${renewalMeta.formattedDate || ""}. Renew now`
                  : "Pay subscription to unlock features"}
              </p>
            </Link>
          )}

          <Link
            to="/"
            onClick={onDrawerClose}
            title={isCollapsed ? "Go to Home" : undefined}
            className={`flex items-center gap-3 rounded-2xl bg-primary px-3.5 py-2.5 text-[13px] font-semibold text-white no-underline shadow-[0_2px_10px_rgba(0,105,72,0.22)] transition-all hover:bg-primary/90 active:scale-[0.98] ${
              isCollapsed ? "md:justify-center md:px-0" : ""
            }`}
          >
            <span className="material-symbols-outlined shrink-0 text-[19px]">home</span>
            <span className={`truncate ${isCollapsed ? "md:hidden" : ""}`}>Go to Home</span>
          </Link>

          {navSections.map((section) => (
            <div key={section.id} className="space-y-1">
              <p
                className={`px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 ${
                  isCollapsed ? "md:hidden" : ""
                }`}
              >
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItem
                    key={item.to}
                    item={item}
                    isCollapsed={isCollapsed}
                    isLocked={isNavLocked}
                    onNavigate={onDrawerClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
