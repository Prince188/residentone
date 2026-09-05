import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveMembership,
  selectActiveSociety,
} from "../../stores/society.store";
import { getHouseCards, updateUnit, deleteUnit, extractApiError } from "../../lib/houses";
import { getFamilyMembers } from "../../lib/familyMembers";
import AssignHouseModal from "./AssignHouseModal";
import EditHouseModal from "./EditHouseModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import api from "../../lib/api";
import { hasPermissionForMembership, isPureWingAdmin } from "../../lib/permissions";
import HouseCard from "../../components/cards/HouseCard";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "owner", label: "Owned" },
  { id: "renter", label: "Rented" },
  { id: "vacant", label: "Vacant" },
];

export default function ManageHousesPage() {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [editingHouse, setEditingHouse] = useState(null);
  const [deletingHouse, setDeletingHouse] = useState(null);
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const updateMutation = useMutation({
    mutationFn: (data) => updateUnit(editingHouse?.id, data).then((r) => r.data.data),
    onSuccess: () => {
      setEditingHouse(null);
      setEditError("");
      queryClient.invalidateQueries({ queryKey: ["house-cards"] });
      queryClient.invalidateQueries({ queryKey: ["my-societies"] });
    },
    onError: (err) => setEditError(extractApiError(err, "Failed to update house")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteUnit(deletingHouse?.id).then((r) => r.data.data),
    onSuccess: () => {
      setDeletingHouse(null);
      setDeleteError("");
      queryClient.invalidateQueries({ queryKey: ["house-cards"] });
      queryClient.invalidateQueries({ queryKey: ["my-societies"] });
    },
    onError: (err) => setDeleteError(extractApiError(err, "Failed to delete house")),
  });

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManageHouses = hasPermissionForMembership(activeMembership, "manage_houses", permissionsQuery.data);

  const housesQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety && canManageHouses),
  });

  const houses = useMemo(() => housesQuery.data || [], [housesQuery.data]);

  const familyQuery = useQuery({
    queryKey: ["family-members", activeSociety?.id],
    queryFn: async () => (await getFamilyMembers()).data.data,
    enabled: Boolean(activeSociety && canManageHouses),
  });
  const familyByHouse = useMemo(() => {
    const map = {};
    const familyMembersList = familyQuery.data || [];
    houses.forEach((house) => {
      const activeResidentId = house.tenant?.id || house.owner?.id || null;
      if (activeResidentId) {
        map[String(house.id)] = familyMembersList.filter(
          (m) => String(m.addedBy?._id || m.addedBy) === String(activeResidentId)
        );
      } else {
        map[String(house.id)] = familyMembersList.filter(
          (m) => String(m.unitId?._id || m.unitId) === String(house.id)
        );
      }
    });
    return map;
  }, [houses, familyQuery.data]);

  const filtered = useMemo(() => {
    let result = houses;
    // Pure wing admin sees only assigned wings; dual society_admin+wing_admin sees all
    if (isPureWingAdmin(activeMembership)) {
      const allowed = new Set((activeMembership.assignedWings || []).map((w) => String(w).toUpperCase()));
      if (allowed.size > 0) result = result.filter((h) => allowed.has(String(h.block || "").toUpperCase()));
    }
    if (statusFilter === "owner") result = result.filter((h) => h.isAssigned && !h.isRented);
    else if (statusFilter === "renter") result = result.filter((h) => h.isRented);
    else if (statusFilter === "vacant") result = result.filter((h) => !h.isAssigned && !h.isRented);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (h) => {
          const fam = familyByHouse[String(h.id)] || [];
          return (
            String(h.label).toLowerCase().includes(q) ||
            (h.block || "").toLowerCase().includes(q) ||
            (h.floor || "").toLowerCase().includes(q) ||
            (h.owner?.name || "").toLowerCase().includes(q) ||
            (h.tenant?.name || "").toLowerCase().includes(q) ||
            (h.owner?.phone || "").includes(q) ||
            (h.tenant?.phone || "").includes(q) ||
            (h.owner?.vehicles || []).some((v) => String(v).toLowerCase().includes(q)) ||
            (h.tenant?.vehicles || []).some((v) => String(v).toLowerCase().includes(q)) ||
            fam.some((m) => m.name.toLowerCase().includes(q) || m.relation.toLowerCase().includes(q))
          );
        }
      );
    }
    return result;
  }, [houses, search, statusFilter, familyByHouse, activeMembership]);

  const displayedCount = filtered.length;
  const assignedCount = houses.filter((h) => h.isAssigned || h.isRented).length;
  const isWingAdmin = isPureWingAdmin(activeMembership);

  // Apartment detection: wings exist via block field
  const isApartmentStructure = useMemo(() => {
    if (activeSociety?.societyType === "row_house") return false;
    // show wing grouping only if at least one house has block (wing) defined
    return houses.some((h) => Boolean(h.block));
  }, [houses, activeSociety]);

  const groupedWings = useMemo(() => {
    if (!isApartmentStructure) return null;
    const wingMap = {};
    filtered.forEach((h) => {
      const wing = (h.block || "General").trim() || "General";
      const floor = (h.floor || "1").trim() || "1";
      if (!wingMap[wing]) wingMap[wing] = {};
      if (!wingMap[wing][floor]) wingMap[wing][floor] = [];
      wingMap[wing][floor].push(h);
    });
    let wingKeys = Object.keys(wingMap);
    const hasRealWing = wingKeys.some((w) => w !== "General");
    if (hasRealWing) wingKeys = wingKeys.filter((w) => w !== "General");
    const sortedWings = wingKeys.sort((a, b) => a.localeCompare(b));
    return sortedWings.map((wing) => {
      const floorsObj = wingMap[wing];
      const sortedFloors = Object.keys(floorsObj).sort((a, b) => {
        if (a === "G" && b !== "G") return -1;
        if (b === "G" && a !== "G") return 1;
        const na = Number(a);
        const nb = Number(b);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b));
      });
      const floorGroups = sortedFloors.map((floor) => {
        const list = floorsObj[floor].slice().sort((x, y) => String(x.label).localeCompare(String(y.label), undefined, { numeric: true }));
        return { floor, houses: list };
      });
      const totalWing = floorGroups.reduce((sum, g) => sum + g.houses.length, 0);
      return { wing, floorGroups, totalWing };
    });
  }, [filtered, isApartmentStructure]);

  if (!canManageHouses) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="mt-3 text-headline-sm text-on-surface">No permission</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            You don’t have permission to manage houses. Ask your Society Admin to grant you <strong>Manage Houses</strong> permission.
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

  const totalOwned = houses.filter((h) => h.isAssigned && !h.isRented).length;
  const totalRented = houses.filter((h) => h.isRented).length;
  const totalVacant = houses.filter((h) => !h.isAssigned && !h.isRented).length;
  const occupancyPercent = houses.length > 0 ? Math.round(((totalOwned + totalRented) / houses.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="mb-1.5 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="page-title">Manage Houses & Units</h1>
            <span className="rounded-full bg-primary/10 px-3 py-0.5 text-label-sm font-bold text-primary">
              {houses.length} Total Units
            </span>
          </div>
          <p className="page-subtitle mt-0.5">
            {activeSociety?.name} · {isWingAdmin ? `Assigned to Wing ${(activeMembership.assignedWings || []).join(", ")}` : "Society-wide housing directory & resident assignments"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/my-unit"
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-label-md font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">home_work</span>
            My Residence
          </Link>
        </div>
      </section>

      {/* Occupancy Overview Stats */}
      {houses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs">
            <div className="flex items-center justify-between text-outline">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Units</span>
              <span className="material-symbols-outlined text-[20px] text-primary">domain</span>
            </div>
            <p className="mt-2 text-headline-sm font-black text-on-surface">{houses.length}</p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-on-surface-variant">
              <span>{occupancyPercent}% Occupied</span>
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-container-high">
                <span className="block h-full bg-primary" style={{ width: `${occupancyPercent}%` }} />
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Owned</span>
              <span className="material-symbols-outlined text-[20px] text-emerald-600">verified</span>
            </div>
            <p className="mt-2 text-headline-sm font-black text-emerald-950">{totalOwned}</p>
            <p className="mt-1 text-[11px] font-medium text-emerald-800">Owner residing</p>
          </div>

          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4 shadow-xs">
            <div className="flex items-center justify-between text-sky-800">
              <span className="text-[11px] font-bold uppercase tracking-wider">Rented</span>
              <span className="material-symbols-outlined text-[20px] text-sky-600">key</span>
            </div>
            <p className="mt-2 text-headline-sm font-black text-sky-950">{totalRented}</p>
            <p className="mt-1 text-[11px] font-medium text-sky-800">Active tenants</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 shadow-xs">
            <div className="flex items-center justify-between text-zinc-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Vacant</span>
              <span className="material-symbols-outlined text-[20px] text-zinc-500">home_work</span>
            </div>
            <p className="mt-2 text-headline-sm font-black text-zinc-900">{totalVacant}</p>
            <p className="mt-1 text-[11px] font-medium text-zinc-600">Ready for assignment</p>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 shadow-xs">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.id;
            const count =
              filter.id === "all"
                ? houses.length
                : filter.id === "owner"
                ? totalOwned
                : filter.id === "renter"
                ? totalRented
                : totalVacant;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-label-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive ? "bg-white/20 text-white" : "bg-surface-container text-outline"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px] sm:w-80">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search house, resident or vehicle..."
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low/60 py-2 pl-9 pr-8 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

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
          ) : isApartmentStructure ? (
            <div className="space-y-6">
              {groupedWings.map(({ wing, floorGroups, totalWing }) => (
                <div key={wing} className="rounded-2xl border border-outline-variant/30 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 sm:px-5 py-3 bg-surface-container-low border-b border-outline-variant/20">
                    <span className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-title-sm shrink-0">{wing}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-title-sm font-bold text-on-surface leading-none">Wing {wing}</h3>
                      <p className="text-body-sm text-on-surface-variant">{totalWing} houses • {floorGroups.length} floors</p>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-label-sm font-semibold text-on-surface-variant bg-surface-container rounded-full px-3 py-1">{totalWing} units</span>
                  </div>
                  <div className="p-4 sm:p-5 space-y-5">
                    {floorGroups.map(({ floor, houses }) => (
                      <div key={floor}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 bg-surface-container text-on-surface-variant rounded-full px-2.5 py-1 text-label-sm font-bold tracking-widest uppercase">
                            <span className="material-symbols-outlined text-[14px]">layers</span>
                            Floor {floor}
                          </span>
                          <span className="text-body-sm text-outline">{houses.length} houses</span>
                          <span className="flex-1 h-px bg-outline-variant/30 ml-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                          {houses.map((house) => (
                            <HouseCard
                              key={house.id}
                              house={house}
                              familyMembers={familyByHouse[String(house.id)] || []}
                              onClick={() => setSelectedHouse(house)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((house) => (
                <HouseCard
                  key={house.id}
                  house={house}
                  familyMembers={familyByHouse[String(house.id)] || []}
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
          onEditHouse={(house) => {
            setSelectedHouse(null);
            setEditError("");
            setEditingHouse(house);
          }}
          onDeleteHouse={(house) => {
            setSelectedHouse(null);
            setDeleteError("");
            setDeletingHouse(house);
          }}
        />
      )}

      {editingHouse && (
        <EditHouseModal
          key={editingHouse.id}
          house={editingHouse}
          open={Boolean(editingHouse)}
          onClose={() => {
            setEditingHouse(null);
            setEditError("");
          }}
          onSave={(data) => updateMutation.mutate(data)}
          isSaving={updateMutation.isPending}
          error={editError}
        />
      )}

      {deletingHouse && (
        <ConfirmDialog
          open={Boolean(deletingHouse)}
          title={`Delete House ${deletingHouse?.label}?`}
          message={`Are you sure you want to delete House ${deletingHouse?.label}? Any resident associations with this unit will be unlinked.`}
          confirmLabel="Delete House"
          danger
          busy={deleteMutation.isPending}
          error={deleteError}
          onConfirm={() => deleteMutation.mutate()}
          onClose={() => {
            setDeletingHouse(null);
            setDeleteError("");
          }}
        />
      )}
    </div>
  );
}
