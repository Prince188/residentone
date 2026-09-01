import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  searchUsersByQuery,
  assignOwnerToHouse,
  unassignOwnerFromHouse,
  createHouseInviteLink,
  updateUnit,
  deleteUnit,
  extractApiError,
} from "../../lib/houses";
import { getFamilyMembers } from "../../lib/familyMembers";
import FormField from "../../components/form/FormField";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import useSocietyStore, {
  selectActiveMembership,
  selectActiveSociety,
} from "../../stores/society.store";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

const inputClass =
  "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow disabled:bg-surface-container-high disabled:text-on-surface-variant";

const STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Vehicles" },
  { id: 3, label: "Additional" },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex flex-1 items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-label-sm font-semibold ${
                current > step.id
                  ? "bg-success text-white"
                  : current === step.id
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {current > step.id ? (
                <span className="material-symbols-outlined text-[14px]">check</span>
              ) : (
                step.id
              )}
            </span>
            <span
              className={`text-label-sm ${
                current === step.id ? "font-semibold text-on-surface" : "text-on-surface-variant"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <span
              className={`h-0.5 flex-1 rounded ${current > step.id ? "bg-success" : "bg-outline-variant"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ResidentChoice({ house, onSelect }) {
  return (
    <>
      <p className="text-body-md text-on-surface-variant">
        Select the resident type you want to add to **House {house.label}**:
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect("owner")}
          className="group rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 text-left transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
            <span className="material-symbols-outlined text-[26px]">home</span>
          </div>
          <p className="mt-4 text-body-lg font-bold text-on-surface">Owner</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Assign the legal owner of this unit.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onSelect("renter")}
          className="group rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 text-left transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
            <span className="material-symbols-outlined text-[26px]">apartment</span>
          </div>
          <p className="mt-4 text-body-lg font-bold text-on-surface">Renter</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Assign a tenant currently residing on rent.
          </p>
        </button>
      </div>
    </>
  );
}

function VehicleRow({ value, index, canRemove, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(index, e.target.value.toUpperCase())}
        placeholder={`e.g. MH12AB${1234 + index}`}
        maxLength={15}
        className={inputClass}
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        aria-label="Remove vehicle"
        className="rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-colors hover:bg-error hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
      </button>
    </div>
  );
}

function FamilyMembersInModal({ houseId, addedById }) {
  const { data } = useQuery({
    queryKey: ["family-members", houseId],
    queryFn: async () => (await getFamilyMembers()).data.data,
    enabled: Boolean(houseId),
  });
  const members = (data || []).filter((m) => {
    if (addedById) {
      return String(m.addedBy?._id || m.addedBy) === String(addedById);
    }
    return String(m.unitId?._id || m.unitId) === String(houseId);
  });
  if (!members.length) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low/30 p-4 text-center">
        <span className="material-symbols-outlined text-[18px] text-outline">group_add</span>
        <p className="mt-1 text-label-sm text-on-surface-variant">No family members registered yet.</p>
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
      <p className="flex items-center gap-2 text-body-md font-bold text-on-surface">
        <span className="material-symbols-outlined text-[20px] text-primary">group</span> 
        <span>Family Members ({members.length})</span>
      </p>
      <div className="mt-3 divide-y divide-outline-variant/10">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-on-surface flex items-center gap-2">
                <span>{m.name}</span>
                <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary-fixed">
                  {m.relation}
                </span>
              </p>
              {m.phone && (
                <p className="mt-0.5 text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">call</span>
                  <span>{m.phone}</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AssignHouseModal({ house, onClose, onEditHouse, onDeleteHouse }) {
  const queryClient = useQueryClient();
  const activeMembership = useSocietyStore(selectActiveMembership);
  const activeSociety = useSocietyStore(selectActiveSociety);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety?.id),
  });
  // 0% difference: anyone with manage_houses permission works exactly like society_admin
  const canManageHouses = hasPermission(activeMembership?.role, "manage_houses", permissionsQuery.data);

  const [screen, setScreen] = useState("choice");
  const [residentType, setResidentType] = useState(canManageHouses ? "owner" : "renter");
  const [activeTab, setActiveTab] = useState(canManageHouses ? (house.isAssigned ? "owner" : house.isRented ? "renter" : "owner") : "renter");

  useEffect(() => {
    if (canManageHouses) {
      setActiveTab(house.isAssigned ? "owner" : house.isRented ? "renter" : "owner");
    } else {
      setActiveTab("renter");
      setResidentType("renter");
    }
  }, [house.id, house.isAssigned, house.isRented, canManageHouses]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pickedUser, setPickedUser] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [occupation, setOccupation] = useState("");
  const [familyMembers, setFamilyMembers] = useState("");

  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [assignedResult, setAssignedResult] = useState(null);
  const [invite, setInvite] = useState(null);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [unassignError, setUnassignError] = useState("");

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(phone.trim()), 300);
    return () => clearTimeout(timer);
  }, [phone]);

  const isSearching = debouncedQuery.length >= 3;

  const searchQuery = useQuery({
    queryKey: ["owner-search", debouncedQuery],
    queryFn: async () => (await searchUsersByQuery(debouncedQuery)).data.data,
    enabled: isSearching,
  });

  const matches = pickedUser ? [] : searchQuery.data || [];
  const showDropdown =
    !pickedUser && isSearching && matches.length > 0 && !searchQuery.isFetching;
  const digitsTyped = phone.replace(/\D/g, "");
  const canSubmitStep1 = name.trim().length > 0 && digitsTyped.length >= 10;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["house-cards"] });
    queryClient.invalidateQueries({ queryKey: ["my-societies"] });
  };

  const assignMutation = useMutation({
    mutationFn: (payload) => assignOwnerToHouse(house.id, payload),
    onSuccess: (response) => {
      setFormError("");
      setAssignedResult(response.data.data);
      setScreen("success");
      setShowAddForm(false);
      invalidate();
    },
    onError: (error) =>
      setFormError(extractApiError(error, "Failed to assign resident.")),
  });

  const unassignMutation = useMutation({
    mutationFn: (residentType) => unassignOwnerFromHouse(house.id, { residentType }),
    onSuccess: () => {
      setConfirmUnassign(false);
      invalidate();
      onClose();
    },
    onError: (error) =>
      setUnassignError(extractApiError(error, "Failed to remove resident.")),
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => createHouseInviteLink(house.id, data),
    onSuccess: (response) => {
      setInvite(response.data.data);
      setFormError("");
    },
    onError: (error) =>
      setFormError(extractApiError(error, "Could not generate invite link.")),
  });

  if (!house) return null;

  const occupied = house.isAssigned || house.isRented;

  const handleSelectUser = (user) => {
    setPhone(user.phone);
    setName(user.name || "");
    setEmail(user.email && !user.email.endsWith("@residentone.local") ? user.email : "");
    setPickedUser(true);
    setFormError("");
  };

  const validateStep = (target) => {
    if (target > 1) return true;
    if (!canSubmitStep1) {
      setFormError("Enter the full name and a valid phone number.");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setFormError("");
    if (step === 2) {
      const cleaned = vehicles.map((v) => v.trim()).filter(Boolean);
      if (cleaned.length !== vehicles.filter((v) => v.trim()).length) {
        setFormError("Fill in or remove the empty vehicle rows.");
        return;
      }
      setVehicles(cleaned);
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const handleSubmit = () => {
    assignMutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      residentType,
      vehicles,
      occupation: occupation.trim(),
      familyMembers: familyMembers === "" ? undefined : Number(familyMembers),
    });
  };

  const resetAndClose = () => onClose();

  const inviteSection = (
    <section className="mt-5 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-4">
      <h3 className="text-title-sm font-semibold text-on-surface">
        Let them fill their own details
      </h3>
      <p className="mt-1 text-body-sm text-on-surface-variant">
        Share a link pre-filled as{" "}
        <strong>{residentType === "owner" ? "Owner" : "Renter"}</strong> of House{" "}
        {house.label}. Valid for 7 days.
      </p>
      {invite ? (
        <div className="mt-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
          <p className="break-all font-mono text-label-sm text-on-surface">{invite.inviteUrl}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(invite.inviteUrl)}
              className="rounded-lg bg-primary-fixed px-3 py-1.5 text-label-md text-on-primary-fixed hover:opacity-90"
            >
              Copy Link
            </button>
            <button
              type="button"
              onClick={() => inviteMutation.mutate({ residentType })}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-md text-on-surface-variant hover:bg-surface-container-low"
            >
              Regenerate
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inviteMutation.mutate({ residentType })}
          disabled={inviteMutation.isPending}
          className="mt-3 flex items-center gap-2 rounded-lg border border-primary px-3 py-1.5 text-label-md text-primary hover:bg-secondary-fixed disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">share</span>
          {inviteMutation.isPending ? "Generating..." : "Generate Share Link"}
        </button>
      )}
    </section>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose} style={{ animation: "backdrop-fade 0.2s ease-out forwards" }}>
      <style>{`
        @keyframes modal-pop {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes backdrop-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`House ${house.label}`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl"
      >
        <div className="overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-headline-sm font-semibold text-on-surface">
              House {house.label}
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              {house.societyName || ""}
              {house.block ? ` · Block ${house.block}` : ""}
              {house.floor ? ` · Floor ${house.floor}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {canManageHouses && (
              <>
                <button
                  type="button"
                  title="Edit House Details"
                  onClick={() => {
                    if (onEditHouse) onEditHouse(house);
                  }}
                  className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button
                  type="button"
                  title="Delete House"
                  onClick={() => {
                    if (onDeleteHouse) onDeleteHouse(house);
                  }}
                  className="rounded-lg p-1.5 text-error hover:bg-error-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        {(formError || unassignError) && screen !== "success" && (
          <p className="mt-3 text-body-sm text-error">{formError || unassignError}</p>
        )}

        {/* Occupied house: tabs Owner / Renter - but if adding for vacant tab, show form */}
        {occupied && !showAddForm ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="flex items-center gap-1 text-label-sm font-semibold uppercase tracking-wide text-primary">
                <span className="material-symbols-outlined text-[16px]">home</span> House {house.label} Details
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-body-sm">
                <span className="text-on-surface-variant">Label: <b className="text-on-surface">{house.label}</b></span>
                <span className="text-on-surface-variant">Door: <b className="text-on-surface">{house.doorNo || "-"}</b></span>
                {house.block && <span className="text-on-surface-variant">Block: <b className="text-on-surface">{house.block}</b></span>}
                {house.floor && <span className="text-on-surface-variant">Floor: <b className="text-on-surface">{house.floor}</b></span>}
                {house.propertyType && <span className="text-on-surface-variant">Type: <b className="text-on-surface">{house.propertyType}</b></span>}
              </div>
            </div>

            {/* Tabs - 0% difference for anyone with manage_houses */}
            {canManageHouses && (
              <div className="flex gap-2 rounded-full bg-surface-container-high p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("owner")}
                  className={`flex-1 rounded-full px-3 py-1.5 text-label-md font-semibold transition-all duration-200 ${
                    activeTab === "owner"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50"
                  }`}
                >
                  Owner {house.owner ? "· " + house.owner.name.split(" ")[0] : "(vacant)"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("renter")}
                  className={`flex-1 rounded-full px-3 py-1.5 text-label-md font-semibold transition-all duration-200 ${
                    activeTab === "renter"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50"
                  }`}
                >
                  Renter {house.tenant ? "· " + house.tenant.name.split(" ")[0] : "(vacant)"}
                </button>
              </div>
            )}

            {(() => {
              const isOwnerTab = activeTab === "owner";
              const occ = isOwnerTab ? house.owner : house.tenant;
              const label = isOwnerTab ? "Owner" : "Renter";
              if (!occ) {
                return (
                  <div className="rounded-2xl border-2 border-dashed border-outline-variant/60 bg-surface-container-lowest p-8 text-center shadow-inner">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-outline">
                      <span className="material-symbols-outlined text-[24px]">person_add</span>
                    </div>
                    <p className="mt-3 text-body-md font-bold text-on-surface">No {label} Assigned</p>
                    <p className="mt-1 text-body-sm text-on-surface-variant max-w-[240px] mx-auto">
                      Assign or invite the {label.toLowerCase()} of House {house.label} to grant dashboard access.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setResidentType(isOwnerTab ? "owner" : "renter");
                        setShowAddForm(true);
                        setScreen("form");
                        setStep(1);
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 shadow-sm transition-all hover:scale-[1.02]"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span>Assign {label}</span>
                    </button>
                  </div>
                );
              }
              const occEmail = occ?.email || "";
              const showEmail = occEmail && !occEmail.endsWith("@residentone.local");
              return (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 to-surface-container-lowest p-5 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/5" />
                    <div className="flex items-start justify-between gap-3 relative z-10">
                      <div>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-label-sm font-semibold uppercase tracking-wider text-primary">{label}</span>
                        <p className="mt-2.5 text-title-lg font-bold text-on-surface">{occ?.name || "-"}</p>
                        <div className="mt-2 space-y-1">
                          <p className="flex items-center gap-1.5 text-body-md text-on-surface-variant">
                            <span className="material-symbols-outlined text-[18px] text-outline">call</span> 
                            <span>{occ?.phone || "-"}</span>
                          </p>
                          {showEmail && (
                            <p className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                              <span className="material-symbols-outlined text-[16px] text-outline">mail</span> 
                              <span>{occEmail}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                        <span className="material-symbols-outlined text-[22px]">verified</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-surface-container-low p-4 text-body-sm">
                    <div className="flex flex-col gap-0.5 rounded-xl bg-surface-container-lowest p-3 border border-outline-variant/20">
                      <span className="text-label-sm text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-primary">work</span> Occupation</span>
                      <span className="font-semibold text-on-surface text-body-sm truncate">{occ?.occupation || "—"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-xl bg-surface-container-lowest p-3 border border-outline-variant/20">
                      <span className="text-label-sm text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-primary">group</span> Family Count</span>
                      <span className="font-semibold text-on-surface text-body-sm">{occ?.familyMembers ?? "—"}</span>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5 rounded-xl bg-surface-container-lowest p-3 border border-outline-variant/20">
                      <span className="text-label-sm text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-primary">directions_car</span> Vehicles ({occ?.vehicles?.length || 0})</span>
                      <div className="flex flex-wrap gap-1">
                        {occ?.vehicles?.length ? (
                          occ.vehicles.map((v, i) => (
                            <span key={i} className="rounded bg-secondary-container px-2.5 py-0.5 font-mono text-label-sm font-bold tracking-wider text-on-secondary-container">
                              {v}
                            </span>
                          ))
                        ) : (
                          <span className="text-on-surface-variant text-[11px]">— No vehicles registered</span>
                        )}
                      </div>
                    </div>
                    {occ?.createdAt && (
                      <div className="col-span-2 text-right">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-outline">
                          Registered: {new Date(occ.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <FamilyMembersInModal houseId={house.id} addedById={occ?.id} />
                  <button type="button" onClick={() => { setConfirmUnassign(true); }} className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-error px-4 py-2.5 text-label-md text-error hover:bg-error/5 transition-colors w-full font-bold">
                    <span className="material-symbols-outlined text-[18px]">person_remove</span> Remove {label}
                  </button>
                </div>
              );
            })()}
            <ConfirmDialog
              open={confirmUnassign}
              title={`Remove ${(activeTab === "owner" ? "owner" : "renter")} from House ${house.label}?`}
              message={`${(activeTab === "owner" ? house.owner?.name : house.tenant?.name) || "This resident"} will lose access to this house. Their account remains active.`}
              confirmLabel={`Remove ${activeTab === "owner" ? "Owner" : "Renter"}`}
              danger
              busy={unassignMutation.isPending}
              onConfirm={() => unassignMutation.mutate(activeTab)}
              onClose={() => setConfirmUnassign(false)}
            />
          </div>
        ) : screen === "choice" ? (
          <ResidentChoice
            house={house}
            onSelect={(type) => {
              setResidentType(type);
              setScreen("form");
              setStep(1);
            }}
          />
        ) : screen === "success" ? (
          <div className="mt-4 rounded-xl border border-outline-variant bg-secondary-fixed p-5">
            <span className="material-symbols-outlined text-[34px] text-success">
              check_circle
            </span>
            <h3 className="mt-1 text-headline-sm text-on-surface">
              House {house.label} assigned
            </h3>
            <p className="mt-1 text-body-md text-on-surface-variant">{assignedResult.message}</p>
            {assignedResult.credentialsCreated && (
              <div className="mt-3 rounded-lg bg-surface-container-lowest p-3 text-body-sm text-on-surface">
                <p className="font-semibold">Share these login details:</p>
                <p className="mt-1">
                  Username:{" "}
                  <span className="font-mono font-semibold">{assignedResult.loginUsername}</span>
                  {" · "}Password:{" "}
                  <span className="font-mono font-semibold">
                    {assignedResult.temporaryPassword}
                  </span>
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={resetAndClose}
              className="mt-4 rounded-lg bg-inverse-surface px-4 py-2 text-label-md text-white hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step < 3) goNext();
              else handleSubmit();
            }}
            className="mt-4 space-y-4"
          >
            <StepIndicator current={step} />

            {step === 1 && (
              <div className="space-y-stack-md">
                <p className="text-body-sm text-on-surface-variant">
                  Adding <strong>{residentType === "owner" ? "owner" : "renter"}</strong> details.
                </p>
                <div className="relative">
                  <FormField id="modal-phone" label="Phone Number" required>
                    <input
                      id="modal-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setPickedUser(false);
                      }}
                      placeholder="Type to search existing accounts..."
                      className={inputClass}
                      autoComplete="off"
                    />
                  </FormField>
                  {showDropdown && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg">
                      <p className="border-b border-outline-variant bg-surface-container-low px-4 py-1.5 text-label-sm text-on-surface-variant">
                        Matching accounts — click to autofill
                      </p>
                      {matches.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary-fixed"
                        >
                          <span className="material-symbols-outlined text-[20px] text-primary">
                            person
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-body-md text-on-surface">
                              {user.name}
                            </span>
                            <span className="block truncate text-body-sm text-on-surface-variant">
                              {user.phone}
                              {user.email ? ` · ${user.email}` : ""}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <FormField id="modal-name" label="Full Name" required>
                  <input
                    id="modal-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className={inputClass}
                    required
                  />
                </FormField>

                <FormField
                  id="modal-email"
                  label="Email (optional)"
                  hint="If left blank, a placeholder email is generated."
                >
                  <input
                    id="modal-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className={inputClass}
                  />
                </FormField>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <p className="text-title-sm font-semibold text-on-surface">Vehicles</p>
                  <p className="text-body-sm text-on-surface-variant">
                    Add vehicle numbers registered under this resident (optional).
                  </p>
                </div>
                {vehicles.map((vehicle, index) => (
                  <VehicleRow
                    key={index}
                    value={vehicle}
                    index={index}
                    canRemove={vehicles.length > 1}
                    onChange={(i, v) =>
                      setVehicles((list) => list.map((item, idx) => (idx === i ? v : item)))
                    }
                    onRemove={(i) =>
                      setVehicles((list) => list.filter((_, idx) => idx !== i))
                    }
                  />
                ))}
                <button
                  type="button"
                  disabled={vehicles.length >= 10}
                  onClick={() => setVehicles((list) => [...list, ""])}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-outline-variant px-4 py-2 text-label-md text-primary hover:bg-secondary-fixed disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Vehicle
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-stack-md">
                <div>
                  <p className="text-title-sm font-semibold text-on-surface">
                    Additional info <span className="font-normal">(optional)</span>
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    You can skip this step and finish now.
                  </p>
                </div>
                <FormField id="modal-occupation" label="Occupation">
                  <input
                    id="modal-occupation"
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    maxLength={100}
                    className={inputClass}
                  />
                </FormField>
                <FormField
                  id="modal-family"
                  label="Family Members"
                  hint="Total people living in the house."
                >
                  <input
                    id="modal-family"
                    type="number"
                    min={0}
                    max={50}
                    value={familyMembers}
                    onChange={(e) => setFamilyMembers(e.target.value)}
                    placeholder="e.g. 4"
                    className={inputClass}
                  />
                </FormField>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  if (step > 1) {
                    setStep((s) => s - 1);
                  } else {
                    if (occupied) {
                      setShowAddForm(false);
                    } else {
                      setScreen("choice");
                    }
                  }
                }}
                className="rounded-lg border border-outline-variant px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low"
              >
                Back
              </button>
              {step < 3 ? (
                <button
                  type="submit"
                  className="rounded-lg bg-inverse-surface px-5 py-2 text-label-md text-white hover:opacity-90"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className="rounded-lg bg-primary-fixed px-5 py-2 text-label-md text-on-primary-fixed hover:opacity-90 disabled:opacity-60"
                >
                  {assignMutation.isPending
                    ? "Assigning..."
                    : `Assign House ${house.label}`}
                </button>
              )}
            </div>
          </form>
        )}

        {screen === "form" && (residentType === "renter" ? !house.tenant : !house.owner) && inviteSection}
        </div>
      </div>
    </div>
  );
}
