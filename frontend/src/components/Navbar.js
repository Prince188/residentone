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

  return (
    <nav className="bg-surface-container-lowest fixed top-0 w-full z-50 transition-colors duration-300">
      <div className="flex justify-between items-center max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop h-24 border-b border-surface-variant">
        <Link to="/" className="text-[24px] font-bold text-on-surface flex items-center gap-2 tracking-tight no-underline">
          <span className="material-symbols-outlined text-primary text-[32px]">apartment</span>
          ResidentOne
        </Link>
        <div className="hidden md:flex space-x-12">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`font-label-md text-label-md uppercase tracking-widest h-24 flex items-center transition-colors cursor-pointer active:opacity-80 no-underline ${
                location.pathname === item.to
                  ? "text-primary"
                  : "text-on-surface hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-6">
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
            className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-inverse-surface transition-colors uppercase tracking-widest no-underline flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add_business</span>
            Create Society
          </Link>
        </div>
        <div className="md:hidden">
          <Link
            to="/create-society"
            aria-label="Create Society"
            className="bg-primary text-on-primary font-label-md text-label-md px-4 py-2.5 rounded-lg transition-colors no-underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">add_business</span>
            <span className="text-[12px] tracking-widest uppercase font-semibold">Create Society</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
