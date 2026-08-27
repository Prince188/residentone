import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveMembership,
  selectActiveSociety,
} from "../../stores/society.store";
import { getHouseCards, extractApiError } from "../../lib/houses";
import AssignHouseModal from "./AssignHouseModal";

const ADMIN_ROLES = ["super_admin", "society_admin"];

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "owner", label: "Owned" },
  { id: "renter", label: "Rented" },
  { id: "vacant", label: "Vacant" },
];

function HouseCard({ house, onClick }) {
  const status = house.isAssigned
    ? "Owned"
    : house.isRented
      ? "Rented"
      : "Vacant";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-xl border p-4 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md ${
        house.isAssigned || house.isRented
          ? "border-success bg-secondary-fixed"
          : "border-outline-variant bg-surface-container-lowest"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="material-symbols-outlined text-[26px] text-primary">
          {house.isAssigned || house.isRented ? "home" : "home_work"}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-label-sm font-semibold ${
            house.isAssigned || house.isRented
              ? "bg-primary-fixed text-on-primary-fixed"
              : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          {status}
        </span>
      </div>
      <p className="mt-3 text-headline-sm font-semibold text-on-surface">
        House {house.label}
      </p>
      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
        {(house.owner || house.tenant)?.name || "No resident assigned"}
      </p>
      {(() => {
        const vehicles = (house.owner || house.tenant)?.vehicles || [];
        if (!vehicles.length) return null;
        return (
          <p className="mt-1 flex items-center gap-1 truncate text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">directions_car</span>
            {vehicles[0]}
            {vehicles.length > 1 ? ` +${vehicles.length - 1}` : ""}
          </p>
        );
      })()}
      {house.hasPendingInvite && !house.isAssigned && !house.isRented && (
        <p className="mt-1 flex items-center gap-1 text-label-sm text-primary">
          <span className="material-symbols-outlined text-[14px]">link</span>
          Invite link sent
        </p>
      )}
    </button>
  );
}

export default function ManageHousesPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedHouse, setSelectedHouse] = useState(null);

  const isAdmin = ADMIN_ROLES.includes(activeMembership?.role);

  const housesQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety && isAdmin),
  });

  const houses = housesQuery.data || [];

  const filtered = useMemo(() => {
    let result = houses;
    if (statusFilter === "owner") result = result.filter((h) => h.isAssigned);
    else if (statusFilter === "renter") result = result.filter((h) => !h.isAssigned && h.isRented);
    else if (statusFilter === "vacant") result = result.filter((h) => !h.isAssigned && !h.isRented);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (h) =>
          String(h.label).toLowerCase().includes(q) ||
          (h.owner?.name || "").toLowerCase().includes(q) ||
          (h.tenant?.name || "").toLowerCase().includes(q) ||
          (h.owner?.phone || "").includes(q) ||
          (h.tenant?.phone || "").includes(q) ||
          (h.owner?.vehicles || []).some((v) => String(v).toLowerCase().includes(q)) ||
          (h.tenant?.vehicles || []).some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return result;
  }, [houses, search, statusFilter]);

  const assignedCount = houses.filter((h) => h.isAssigned || h.isRented).length;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="mt-3 text-headline-sm text-on-surface">Admins only</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Only the society admin can manage house assignments.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-block text-label-md text-primary no-underline hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/dashboard"
            className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Dashboard
          </Link>
          <h1 className="page-title">Manage Houses</h1>
          <p className="page-subtitle">
            {activeSociety ? activeSociety.name : ""} ·{" "}
            {housesQuery.isLoading
              ? "Loading houses..."
              : `${assignedCount} of ${houses.length} houses assigned`}
          </p>
        </div>
        <div className="w-full max-w-xs space-y-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter houses"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:hidden"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.label} (
                {filter.id === "all" && houses.length}
                {filter.id === "owner" &&
                  houses.filter((h) => h.isAssigned).length}
                {filter.id === "renter" &&
                  houses.filter((h) => !h.isAssigned && h.isRented).length}
                {filter.id === "vacant" &&
                  houses.filter((h) => !h.isAssigned && !h.isRented).length}
                )
              </option>
            ))}
          </select>
          <div className="hidden flex-wrap gap-1.5 sm:flex">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`rounded-full border px-3 py-1 text-label-md transition-colors ${
                  statusFilter === filter.id
                    ? "border-inverse-surface bg-inverse-surface text-white"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-secondary-fixed"
                }`}
              >
                {filter.label}
                {filter.id === "owner" &&
                  ` (${houses.filter((h) => h.isAssigned).length})`}
                {filter.id === "renter" &&
                  ` (${houses.filter((h) => !h.isAssigned && h.isRented).length})`}
                {filter.id === "vacant" &&
                  ` (${houses.filter((h) => !h.isAssigned && !h.isRented).length})`}
              </button>
            ))}
          </div>
          <div>
            <p className="mb-1 text-label-sm font-medium text-on-surface-variant">
              General search
            </p>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="House, name, phone or vehicle no..."
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-4 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <p className="mt-1 flex items-center gap-1 text-label-sm text-outline">
              <span className="material-symbols-outlined text-[14px]">directions_car</span>
              Try vehicle no. e.g. GJ01AB1234
            </p>
          </div>
        </div>
      </section>

      {housesQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(housesQuery.error, "Failed to load houses.")}
        </div>
      )}

      {housesQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-surface-container-high"
            />
          ))}
        </div>
      )}

      {housesQuery.isSuccess && (
        <>
          {houses.length === 0 ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
              No houses found for this society.
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
              No houses match your search or filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {filtered.map((house) => (
                <HouseCard
                  key={house.id}
                  house={house}
                  onClick={() => setSelectedHouse(house)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedHouse && (
        <AssignHouseModal
          key={selectedHouse.id}
          house={selectedHouse}
          onClose={() => setSelectedHouse(null)}
        />
      )}
    </div>
  );
}
