import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveMembership,
  selectActiveSociety,
} from "../../stores/society.store";
import useAuthStore from "../../stores/auth.store";
import { getHouseCards, getHouse } from "../../lib/houses";
import { getFamilyMembers } from "../../lib/familyMembers";
import AssignHouseModal from "../houses/AssignHouseModal";
import HouseCard from "../../components/cards/HouseCard";

export default function MyUnitPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const user = useAuthStore((state) => state.user);
  const [selectedHouseId, setSelectedHouseId] = useState(null);

  const units = activeMembership?.units || [];

  // Query house cards to get the full rich information (wing, floor, vehicles, etc.)
  const housesQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety),
  });

  // Query family members
  const familyQuery = useQuery({
    queryKey: ["family-members", activeSociety?.id],
    queryFn: async () => (await getFamilyMembers()).data.data,
    enabled: Boolean(activeSociety),
  });

  // Single house detail query when a house is selected for modal
  const houseQuery = useQuery({
    queryKey: ["house-detail", selectedHouseId],
    queryFn: async () => (await getHouse(selectedHouseId)).data.data,
    enabled: Boolean(selectedHouseId),
  });

  // Map user's units to rich house card objects
  const myHouseCards = useMemo(() => {
    const allHouses = housesQuery.data || [];
    const unitMap = new Map();
    units.forEach((u) => {
      unitMap.set(String(u.id || u), u);
    });

    if (allHouses.length > 0) {
      return units.map((u) => {
        const uId = String(u.id || u);
        const match = allHouses.find((h) => String(h.id) === uId);
        if (match) {
          return {
            ...match,
            isOwner: u.isOwner ?? match.isAssigned,
          };
        }
        return {
          id: uId,
          label: u.label,
          isOwner: u.isOwner,
          owner: { name: user?.name, vehicles: user?.vehicles || [] },
        };
      });
    }

    // Fallback if house-cards query is loading or unavailable
    return units.map((u) => ({
      id: String(u.id || u),
      label: u.label,
      isOwner: u.isOwner,
      owner: { name: user?.name, vehicles: user?.vehicles || [] },
    }));
  }, [units, housesQuery.data, user]);

  // Family members by house
  const familyByHouse = useMemo(() => {
    const map = {};
    const familyMembersList = familyQuery.data || [];
    myHouseCards.forEach((house) => {
      map[String(house.id)] = familyMembersList.filter(
        (m) => String(m.unitId?._id || m.unitId?.id || m.unitId) === String(house.id)
      );
    });
    return map;
  }, [myHouseCards, familyQuery.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header Section (consistent with ManageHousesPage) */}
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
            <h1 className="page-title">My Unit</h1>
            {units.length > 0 && (
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-label-sm font-bold text-primary">
                {units.length} {units.length === 1 ? "Unit" : "Units"}
              </span>
            )}
          </div>
          <p className="page-subtitle mt-0.5">
            {activeSociety?.name} · Houses and flats linked to your account
          </p>
        </div>

        {/* Direct Action Links */}
        <div className="flex items-center gap-2">
          <Link
            to="/maintenance"
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-label-md font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
            Pay Dues
          </Link>
          <Link
            to="/family-members"
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-label-md font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">group_add</span>
            Add Family
          </Link>
        </div>
      </section>

      {/* Content Grid */}
      {units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
          No unit is linked to your account yet. Contact your society admin.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {myHouseCards.map((house) => (
            <HouseCard
              key={house.id}
              house={house}
              isOwner={house.isOwner}
              familyMembers={familyByHouse[String(house.id)] || []}
              onClick={() => setSelectedHouseId(house.id)}
            />
          ))}
        </div>
      )}

      {/* House Manage Modal (Renters / Residents) */}
      {selectedHouseId && (
        houseQuery.isLoading ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-xl text-body-md text-on-surface flex items-center gap-3">
              <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
              <span>Loading house details...</span>
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



