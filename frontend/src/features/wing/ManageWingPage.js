/* eslint-disable */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { getHouseCards, extractApiError } from "../../lib/houses";
import { getFamilyMembers } from "../../lib/familyMembers";
import AssignHouseModal from "../houses/AssignHouseModal";
import api from "../../lib/api";
import { hasPermissionForMembership, getMembershipRoles, isWingAdmin } from "../../lib/permissions";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "owner", label: "Owned" },
  { id: "renter", label: "Rented" },
  { id: "vacant", label: "Vacant" },
];

function HouseCard({ house, familyMembers = [], onClick }) {
  const status = house.isRented ? "Rented" : house.isAssigned ? "Owned" : "Vacant";
  const vehicles = (house.tenant || house.owner)?.vehicles || [];
  return (
    <button type="button" onClick={onClick} className={`block w-full rounded-xl border p-3 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md h-[148px] sm:h-[156px] flex flex-col justify-between ${house.isAssigned || house.isRented ? "border-success bg-secondary-fixed" : "border-outline-variant bg-surface-container-lowest"}`}>
      <div className="w-full">
        <div className="flex items-center justify-between gap-2">
          <span className="material-symbols-outlined text-[22px] text-primary">{house.isAssigned || house.isRented ? "home" : "home_work"}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${house.isAssigned || house.isRented ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container-high text-on-surface-variant"}`}>{status}</span>
        </div>
        <p className="mt-2 text-title-md font-bold text-on-surface leading-tight truncate">{house.label}</p>
        <p className="mt-0.5 truncate text-body-sm text-on-surface-variant font-medium">{(house.tenant || house.owner)?.name || "No resident assigned"}</p>
      </div>
      <div className="w-full space-y-1 border-t border-outline-variant/30 pt-2 mt-auto">
        <div className="flex items-center gap-1 text-label-sm text-on-surface-variant truncate h-4">
          {vehicles.length > 0 ? <><span className="material-symbols-outlined text-[14px]">directions_car</span><span className="truncate">{vehicles[0]}{vehicles.length > 1 ? ` +${vehicles.length - 1}` : ""}</span></> : <span className="text-outline/50 text-[11px]">— No vehicles</span>}
        </div>
        <div className="flex items-center gap-1 text-label-sm text-primary truncate h-4">
          {familyMembers.length > 0 ? <><span className="material-symbols-outlined text-[14px]">group</span><span className="truncate">{familyMembers.length} family</span></> : house.hasPendingInvite && !house.isAssigned && !house.isRented ? <><span className="material-symbols-outlined text-[14px]">link</span><span className="font-semibold text-[11px] uppercase">Invite sent</span></> : <span className="text-outline/50 text-[11px]">— No family</span>}
        </div>
      </div>
    </button>
  );
}

export default function ManageWingPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedHouse, setSelectedHouse] = useState(null);

  const roles = getMembershipRoles(activeMembership);
  const isSocietyAdmin = roles.includes("society_admin") || roles.includes("super_admin");
  const isWingAdminAny = roles.includes("wing_admin");
  const isPureWingAdmin = isWingAdminAny && !isSocietyAdmin;
  const canAccess = hasPermissionForMembership(activeMembership, "manage_houses", null) || isWingAdminAny;

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManageHouses = hasPermissionForMembership(activeMembership, "manage_houses", permissionsQuery.data) || isWingAdmin(activeMembership);

  const housesQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety && canAccess),
  });
  const houses = housesQuery.data || [];

  const familyQuery = useQuery({
    queryKey: ["family-members", activeSociety?.id],
    queryFn: async () => (await getFamilyMembers()).data.data,
    enabled: Boolean(activeSociety && canAccess),
  });
  const familyByHouse = useMemo(() => {
    const map = {};
    const list = familyQuery.data || [];
    houses.forEach((house) => {
      const rid = house.tenant?.id || house.owner?.id || null;
      if (rid) map[String(house.id)] = list.filter((m) => String(m.addedBy?._id || m.addedBy) === String(rid));
      else map[String(house.id)] = list.filter((m) => String(m.unitId?._id || m.unitId) === String(house.id));
    });
    return map;
  }, [houses, familyQuery.data]);

  // wing-scoped filtering: Manage Wing always shows only assigned wing(s), even for society_admin+wing_admin
  const filtered = useMemo(() => {
    let result = houses;
    if (isWingAdminAny && activeMembership?.assignedWings?.length) {
      const allowed = new Set(activeMembership.assignedWings.map((w) => String(w).toUpperCase()));
      result = result.filter((h) => allowed.has(String(h.block || "").toUpperCase()));
    } else if (isWingAdminAny && !activeMembership?.assignedWings?.length) {
      result = [];
    }
    if (statusFilter === "owner") result = result.filter((h) => h.isAssigned && !h.isRented);
    else if (statusFilter === "renter") result = result.filter((h) => h.isRented);
    else if (statusFilter === "vacant") result = result.filter((h) => !h.isAssigned && !h.isRented);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((h) => {
        const fam = familyByHouse[String(h.id)] || [];
        return String(h.label).toLowerCase().includes(q) || (h.block||"").toLowerCase().includes(q) || (h.floor||"").toLowerCase().includes(q) || (h.owner?.name||"").toLowerCase().includes(q) || (h.tenant?.name||"").toLowerCase().includes(q) || fam.some((m)=>m.name.toLowerCase().includes(q));
      });
    }
    return result;
  }, [houses, search, statusFilter, familyByHouse, isPureWingAdmin, activeMembership]);

  const isApartmentStructure = useMemo(() => {
    if (activeSociety?.societyType === "row_house") return false;
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
      const sortedFloors = Object.keys(floorsObj).sort((a,b)=>{
        if(a==="G"&&b!=="G")return -1; if(b==="G"&&a!=="G")return 1;
        const na=Number(a), nb=Number(b); if(!isNaN(na)&&!isNaN(nb)) return na-nb; return String(a).localeCompare(String(b));
      });
      const floorGroups = sortedFloors.map((floor)=>({floor, houses: floorsObj[floor].slice().sort((x,y)=>String(x.label).localeCompare(String(y.label), undefined, {numeric:true}))}));
      const totalWing = floorGroups.reduce((s,g)=>s+g.houses.length,0);
      return {wing, floorGroups, totalWing};
    });
  }, [filtered, isApartmentStructure]);

  const assignedWings = activeMembership?.assignedWings || [];
  const displayedCount = filtered.length;
  const totalWingCount = houses.filter((h)=> isWingAdminAny ? assignedWings.map((w)=>String(w).toUpperCase()).includes(String(h.block||"").toUpperCase()) : true).length;

  if (!canManageHouses) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="mt-3 text-headline-sm">No permission</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">Wing Admin or Society Admin required. Ask Society Admin to assign you a wing.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"><span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard</Link>
          <h1 className="page-title">Manage Wing</h1>
          <p className="page-subtitle">
            {`Wing ${assignedWings.join(", ") || "—"} • ${displayedCount} houses`}{isSocietyAdmin ? ` • Society Admin (wing-scoped view)` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full px-3 py-1 text-label-sm font-bold bg-amber-100 text-amber-800">{`Wing Admin • Wing ${assignedWings.join(", ") || "—"}`}</span>
          {isSocietyAdmin && <span className="rounded-full px-3 py-1 text-label-sm font-bold bg-primary/10 text-primary border border-primary/20">Society Admin too • wing view only</span>}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search house, resident, wing, floor..." className="w-full rounded-lg border bg-surface-container-lowest py-2 pl-9 pr-4 text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"/>
        </div>
        <div className="hidden sm:flex gap-1.5">
          {STATUS_FILTERS.map((f)=>(
            <button key={f.id} onClick={()=>setStatusFilter(f.id)} className={`rounded-full border px-3 py-1 text-label-md ${statusFilter===f.id? "bg-inverse-surface text-white border-inverse-surface":"bg-surface-container-lowest text-on-surface-variant border-outline-variant"}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {housesQuery.isError && <div className="rounded-xl border bg-surface-container-low p-6 text-center text-error">{extractApiError(housesQuery.error, "Failed to load")}</div>}
      {housesQuery.isLoading && <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{Array.from({length:8}).map((_,i)=><div key={i} className="h-32 animate-pulse bg-surface-container-high rounded-xl"/> )}</div>}

      {housesQuery.isSuccess && (
        <>
          {filtered.length===0 ? <div className="rounded-xl border p-10 text-center text-on-surface-variant">{isWingAdminAny ? `No houses in your wing(s) ${assignedWings.join(", ")} match filter.` : "No houses found."}</div> : isApartmentStructure ? (
            <div className="space-y-6">
              {groupedWings.map(({wing, floorGroups, totalWing})=>(
                <div key={wing} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3 bg-surface-container-low border-b">
                    <span className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">{wing}</span>
                    <div className="flex-1"><h3 className="font-bold leading-none">Wing {wing}</h3><p className="text-body-sm text-on-surface-variant">{totalWing} houses • {floorGroups.length} floors</p></div>
                    <span className="hidden sm:inline-flex bg-amber-100 text-amber-800 rounded-full px-3 py-1 text-label-sm font-bold">Your Wing</span>
                  </div>
                  <div className="p-5 space-y-5">
                    {floorGroups.map(({floor, houses: floorHouses})=>(
                      <div key={floor}>
                        <div className="flex items-center gap-2 mb-2"><span className="inline-flex items-center gap-1 bg-surface-container rounded-full px-2.5 py-1 text-label-sm font-bold uppercase"><span className="material-symbols-outlined text-[14px]">layers</span> Floor {floor}</span><span className="text-body-sm text-outline">{floorHouses.length} houses</span><span className="flex-1 h-px bg-outline-variant/30 ml-2"/></div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {floorHouses.map((house)=>(
                            <HouseCard key={house.id} house={house} familyMembers={familyByHouse[String(house.id)]||[]} onClick={()=>setSelectedHouse(house)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {filtered.map((house)=>(
                <HouseCard key={house.id} house={house} familyMembers={familyByHouse[String(house.id)]||[]} onClick={()=>setSelectedHouse(house)} />
              ))}
            </div>
          )}
        </>
      )}

      {selectedHouse && <AssignHouseModal key={selectedHouse.id} house={selectedHouse} onClose={()=>setSelectedHouse(null)} />}
    </div>
  );
}
