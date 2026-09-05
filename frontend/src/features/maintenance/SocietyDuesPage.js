import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { extractApiError, getHouseCards } from "../../lib/houses";
import {
  STATUS_UI,
  formatAmount,
  formatDate,
  getCycles,
  getCycleUnits,
  createCycle,
  periodLabel,
} from "../../lib/maintenance";
import api from "../../lib/api";
import { hasPermission, isPureWingAdmin, getMembershipRoles } from "../../lib/permissions";
import HouseCard from "../../components/cards/HouseCard";

function DuesCard({ unit, cycle }) {
  const isSettled = ["paid", "late_paid"].includes(unit.status);
  const dateLine = isSettled
    ? `Paid on ${formatDate(unit.paidOn)}`
    : `Due by ${formatDate(cycle.dueDate)}`;

  const residentDisplay = unit.ownerName
    ? unit.isRenterOccupied
      ? `${unit.ownerName} (Renter)`
      : unit.ownerName
    : "No resident assigned";

  return (
    <HouseCard
      house={{
        label: unit.label,
        block: unit.block,
        floor: unit.floor,
        ownerName: residentDisplay,
      }}
      variant="billing"
      status={unit.status || "pending"}
      amount={unit.amount || unit.totalAmount}
      dateLine={dateLine}
      to={`/dues/${unit.unitId}?cycle=${cycle.id}`}
    />
  );
}

const BHK_OPTIONS = [
  { id: "1bhk", label: "1 BHK", icon: "door_front" },
  { id: "2bhk", label: "2 BHK", icon: "door_front" },
  { id: "3bhk", label: "3 BHK", icon: "door_front" },
  { id: "4bhk", label: "4 BHK", icon: "door_front" },
  { id: "penthouse", label: "Penthouse", icon: "domain" },
  { id: "other", label: "Default / Other", icon: "home" },
];

function CreateMaintenanceModal({
  onClose,
  onCreate,
  loading,
  apiError,
  latestCycle,
  societyType,
  availableWings = [],
  assignedWings = [],
  isPureWingAdmin = false,
  defaultWing = null,
}) {
  const isApartment = societyType !== "row_house";

  const nextStart = useMemo(() => {
    if (!latestCycle) {
      const today = new Date();
      return {
        month: today.getMonth() + 1,
        year: today.getFullYear(),
      };
    }
    const duration = latestCycle.durationMonths || 1;
    const totalMonths = (latestCycle.month - 1) + duration;
    return {
      month: (totalMonths % 12) + 1,
      year: latestCycle.year + Math.floor(totalMonths / 12),
    };
  }, [latestCycle]);

  const defaultFrom = useMemo(() => {
    return `${nextStart.year}-${String(nextStart.month).padStart(2, "0")}`;
  }, [nextStart]);

  const defaultTo = useMemo(() => {
    // 3 month range default: from nextStart to nextStart + 2 months
    const totalMonths = (nextStart.month - 1) + 2;
    const toMonth = (totalMonths % 12) + 1;
    const toYear = nextStart.year + Math.floor(totalMonths / 12);
    return `${toYear}-${String(toMonth).padStart(2, "0")}`;
  }, [nextStart]);

  const [fromMonthStr, setFromMonthStr] = useState(defaultFrom);
  const [toMonthStr, setToMonthStr] = useState(defaultTo);
  const [dueDate, setDueDate] = useState("");
  const [lateCharge, setLateCharge] = useState("");
  const [error, setError] = useState("");

  // Wing state (apartments only)
  const initialWing = isPureWingAdmin
    ? (assignedWings[0] || "")
    : (defaultWing || "");
  const [selectedWing, setSelectedWing] = useState(initialWing);

  // Simple row house or standard fallback rates
  const [ownerAmount, setOwnerAmount] = useState("");
  const [renterAmount, setRenterAmount] = useState("");

  // Apartment BHK Rates table: per-month rates
  const [bhkRates, setBhkRates] = useState({
    "1bhk": { ownerAmount: "", renterAmount: "" },
    "2bhk": { ownerAmount: "", renterAmount: "" },
    "3bhk": { ownerAmount: "", renterAmount: "" },
    "4bhk": { ownerAmount: "", renterAmount: "" },
    "penthouse": { ownerAmount: "", renterAmount: "" },
    "other": { ownerAmount: "", renterAmount: "" },
  });

  const duration = useMemo(() => {
    if (!fromMonthStr || !toMonthStr) return 0;
    const [fY, fM] = fromMonthStr.split("-").map(Number);
    const [tY, tM] = toMonthStr.split("-").map(Number);
    return (tY - fY) * 12 + (tM - fM) + 1;
  }, [fromMonthStr, toMonthStr]);

  const handleBhkChange = (bhkId, field, val) => {
    setBhkRates((prev) => ({
      ...prev,
      [bhkId]: {
        ...prev[bhkId],
        [field]: val,
      },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (duration <= 1) {
      setError("To month must be after From month.");
      return;
    }
    if (!dueDate) {
      setError("Select a due date.");
      return;
    }
    if (lateCharge && Number(lateCharge) < 0) {
      setError("Late charge cannot be negative.");
      return;
    }

    const [fY, fM] = fromMonthStr.split("-").map(Number);

    if (!isApartment) {
      // Row house: original simple validation and payload
      if (!ownerAmount || Number(ownerAmount) <= 0) {
        setError("Enter valid Owner amount.");
        return;
      }
      if (!renterAmount || Number(renterAmount) < 0) {
        setError("Enter valid Renter amount.");
        return;
      }
      setError("");

      const finalOwnerAmount = Number(ownerAmount) * duration;
      const finalRenterAmount = Number(renterAmount) * duration;

      onCreate({
        month: fM,
        year: fY,
        dueDate,
        ownerAmount: finalOwnerAmount,
        renterAmount: finalRenterAmount,
        amount: finalOwnerAmount,
        durationMonths: duration,
        lateCharge: Number(lateCharge) || 0,
      });
      return;
    }

    // Apartment: validate flat-type rates or fallback owner/renter
    if (isPureWingAdmin && !selectedWing) {
      setError("Please select your assigned wing.");
      return;
    }

    // Convert BHK rates to final array (multiplied by duration)
    const activeBhkList = [];
    let hasAnyBhk = false;
    for (const opt of BHK_OPTIONS) {
      const oVal = bhkRates[opt.id]?.ownerAmount;
      const rVal = bhkRates[opt.id]?.renterAmount;
      if ((oVal && Number(oVal) > 0) || (rVal && Number(rVal) > 0)) {
        hasAnyBhk = true;
        const oNum = Number(oVal || 0) * duration;
        const rNum = Number(rVal || oVal || 0) * duration;
        activeBhkList.push({
          bhkType: opt.id,
          ownerAmount: oNum,
          renterAmount: rNum,
        });
      }
    }

    // Fallback: If user filled owner/renter in the general box or BHK box
    let finalOwner = Number(ownerAmount || 0) * duration;
    let finalRenter = Number(renterAmount || 0) * duration;

    if (!hasAnyBhk && (!ownerAmount || Number(ownerAmount) <= 0)) {
      setError("Please enter maintenance rates for flat types (e.g. 2 BHK, 3 BHK) or a general owner amount.");
      return;
    }

    if (hasAnyBhk && finalOwner <= 0) {
      // Use 2bhk or first available as general fallback
      const ref = activeBhkList.find((b) => b.bhkType === "2bhk") || activeBhkList[0];
      finalOwner = ref.ownerAmount;
      finalRenter = ref.renterAmount;
    }

    setError("");

    onCreate({
      month: fM,
      year: fY,
      dueDate,
      ownerAmount: finalOwner,
      renterAmount: finalRenter,
      amount: finalOwner,
      durationMonths: duration,
      lateCharge: Number(lateCharge) || 0,
      wing: selectedWing ? selectedWing.trim().toUpperCase() : null,
      bhkRates: activeBhkList,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xl sm:p-6 my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-body-lg font-bold text-on-surface">Create Maintenance</h2>
              {isApartment ? (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  Apartment · Wing & Flat-Type
                </span>
              ) : (
                <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-[11px] font-bold text-secondary">
                  Row House · Society Model
                </span>
              )}
            </div>
            <p className="page-subtitle text-[12px] mt-0.5">
              {isApartment
                ? "Set flat-type rates (2 BHK, 3 BHK, Penthouse) for a wing or society-wide."
                : "Members will see a payment alert on their dashboard."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1">
          {/* Wing Selector (Apartments Only) */}
          {isApartment && (
            <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-3.5 space-y-2">
              <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
                Target Wing / Block
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {!isPureWingAdmin && (
                  <button
                    type="button"
                    onClick={() => setSelectedWing("")}
                    className={`rounded-lg px-3 py-1.5 text-label-sm font-semibold border transition-all ${
                      selectedWing === ""
                        ? "bg-primary text-on-primary border-primary shadow-sm"
                        : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary/50"
                    }`}
                  >
                    All Wings (Society-Wide)
                  </button>
                )}
                {(isPureWingAdmin ? assignedWings : availableWings).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setSelectedWing(w)}
                    className={`rounded-lg px-3 py-1.5 text-label-sm font-semibold border transition-all ${
                      selectedWing.toUpperCase() === w.toUpperCase()
                        ? "bg-primary text-on-primary border-primary shadow-sm"
                        : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary/50"
                    }`}
                  >
                    Wing {w}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-outline">
                {selectedWing
                  ? `Maintenance will be generated ONLY for flats located in Wing ${selectedWing}.`
                  : "Maintenance will apply across all wings in the society."}
              </p>
            </div>
          )}

          {/* Period Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cm-from" className="mb-1 block text-label-sm font-medium text-on-surface-variant">
                From Month *
              </label>
              <input
                id="cm-from"
                type="month"
                required
                value={fromMonthStr}
                onChange={(e) => setFromMonthStr(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="cm-to" className="mb-1 block text-label-sm font-medium text-on-surface-variant">
                To Month *
              </label>
              <input
                id="cm-to"
                type="month"
                required
                value={toMonthStr}
                onChange={(e) => setToMonthStr(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Due date & Late charge */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cm-due" className="mb-1 block text-label-sm font-medium text-on-surface-variant">
                Due Date *
              </label>
              <input
                id="cm-due"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="cm-late-charge" className="mb-1 block text-label-sm font-medium text-on-surface-variant">
                Late Charge (₹)
              </label>
              <input
                id="cm-late-charge"
                type="number"
                min="0"
                value={lateCharge}
                onChange={(e) => setLateCharge(e.target.value)}
                placeholder="e.g. 200"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Rates configuration: Row House vs Apartment */}
          {!isApartment ? (
            /* ROW HOUSE: Simple untouched model */
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cm-owner-amount" className="mb-1 block text-label-sm font-medium text-on-surface-variant">
                  Owner Amount (₹/month) *
                </label>
                <input
                  id="cm-owner-amount"
                  type="number"
                  min="1"
                  value={ownerAmount}
                  onChange={(e) => setOwnerAmount(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="cm-renter-amount" className="mb-1 block text-label-sm font-medium text-on-surface-variant">
                  Renter Amount (₹/month) *
                </label>
                <input
                  id="cm-renter-amount"
                  type="number"
                  min="0"
                  value={renterAmount}
                  onChange={(e) => setRenterAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          ) : (
            /* APARTMENT: Flat-Type Rates Table */
            <div className="space-y-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3.5">
              <div className="flex items-center justify-between">
                <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">table_chart</span>
                  Flat Configuration Rates (Monthly Rate)
                </label>
                <span className="text-[11px] text-outline font-medium">Owner / Renter split</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Enter monthly amounts for each flat size. Flats matching that configuration will automatically be billed these rates.
              </p>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {BHK_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    className="grid grid-cols-1 sm:grid-cols-5 items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-low/60 p-2.5"
                  >
                    <div className="sm:col-span-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">{opt.icon}</span>
                      <span className="text-body-sm font-bold text-on-surface">{opt.label}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-outline">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={bhkRates[opt.id]?.ownerAmount || ""}
                          onChange={(e) => handleBhkChange(opt.id, "ownerAmount", e.target.value)}
                          placeholder="Owner (₹/mo)"
                          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-1.5 pl-6 pr-2 text-body-sm text-on-surface placeholder:text-outline/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-outline">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={bhkRates[opt.id]?.renterAmount || ""}
                          onChange={(e) => handleBhkChange(opt.id, "renterAmount", e.target.value)}
                          placeholder="Renter (₹/mo)"
                          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-1.5 pl-6 pr-2 text-body-sm text-on-surface placeholder:text-outline/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-label-sm text-outline">
            Owner pays owner amount, Renter pays renter amount — calculated over {duration} months automatically.
          </p>

          {(error || apiError) && (
            <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">
              {error || apiError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-outline-variant px-4 py-2 text-label-md text-on-surface transition-colors hover:border-primary hover:text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-label-md text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {loading ? "Creating..." : "Create Maintenance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SocietyDuesPage() {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCycleId, setSelectedCycleId] = useState(
    searchParams.get("period")
  );

  const roles = getMembershipRoles(activeMembership);
  const isSocietyAdmin = roles.includes("society_admin") || roles.includes("super_admin");
  const isPureWing = isPureWingAdmin(activeMembership);
  const assignedWings = activeMembership?.assignedWings || [];

  // Query param wing or default
  const paramWing = searchParams.get("wing") || (isPureWing && assignedWings.length ? assignedWings[0] : "");
  const [selectedWingFilter, setSelectedWingFilter] = useState(paramWing);

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManageMaintenance = hasPermission(activeMembership?.role, "manage_maintenance", permissionsQuery.data);

  // Fetch houses to extract available wings for apartments
  const housesQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety && canManageMaintenance && activeSociety.societyType !== "row_house"),
  });
  const houses = useMemo(() => housesQuery.data || [], [housesQuery.data]);

  const availableWings = useMemo(() => {
    const set = new Set();
    houses.forEach((h) => {
      if (h.block && String(h.block).trim()) {
        set.add(String(h.block).trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [houses]);

  const cyclesQuery = useQuery({
    queryKey: ["maintenance", "cycles", activeSociety?.id, selectedWingFilter],
    queryFn: async () => {
      const params = {};
      if (selectedWingFilter) params.wing = selectedWingFilter;
      return (await getCycles({ params })).data.data;
    },
    enabled: Boolean(activeSociety && canManageMaintenance),
  });

  const cycles = useMemo(() => {
    let list = cyclesQuery.data || [];
    if (selectedWingFilter) {
      list = list.filter((c) => (c.wing || "").toUpperCase() === selectedWingFilter.toUpperCase());
    }
    return list;
  }, [cyclesQuery.data, selectedWingFilter]);

  const cycle =
    cycles.find((c) => c.id === selectedCycleId) || cycles[0] || null;

  const unitsQuery = useQuery({
    queryKey: ["maintenance", "cycle-units", cycle?.id],
    queryFn: async () => (await getCycleUnits(cycle.id)).data.data,
    enabled: Boolean(cycle),
  });

  const units = useMemo(() => unitsQuery.data || [], [unitsQuery.data]);

  const counts = useMemo(() => {
    const base = { paid: 0, pending: 0, overdue: 0, late_paid: 0 };
    units.forEach((u) => {
      if (base[u.status] !== undefined) base[u.status] += 1;
    });
    return base;
  }, [units]);

  const filtered = useMemo(() => {
    let list = units;
    if (filter !== "all") list = list.filter((u) => u.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          String(u.label).toLowerCase().includes(q) ||
          (u.ownerName || "").toLowerCase().includes(q) ||
          (u.ownerPhone || "").includes(q)
      );
    }
    return list;
  }, [units, search, filter]);

  const createMutation = useMutation({
    mutationFn: (payload) => createCycle(payload).then((r) => r.data.data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setShowCreate(false);
      setSelectedCycleId(created.id);
      setToast(
        `Maintenance created for ${periodLabel(created.month, created.year, created.durationMonths)}${created.wing ? ` (Wing ${created.wing})` : ""}. Members will see a payment alert on their dashboard.`
      );
      setTimeout(() => setToast(""), 5000);
    },
  });

  if (!canManageMaintenance) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="page-title mt-3">No permission</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            You don’t have permission to manage maintenance. Ask your Society Admin to grant you <strong>Manage Maintenance</strong> permission.
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

  const filterOptions = [
    { key: "all", label: "All", count: units.length },
    ...Object.keys(STATUS_UI).map((key) => ({
      key,
      label: STATUS_UI[key].label,
      count: counts[key],
    })),
  ];

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
          <h1 className="page-title">Manage Maintenance</h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}
            Maintenance payment status for every house
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/dues/history"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md text-on-surface hover:border-primary hover:text-primary no-underline"
          >
            <span className="material-symbols-outlined text-[18px]">history</span> History
          </Link>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-label-md text-on-primary no-underline transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Create Maintenance
          </button>
        </div>
      </section>

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-body-sm font-semibold text-emerald-800">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          {toast}
        </div>
      )}

      {cyclesQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(cyclesQuery.error, "Failed to load maintenance cycles.")}
        </div>
      )}

      {cyclesQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {cyclesQuery.isSuccess && (
        <>
          {/* Apartment Wing Filter Selector Tabs */}
          {activeSociety?.societyType !== "row_house" && (availableWings.length > 0 || assignedWings.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/40 pb-3">
              <span className="text-label-sm font-semibold text-on-surface-variant flex items-center gap-1 mr-1">
                <span className="material-symbols-outlined text-[16px] text-primary">apartment</span> Wing:
              </span>
              {!isPureWing && (
                <button
                  type="button"
                  onClick={() => setSelectedWingFilter("")}
                  className={`rounded-full px-3.5 py-1 text-label-sm font-semibold transition-all border ${
                    !selectedWingFilter
                      ? "bg-primary text-on-primary border-primary shadow-sm"
                      : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary/50"
                  }`}
                >
                  All Wings
                </button>
              )}
              {(isPureWing ? assignedWings : availableWings).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWingFilter(w)}
                  className={`rounded-full px-3.5 py-1 text-label-sm font-semibold transition-all border ${
                    selectedWingFilter.toUpperCase() === w.toUpperCase()
                      ? "bg-primary text-on-primary border-primary shadow-sm"
                      : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary/50"
                  }`}
                >
                  Wing {w}
                </button>
              ))}
              {isPureWing && (
                <span className="ml-auto text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Wing Admin · Wing {assignedWings.join(", ") || "—"}
                </span>
              )}
            </div>
          )}

          {cycle && (
            <div className="flex flex-wrap items-center gap-2 text-label-sm text-outline">
              <span className="text-body-md font-semibold text-on-surface">
                {periodLabel(cycle.month, cycle.year, cycle.durationMonths)}
              </span>
              {cycle.wing ? (
                <span className="rounded-full bg-primary/15 text-primary font-bold px-2 py-0.5 text-[11px]">
                  Wing {cycle.wing}
                </span>
              ) : (
                <span className="rounded-full bg-secondary/15 text-secondary font-bold px-2 py-0.5 text-[11px]">
                  Society-Wide
                </span>
              )}
              <span>· Owner {formatAmount(cycle.ownerAmount || cycle.amount)} / Renter {formatAmount(cycle.renterAmount || cycle.amount)}</span>
              <span>· Due {formatDate(cycle.dueDate)}</span>
              <span>· {units.filter((u) => u.isOccupied).length} occupied · {counts.paid + counts.late_paid} paid</span>
            </div>
          )}

          {cycles.length === 0 && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
              <span className="material-symbols-outlined text-[40px] text-on-surface-variant">
                request_quote
              </span>
              <p className="mt-3 text-body-md text-on-surface-variant">
                {selectedWingFilter
                  ? `No maintenance created for Wing ${selectedWingFilter} yet.`
                  : "No maintenance created yet. Use “Create Maintenance” to add your first cycle."}
              </p>
            </div>
          )}

          {cycle && units.length === 0 && !unitsQuery.isLoading && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
              No houses found for this society.
            </div>
          )}

          {cycle && units.length > 0 && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="hidden sm:flex flex-wrap gap-2">
                    {filterOptions.map((opt) => {
                      const activeClass =
                        opt.key === "all"
                          ? "border-primary bg-primary text-on-primary"
                          : STATUS_UI[opt.key].chip;
                      const inactiveClass =
                        "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline";
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setFilter(opt.key)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-label-md transition-colors ${
                            filter === opt.key ? activeClass : inactiveClass
                          }`}
                        >
                          {opt.key !== "all" && (
                            <span className="material-symbols-outlined text-[15px]">
                              {STATUS_UI[opt.key].icon}
                            </span>
                          )}
                          {opt.label}
                          <span className="rounded-full bg-black/10 px-1.5 text-label-sm">{opt.count}</span>
                        </button>
                      );
                    })}
                  </div>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label="Filter houses by status"
                    className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:hidden min-w-[110px]"
                  >
                    {filterOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label} ({opt.count})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative w-full sm:w-72 sm:shrink-0">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                    search
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search house no. or owner..."
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-4 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <section>

                {unitsQuery.isLoading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-36 animate-pulse rounded-xl bg-surface-container-high" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center text-body-md text-on-surface-variant">
                    No houses match your search or filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {filtered.map((unit) => (
                      <DuesCard key={unit.unitId} unit={unit} cycle={cycle} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}

      {showCreate && (
        <CreateMaintenanceModal
          onClose={() => setShowCreate(false)}
          latestCycle={cycles[0]}
          societyType={activeSociety?.societyType}
          availableWings={availableWings}
          assignedWings={assignedWings}
          isPureWingAdmin={isPureWing}
          defaultWing={selectedWingFilter}
          loading={createMutation.isPending}
          apiError={
            createMutation.isError
              ? extractApiError(createMutation.error, "Failed to create maintenance.")
              : ""
          }
          onCreate={(payload) => createMutation.mutate(payload)}
        />
      )}
    </div>
  );
}
