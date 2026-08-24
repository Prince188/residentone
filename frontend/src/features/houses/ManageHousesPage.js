import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveMembership,
  selectActiveSociety,
} from "../../stores/society.store";
import { getHouseCards, extractApiError } from "../../lib/houses";

const ADMIN_ROLES = ["super_admin", "society_admin"];

function HouseCard({ house }) {
  return (
    <Link
      to={`/houses/${house.id}`}
      className={`block rounded-xl border p-4 no-underline transition-transform hover:-translate-y-0.5 hover:shadow-md ${
        house.isAssigned
          ? "border-success bg-secondary-fixed"
          : "border-outline-variant bg-surface-container-lowest"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="material-symbols-outlined text-[26px] text-primary">
          {house.isAssigned ? "home" : "home_work"}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-label-sm font-semibold ${
            house.isAssigned
              ? "bg-primary-fixed text-on-primary-fixed"
              : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          {house.isAssigned ? "Owned" : "Vacant"}
        </span>
      </div>
      <p className="mt-3 text-headline-sm font-semibold text-on-surface">
        House {house.label}
      </p>
      <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
        {house.owner ? house.owner.name : "No owner assigned"}
      </p>
      {house.hasPendingInvite && !house.isAssigned && (
        <p className="mt-1 flex items-center gap-1 text-label-sm text-primary">
          <span className="material-symbols-outlined text-[14px]">link</span>
          Invite link sent
        </p>
      )}
    </Link>
  );
}

export default function ManageHousesPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");

  const isAdmin = ADMIN_ROLES.includes(activeMembership?.role);

  const housesQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety && isAdmin),
  });

  const houses = housesQuery.data || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return houses;
    const q = search.trim().toLowerCase();
    return houses.filter(
      (h) =>
        String(h.label).toLowerCase().includes(q) ||
        (h.owner?.name || "").toLowerCase().includes(q) ||
        (h.owner?.phone || "").includes(q)
    );
  }, [houses, search]);

  const assignedCount = houses.filter((h) => h.isAssigned).length;

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
        <div className="w-full max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search house no. or owner..."
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
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
              No houses match your search.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {filtered.map((house) => (
                <HouseCard key={house.id} house={house} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
