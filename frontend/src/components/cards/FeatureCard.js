import { Link } from "react-router-dom";

export default function FeatureCard({ icon, title, description, to }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3.5 rounded-2xl border border-black/[0.06] bg-white p-4 sm:p-5 shadow-apple transition-all duration-200 hover:-translate-y-0.5 hover:shadow-apple-hover hover:border-primary/30 no-underline active:scale-[0.98]"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
        <span className="material-symbols-outlined text-[22px] text-primary">
          {icon}
        </span>
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-md font-bold text-on-surface group-hover:text-primary transition-colors font-display">
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{description}</span>
        )}
      </span>
    </Link>
  );
}