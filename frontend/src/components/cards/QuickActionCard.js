import { Link } from "react-router-dom";

export default function QuickActionCard({ icon, label, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl bg-primary-light border border-primary/20 px-4 py-3.5 text-primary shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-apple-hover active:scale-[0.98] no-underline group"
    >
      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
        <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>
      </div>
      <span className="truncate text-body-sm font-semibold">{label}</span>
    </Link>
  );
}