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
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm text-outline opacity-50 cursor-not-allowed select-none ${
          isCollapsed ? "md:justify-center md:px-0" : ""
        }`}
      >
        <span className="material-symbols-outlined shrink-0 text-[20px]">{item.icon}</span>
        <span className={`truncate flex-1 ${isCollapsed ? "md:hidden" : ""}`}>{item.label}</span>
        <span className={`material-symbols-outlined text-[14px] text-amber-600 ${isCollapsed ? "md:hidden" : ""}`}>lock</span>
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={isCollapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm transition-colors ${
          isCollapsed ? "md:justify-center md:px-0" : ""
        } ${
          isActive
            ? "bg-primary-fixed font-semibold text-on-primary-fixed"
            : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        }`
      }
    >
      <span className="material-symbols-outlined shrink-0 text-[20px]">{item.icon}</span>
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

  // If Super Admin has entered a specific society, show full society resident/admin nav
  const isManagingSpecificSociety = isPlatformAdmin && isSuperAdminManaging && Boolean(activeSociety);
  const navSections = isManagingSpecificSociety
    ? RESIDENT_NAV_SECTIONS
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
          className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden"
          onClick={onDrawerClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-outline-variant bg-surface-container-lowest transform transition-all duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 ${isCollapsed ? "md:w-20" : "md:w-64"}`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-outline-variant px-4">
          <Link to="/dashboard" className="flex items-center gap-2 no-underline">
            <span className="material-symbols-outlined text-primary text-[28px]">apartment</span>
            <span
              className={`text-[20px] font-bold tracking-tight text-on-surface ${
                isCollapsed ? "md:hidden" : ""
              }`}
            >
              ResidentOne
            </span>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto hidden h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer md:flex"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isCollapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
          {isManagingSpecificSociety && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className={`flex items-center gap-2 ${isCollapsed ? "md:justify-center" : ""}`}>
                <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                <span className={`text-[11px] font-bold uppercase tracking-wider text-primary truncate ${isCollapsed ? "md:hidden" : ""}`}>
                  Managing Society
                </span>
              </div>
              <p className={`text-body-sm font-bold text-on-surface truncate ${isCollapsed ? "md:hidden" : ""}`}>
                {activeSociety.name}
              </p>
              <button
                type="button"
                onClick={handleExitToPlatform}
                title={isCollapsed ? "Exit to Platform Admin" : undefined}
                className={`flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 px-2 text-[12px] font-semibold text-on-primary shadow-sm hover:bg-primary/90 cursor-pointer ${
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
              className={`rounded-xl border p-3 space-y-1 block no-underline ${
                isSubscriptionExpired
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-amber-500/30 bg-amber-500/10"
              }`}
            >
              <div className={`flex items-center gap-2 ${isCollapsed ? "md:justify-center" : ""}`}>
                <span className={`material-symbols-outlined text-[18px] ${
                  isSubscriptionExpired ? "text-red-600" : "text-amber-600"
                }`}>
                  lock
                </span>
                <span className={`text-[11px] font-bold uppercase tracking-wider truncate ${
                  isSubscriptionExpired ? "text-red-900" : "text-amber-900"
                } ${isCollapsed ? "md:hidden" : ""}`}>
                  {isSubscriptionExpired ? "Subscription Expired" : "Payment Due"}
                </span>
              </div>
              <p className={`text-[11px] font-medium ${
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
            className={`flex items-center gap-3 rounded-lg bg-primary px-3 py-2.5 text-body-sm font-semibold text-on-primary no-underline transition-colors hover:bg-primary/90 ${
              isCollapsed ? "md:justify-center md:px-0" : ""
            }`}
          >
            <span className="material-symbols-outlined shrink-0 text-[20px]">home</span>
            <span className={`truncate ${isCollapsed ? "md:hidden" : ""}`}>Go to Home</span>
          </Link>

          {navSections.map((section) => (
            <div key={section.id}>
              <p
                className={`mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-outline ${
                  isCollapsed ? "md:hidden" : ""
                }`}
              >
                {section.label}
              </p>
              <div className="space-y-1.5">
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
