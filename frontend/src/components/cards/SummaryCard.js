import { Link } from "react-router-dom";

const TONE_CLASSES = {
  default: "text-on-surface",
  success: "text-emerald-700",
  warning: "text-rose-600",
};

export default function SummaryCard({ icon, label, value, hint, to, tone = "default" }) {
  const valueClass = TONE_CLASSES[tone] || TONE_CLASSES.default;

  return (
    <Link
      to={to}
      className="group flex flex-col gap-2 rounded-2xl border border-black/[0.06] bg-white p-4 sm:p-5 shadow-apple transition-all duration-200 hover:-translate-y-0.5 hover:shadow-apple-hover hover:border-primary/30 no-underline active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center group-hover:bg-primary-light transition-colors">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant group-hover:text-primary transition-colors">
            {icon}
          </span>
        </div>
        <span className="material-symbols-outlined text-[18px] text-on-surface-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
          arrow_forward
        </span>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-on-surface-muted font-bold">{label}</p>
        <p className={`mt-1 text-xl font-bold font-display ${valueClass}`}>{value}</p>
        {hint && <p className="mt-0.5 text-xs text-on-surface-variant">{hint}</p>}
      </div>
    </Link>
  );
}