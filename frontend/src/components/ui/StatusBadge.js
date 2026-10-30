import { SOCIETY_STATUS_LABELS } from "../../lib/societies";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-800 border border-amber-200/80",
  active: "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
  rejected: "bg-rose-50 text-rose-800 border border-rose-200/80",
  suspended: "bg-slate-100 text-slate-700 border border-slate-200",
  archived: "bg-surface-container-high text-on-surface-muted border border-black/[0.06]",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        STATUS_STYLES[status] || "bg-surface-container text-on-surface-variant border border-black/[0.04]"
      }`}
    >
      {SOCIETY_STATUS_LABELS[status] || status}
    </span>
  );
}