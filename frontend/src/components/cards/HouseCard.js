import { Link } from "react-router-dom";

// Helper for status styling in billing mode
const BILLING_STATUS_CONFIG = {
  paid: {
    label: "Paid",
    icon: "check_circle",
    pill: "bg-emerald-100 text-emerald-800 border-emerald-200/80",
    border: "hover:border-emerald-400",
  },
  late_paid: {
    label: "Late Paid",
    icon: "check_circle",
    pill: "bg-teal-100 text-teal-800 border-teal-200/80",
    border: "hover:border-teal-400",
  },
  pending: {
    label: "Pending",
    icon: "schedule",
    pill: "bg-amber-100 text-amber-800 border-amber-200/80",
    border: "hover:border-amber-400",
  },
  overdue: {
    label: "Overdue",
    icon: "warning",
    pill: "bg-rose-100 text-rose-800 border-rose-200/80",
    border: "hover:border-rose-400",
  },
  closed: {
    label: "Closed",
    icon: "block",
    pill: "bg-zinc-100 text-zinc-700 border-zinc-200",
    border: "hover:border-outline",
  },
};

// Format currency
function formatCurrency(amount) {
  if (amount == null) return null;
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

export default function HouseCard({
  house,
  variant = "directory", // "directory" | "billing"
  to,
  onClick,
  className = "",
  // Directory specific props
  familyMembers = [],
  isOwner: isOwnerProp,
  onManageRenters,
  // Billing specific props
  status = "pending",
  amount,
  dateLine,
  subtitle,
}) {
  const isRented = Boolean(house?.isRented || house?.isRenterOccupied);
  const isAssigned = Boolean(house?.isAssigned && !isRented);
  const isVacant = !house?.isAssigned && !isRented && !house?.isOccupied;
  const isOwner = isOwnerProp ?? isAssigned;

  // Directory status configuration
  const directoryStatusConfig = isRented
    ? {
        label: "Rented",
        icon: "key",
        pill: "bg-sky-100 text-sky-800 border-sky-200/80",
        border: "hover:border-sky-400",
      }
    : isOwner
    ? {
        label: "Owned",
        icon: "verified",
        pill: "bg-emerald-100 text-emerald-800 border-emerald-200/80",
        border: "hover:border-emerald-400",
      }
    : {
        label: "Vacant",
        icon: "home",
        pill: "bg-zinc-100 text-zinc-700 border-zinc-200",
        border: "hover:border-outline",
      };

  // Select active status configuration based on variant
  const activeStatusConfig =
    variant === "billing"
      ? BILLING_STATUS_CONFIG[status] || BILLING_STATUS_CONFIG.pending
      : directoryStatusConfig;

  // Resident name / attribution
  const residentName =
    house?.ownerName ||
    (house?.tenant || house?.owner)?.name ||
    house?.residentName ||
    null;

  // Vehicles list
  const vehicles = (house?.tenant || house?.owner)?.vehicles || house?.vehicles || [];

  // Card container classes
  const cardClasses = `group flex flex-col justify-between rounded-2xl border border-outline-variant/70 bg-surface-container-lowest p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer no-underline min-h-[140px] ${activeStatusConfig.border} ${className}`;

  const cardContent = (
    <>
      <div className="w-full">
        {/* Top Header Row: House Title/Floor & Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-title-md font-extrabold text-on-surface leading-tight truncate group-hover:text-primary transition-colors">
              House {house?.label || house?.unitNumber || "—"}
            </h4>
            <span className="truncate text-[11px] font-semibold text-outline">
              {house?.block ? `Wing ${house.block}` : "General"}
              {house?.floor != null ? ` · Floor ${house.floor}` : ""}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold shrink-0 ${activeStatusConfig.pill}`}
          >
            <span className="material-symbols-outlined text-[13px]">
              {activeStatusConfig.icon}
            </span>
            {activeStatusConfig.label}
          </span>
        </div>

        {/* Resident Attribution */}
        <p className="mt-2.5 truncate text-body-sm font-medium text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-outline">
            {isVacant && variant === "directory" ? "person_off" : "person"}
          </span>
          <span className="truncate">
            {subtitle || residentName || (isVacant ? "No resident assigned" : "Resident")}
          </span>
        </p>
      </div>

      {/* Footer Content */}
      <div className="w-full border-t border-outline-variant/40 pt-2.5 mt-3">
        {variant === "billing" ? (
          /* Billing Footer */
          <div className="flex flex-col gap-1 text-[11px] text-on-surface-variant">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 font-bold text-on-surface text-body-sm">
                <span className="material-symbols-outlined text-[15px] text-primary">
                  payments
                </span>
                {amount != null ? formatCurrency(amount) : "No charge"}
              </span>
            </div>

            {dateLine && (
              <div className="flex items-center gap-1 text-[11px] font-medium text-outline truncate">
                <span className="material-symbols-outlined shrink-0 text-[13px]">event</span>
                <span className="truncate">{dateLine}</span>
              </div>
            )}
          </div>
        ) : (
          /* Directory Footer */
          <div className="flex items-center justify-between gap-1 text-[11px] text-on-surface-variant">
            <span className="flex items-center gap-1.5 truncate">
              <span className="material-symbols-outlined text-[14px] text-outline">
                directions_car
              </span>
              {vehicles.length > 0 ? (
                <span className="truncate font-mono font-bold text-on-surface">
                  {vehicles[0]}
                  {vehicles.length > 1 ? ` +${vehicles.length - 1}` : ""}
                </span>
              ) : (
                <span className="text-outline/70">No vehicle</span>
              )}
            </span>

            <span className="shrink-0">
              {familyMembers.length > 0 ? (
                <span className="inline-flex items-center gap-1 font-bold text-primary">
                  <span className="material-symbols-outlined text-[13px]">group</span>
                  {familyMembers.length}
                </span>
              ) : house?.hasPendingInvite && isVacant ? (
                <span className="inline-flex items-center gap-0.5 font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded-md">
                  <span className="material-symbols-outlined text-[12px]">send</span>
                  Invited
                </span>
              ) : isOwner && onManageRenters ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageRenters(house);
                  }}
                  className="inline-flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[12px]">key</span>
                  Renters
                </button>
              ) : null}
            </span>
          </div>
        )}
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cardClasses}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cardClasses}
    >
      {cardContent}
    </div>
  );
}
