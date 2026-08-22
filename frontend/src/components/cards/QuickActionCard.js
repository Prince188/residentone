import { Link } from "react-router-dom";

export default function QuickActionCard({ icon, label, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl bg-primary-fixed px-4 py-4 text-on-primary-fixed transition-transform hover:-translate-y-0.5 hover:shadow-md no-underline"
    >
      <span className="material-symbols-outlined shrink-0 text-[22px]">{icon}</span>
      <span className="truncate text-body-sm font-semibold">{label}</span>
    </Link>
  );
}
