import { Link } from "react-router-dom";

export default function FeatureCard({ icon, title, description, to }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:border-primary hover:bg-surface-container-low no-underline"
    >
      <span className="material-symbols-outlined shrink-0 text-[24px] text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors">
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-label-sm text-on-surface-variant">{description}</span>
        )}
      </span>
    </Link>
  );
}
