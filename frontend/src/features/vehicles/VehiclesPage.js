import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import { getHouseCards, extractApiError } from "../../lib/houses";

export default function VehiclesPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const [search, setSearch] = useState("");

  const housesQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety),
  });

  const houses = housesQuery.data || [];

  const vehicleEntries = useMemo(() => {
    const entries = [];
    houses.forEach((h) => {
      const resident = h.owner || h.tenant;
      if (!resident) return;
      const vehicles = resident.vehicles || [];
      vehicles.forEach((vehicle) => {
        entries.push({
          key: `${h.id}-${vehicle}`,
          houseLabel: h.label,
          houseId: h.id,
          ownerName: resident.name,
          phone: resident.phone,
          vehicle: String(vehicle).toUpperCase(),
          status: h.isAssigned ? "Owned" : h.isRented ? "Rented" : "Vacant",
        });
      });
    });
    return entries;
  }, [houses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicleEntries;
    return vehicleEntries.filter(
      (e) =>
        e.vehicle.toLowerCase().includes(q) ||
        String(e.houseLabel).toLowerCase().includes(q) ||
        (e.ownerName || "").toLowerCase().includes(q) ||
        (e.phone || "").includes(q)
    );
  }, [vehicleEntries, search]);

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
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">directions_car</span>
            Vehicles
          </h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}
            {housesQuery.isLoading
              ? "Loading vehicles..."
              : `${vehicleEntries.length} vehicle${vehicleEntries.length === 1 ? "" : "s"} registered`}
          </p>
        </div>
      </section>

      <div className="relative max-w-md">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vehicle no., house, owner or phone..."
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-4 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {housesQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(housesQuery.error, "Failed to load vehicles.")}
        </div>
      )}

      {housesQuery.isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {housesQuery.isSuccess && (
        <>
          {vehicleEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
              <span className="material-symbols-outlined text-[40px] text-on-surface-variant">directions_car</span>
              <p className="mt-3 text-body-md font-semibold text-on-surface">No vehicles registered yet</p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Assign a house with vehicle details to see it here.
              </p>
              <Link to="/houses" className="mt-4 inline-block text-label-md text-primary hover:underline">
                Go to Manage Houses →
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
              No vehicles match “{search.trim()}”.
            </div>
          ) : (
            <>
              <p className="text-label-sm text-on-surface-variant">
                Showing {filtered.length} of {vehicleEntries.length}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((e) => (
                  <div
                    key={e.key}
                    className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-[22px]">directions_car</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-body-md font-bold tracking-wide text-on-surface">
                        {e.vehicle}
                      </p>
                      <p className="truncate text-body-sm font-semibold text-on-surface">
                        {e.ownerName}
                      </p>
                      <p className="flex items-center gap-1 truncate text-label-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">home</span>
                        House {e.houseLabel} · {e.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
