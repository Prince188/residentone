import { Link, NavLink } from "react-router-dom";
import useAuthStore from "../../stores/auth.store";
import {
  RESIDENT_NAV_SECTIONS,
  ADMIN_NAV_SECTIONS,
} from "../../config/navigation";

function NavItem({ item, isCollapsed, onNavigate }) {
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
  const user = useAuthStore((state) => state.user);
  const isPlatformAdmin = user?.role === "super_admin";
  const navSections = isPlatformAdmin ? ADMIN_NAV_SECTIONS : RESIDENT_NAV_SECTIONS;
  const homePath = isPlatformAdmin ? "/admin/societies" : "/dashboard";

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
          <Link to={homePath} className="flex items-center gap-2 no-underline">
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

        <nav className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-6">
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
