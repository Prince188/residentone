import { Link } from "react-router-dom";
import useSocietyStore, { selectActiveMembership } from "../../stores/society.store";

export const UNIT_STATUS = {
  paid: {
    label: "Paid",
    card: "border-emerald-200 bg-emerald-50",
    stripe: "bg-emerald-500",
    iconBox: "bg-emerald-100 text-emerald-700",
    pill: "bg-emerald-100 text-emerald-800",
    icon: "check_circle",
    colorClass: "text-emerald-700",
  },
  pending: {
    label: "Pending",
    card: "border-amber-200 bg-amber-50",
    stripe: "bg-amber-500",
    iconBox: "bg-amber-100 text-amber-700",
    pill: "bg-amber-100 text-amber-800",
    icon: "schedule",
    colorClass: "text-amber-700",
  },
  overdue: {
    label: "Overdue",
    card: "border-red-200 bg-red-50",
    stripe: "bg-red-500",
    iconBox: "bg-red-100 text-red-700",
    pill: "bg-red-100 text-red-800",
    icon: "error",
    colorClass: "text-red-700",
  },
};

// Mock payment status per unit until maintenance API is wired
export function getUnitStatuses(units) {
  const statuses = {};
  units.forEach((unit, index) => {
    statuses[unit.id] = index % 3 === 0 ? "overdue" : index % 3 === 1 ? "pending" : "paid";
  });
  return statuses;
}

function UnitCard({ unit, statusKey }) {
  const status = UNIT_STATUS[statusKey];
  return (
    <Link
      to={`/maintenance/${unit.id}`}
      className={`relative block overflow-hidden rounded-xl border p-4 pl-5 no-underline transition-transform hover:-translate-y-0.5 hover:shadow-md ${status.card}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${status.stripe}`} />
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${status.iconBox}`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {unit.isOwner ? "home" : "home_work"}
          </span>
        </span>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-semibold ${status.pill}`}
        >
          <span className="material-symbols-outlined text-[13px]">{status.icon}</span>
          {status.label}
        </span>
      </div>
      <p className="mt-3 truncate text-headline-sm font-semibold text-on-surface">
        House {unit.label}
      </p>
      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
        {unit.isOwner ? "Owner" : "Renter"}
      </p>
    </Link>
  );
}

export default function MaintenancePage() {
  const activeMembership = useSocietyStore(selectActiveMembership);
  const units = activeMembership?.units || [];
  const statuses = getUnitStatuses(units);

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <section>
        <h1 className="text-headline-md text-on-surface">Maintenance</h1>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Select a house to view dues and manage payments.
        </p>
      </section>

      {units.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">home_work</span>
          <p className="mt-3 text-body-md text-on-surface-variant">
            You are not assigned to any house yet. Contact your society admin to get added.
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {units.map((unit) => (
            <UnitCard key={unit.id} unit={unit} statusKey={statuses[unit.id] || "pending"} />
          ))}
        </section>
      )}
    </div>
  );
}
