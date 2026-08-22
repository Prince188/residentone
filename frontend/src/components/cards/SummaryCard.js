import { Link } from "react-router-dom";

const TONE_CLASSES = {
  default: "text-on-surface",
  success: "text-tertiary",
  warning: "text-error",
};

export default function SummaryCard({ icon, label, value, hint, to, tone = "default" }) {
  const valueClass = TONE_CLASSES[tone] || TONE_CLASSES.default;

  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 transition-colors hover:border-primary no-underline"
    >
      <div className="flex items-center justify-between">
        <span className="material-symbols-outlined text-[22px] text-on-surface-variant group-hover:text-primary transition-colors">
          {icon}
        </span>
        <span className="material-symbols-outlined text-[18px] text-outline opacity-0 group-hover:opacity-100 transition-opacity">
          arrow_forward
        </span>
      </div>
      <div>
        <p className="text-label-sm uppercase tracking-[0.1em] text-on-surface-variant">{label}</p>
        <p className={`mt-1 text-body-lg font-semibold ${valueClass}`}>{value}</p>
        {hint && <p className="mt-0.5 text-label-sm text-on-surface-variant">{hint}</p>}
      </div>
    </Link>
  );
}
