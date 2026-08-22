import { SOCIETY_STATUS_LABELS } from "../../lib/societies";

const STATUS_STYLES = {
  pending: "bg-secondary-fixed text-on-secondary-fixed",
  active: "bg-tertiary-fixed text-on-tertiary-fixed",
  rejected: "bg-error-container text-on-error-container",
  suspended: "bg-surface-container-high text-on-surface-variant",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-label-sm font-semibold capitalize ${
        STATUS_STYLES[status] || "bg-surface-container-high text-on-surface-variant"
      }`}
    >
      {SOCIETY_STATUS_LABELS[status] || status}
    </span>
  );
}
