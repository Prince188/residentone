import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveMembership,
} from "../../stores/society.store";
import useAuthStore from "../../stores/auth.store";
import { getHouse } from "../../lib/houses";
import AssignHouseModal from "../houses/AssignHouseModal";

function UnitCard({ unit, ownerName, onManageRenters }) {
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
      {unit.isOwner && (
        <button
          type="button"
          onClick={onManageRenters}
          className="mt-4 w-full rounded-lg bg-primary px-3 py-1.5 text-label-sm font-semibold text-on-primary hover:opacity-90 transition-opacity"
        >
          Manage Renters
        </button>
      )}
    </article>
  );
}

export default function MyUnitPage() {
  const activeMembership = useSocietyStore(selectActiveMembership);
  const user = useAuthStore((state) => state.user);
  const [selectedHouseId, setSelectedHouseId] = useState(null);

  const units = activeMembership?.units || [];

  const houseQuery = useQuery({
    queryKey: ["house-detail", selectedHouseId],
    queryFn: async () => (await getHouse(selectedHouseId)).data.data,
    enabled: Boolean(selectedHouseId),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-stack-lg">
      <section>
        <Link
          to="/dashboard"
          className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Dashboard
        </Link>
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
            <UnitCard
              key={unit.id}
              unit={unit}
              ownerName={user?.name || ""}
              onManageRenters={() => setSelectedHouseId(unit.id)}
            />
          ))}
        </div>
      )}

      {selectedHouseId && (
        houseQuery.isLoading ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="rounded-xl bg-surface-container-lowest p-6 shadow-xl text-body-md text-on-surface">
              Loading house details...
            </div>
          </div>
        ) : houseQuery.data ? (
          <AssignHouseModal
            house={houseQuery.data}
            onClose={() => setSelectedHouseId(null)}
          />
        ) : null
      )}
    </div>
  );
}
