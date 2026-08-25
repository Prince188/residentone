import useSocietyStore, {
  selectActiveMembership,
} from "../../stores/society.store";
import useAuthStore from "../../stores/auth.store";

function UnitCard({ unit, ownerName }) {
  return (
    <article
      className={`block rounded-xl border p-4 ${
        unit.isOwner
          ? "border-success bg-secondary-fixed"
          : "border-outline-variant bg-surface-container-lowest"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="material-symbols-outlined text-[26px] text-primary">
          {unit.isOwner ? "home" : "home_work"}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-label-sm font-semibold ${
            unit.isOwner
              ? "bg-primary-fixed text-on-primary-fixed"
              : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          {unit.isOwner ? "Owned" : "Resident"}
        </span>
      </div>
      <p className="mt-3 text-headline-sm font-semibold text-on-surface">
        House {unit.label}
      </p>
      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
        {ownerName}
      </p>
    </article>
  );
}

export default function MyUnitPage() {
  const activeMembership = useSocietyStore(selectActiveMembership);
  const user = useAuthStore((state) => state.user);

  const units = activeMembership?.units || [];

  return (
    <div className="mx-auto max-w-6xl space-y-stack-lg">
      <section>
        <h1 className="page-title">My Unit</h1>
        <p className="page-subtitle">
          Houses linked to your account.
        </p>
      </section>

      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
          No unit is linked to your account yet. Contact your society admin.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {units.map((unit) => (
            <UnitCard key={unit.id} unit={unit} ownerName={user?.name || ""} />
          ))}
        </div>
      )}
    </div>
  );
}
