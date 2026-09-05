import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getHouse,
  searchUsersByQuery,
  assignOwnerToHouse,
  unassignOwnerFromHouse,
  createHouseInviteLink,
  updateUnit,
  deleteUnit,
  extractApiError,
} from "../../lib/houses";
import FormField from "../../components/form/FormField";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EditHouseModal from "./EditHouseModal";
import PhoneInput from "../../components/ui/PhoneInput";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

const inputClass =
  "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow disabled:bg-surface-container-high disabled:text-on-surface-variant";

function OwnerForm({ house }) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pickedUser, setPickedUser] = useState(false);
  const [formError, setFormError] = useState("");
  const [assignedResult, setAssignedResult] = useState(null);
  const [invite, setInvite] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["house", house.id] });
    queryClient.invalidateQueries({ queryKey: ["house-cards"] });
    queryClient.invalidateQueries({ queryKey: ["my-societies"] });
  };

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
  const canSubmit = name.trim().length > 0 && digitsTyped.length >= 10;

  const assignMutation = useMutation({
    mutationFn: (payload) => assignOwnerToHouse(house.id, payload),
    onSuccess: (response) => {
      setFormError("");
      setAssignedResult(response.data.data);
      invalidate();
    },
    onError: (error) =>
      setFormError(extractApiError(error, "Failed to assign owner.")),
  });

  const inviteMutation = useMutation({
    mutationFn: () => createHouseInviteLink(house.id),
    onSuccess: (response) => {
      setInvite(response.data.data);
      setFormError("");
    },
    onError: (error) =>
      setFormError(extractApiError(error, "Could not generate invite link.")),
  });

  const handleSelectUser = (user) => {
    setPhone(user.phone);
    setName(user.name || "");
    setEmail(user.email && !user.email.endsWith("@residentone.local") ? user.email : "");
    setPickedUser(true);
    setFormError("");
  };

  const handleAssign = (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setFormError("Enter the owner's full name and a valid phone number.");
      return;
    }
    assignMutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
    });
  };

  if (assignedResult) {
    return (
      <div className="rounded-xl border border-success/30 bg-success-container/20 p-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[28px] text-success">
            check_circle
          </span>
          <div className="space-y-2">
            <h3 className="text-headline-sm text-on-surface">Owner Assigned</h3>
            <p className="text-body-md text-on-surface-variant">
              {assignedResult.name} is now the registered owner of House{" "}
              {house.label}.
            </p>
            {assignedResult.credentialsCreated && (
              <div className="mt-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-body-sm">
                <p className="font-semibold text-on-surface">
                  Login Credentials Created:
                </p>
                <p className="text-on-surface-variant">
                  Username:{" "}
                  <strong className="text-on-surface">
                    {assignedResult.loginUsername}
                  </strong>
                </p>
                <p className="text-on-surface-variant">
                  Default Password:{" "}
                  <strong className="text-on-surface">
                    {assignedResult.defaultPassword}
                  </strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        <h3 className="text-headline-sm text-on-surface">Assign Owner Directly</h3>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Search for an existing user by phone number or enter details to create a new resident account.
        </p>

        {formError && (
          <div className="mt-4 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">
            {formError}
          </div>
        )}

        <form onSubmit={handleAssign} className="mt-5 space-y-4">
          <div className="relative">
            <FormField label="Phone Number" required>
              <PhoneInput
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPickedUser(false);
                }}
                disabled={assignMutation.isPending}
                showDigitCounter={true}
              />
            </FormField>

            {showDropdown && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg">
                {matches.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-body-sm hover:bg-surface-container-high"
                  >
                    <div>
                      <p className="font-semibold text-on-surface">{u.name}</p>
                      <p className="text-label-sm text-outline">{u.phone}</p>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      arrow_forward
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <FormField label="Full Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className={inputClass}
              disabled={assignMutation.isPending}
            />
          </FormField>

          <FormField label="Email Address">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul@example.com (optional)"
              className={inputClass}
              disabled={assignMutation.isPending}
            />
          </FormField>

          <button
            type="submit"
            disabled={!canSubmit || assignMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-label-lg font-semibold text-on-primary shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              person_add
            </span>
            {assignMutation.isPending ? "Assigning..." : "Assign as Owner"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        <h3 className="text-headline-sm text-on-surface">Share Self-Registration Link</h3>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Generate an invitation link that the owner can open on their phone to claim this house themselves.
        </p>

        {invite ? (
          <div className="mt-4 space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <p className="text-label-md font-semibold text-on-surface">
              Invite Link Ready:
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={invite.inviteUrl}
                className="w-full rounded border border-outline-variant bg-white px-3 py-1.5 text-body-sm font-mono text-on-surface"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(invite.inviteUrl);
                  alert("Copied to clipboard!");
                }}
                className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-label-md font-semibold text-on-primary hover:opacity-90"
              >
                Copy
              </button>
            </div>
            <p className="text-label-sm text-outline">
              Expires: {new Date(invite.expiresAt).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
            className="mt-4 flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">link</span>
            {inviteMutation.isPending ? "Generating..." : "Generate Invite Link"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function HouseDetailPage() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [unassignError, setUnassignError] = useState("");
  const [editingHouse, setEditingHouse] = useState(false);
  const [deletingHouse, setDeletingHouse] = useState(false);
  const [actionError, setActionError] = useState("");

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManageHouses = hasPermission(membership?.role, "manage_houses", permissionsQuery.data);

  const houseQuery = useQuery({
    queryKey: ["house", unitId],
    queryFn: async () => (await getHouse(unitId)).data.data,
  });

  const unassignMutation = useMutation({
    mutationFn: () => unassignOwnerFromHouse(unitId),
    onSuccess: () => {
      setConfirmUnassign(false);
      queryClient.invalidateQueries({ queryKey: ["house", unitId] });
      queryClient.invalidateQueries({ queryKey: ["house-cards"] });
    },
    onError: (error) =>
      setUnassignError(extractApiError(error, "Failed to remove owner.")),
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateUnit(unitId, payload).then((r) => r.data.data),
    onSuccess: () => {
      setEditingHouse(false);
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["house", unitId] });
      queryClient.invalidateQueries({ queryKey: ["house-cards"] });
    },
    onError: (err) => setActionError(extractApiError(err, "Failed to update house")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteUnit(unitId).then((r) => r.data.data),
    onSuccess: () => {
      setDeletingHouse(false);
      queryClient.invalidateQueries({ queryKey: ["house-cards"] });
      navigate("/houses");
    },
    onError: (err) => setActionError(extractApiError(err, "Failed to delete house")),
  });

  const house = houseQuery.data;

  if (houseQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-10 text-center text-body-sm text-on-surface-variant">
        Loading house...
      </div>
    );
  }

  if (houseQuery.isError || !house) {
    return (
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        <div className="p-10 text-center text-body-md text-error">
          {extractApiError(houseQuery.error, "House not found.")}
        </div>
        <div className="text-center">
          <Link to="/houses" className="text-label-md text-primary no-underline hover:underline">
            Back to Manage Houses
          </Link>
        </div>
      </div>
    );
  }

  const isRented = Boolean(house.isRented);
  const isAssigned = Boolean(house.isAssigned && !isRented);
  const isVacant = !house.isAssigned && !house.isRented;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/houses"
            className="mb-1.5 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Manage Houses
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[28px]">
                {isRented ? "key" : isAssigned ? "home" : "home_work"}
              </span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="page-title">House {house.label}</h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-bold ${
                    isRented
                      ? "bg-sky-100 text-sky-800"
                      : isAssigned
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {isRented ? "key" : isAssigned ? "verified" : "home"}
                  </span>
                  {isRented ? "Rented" : isAssigned ? "Owned" : "Vacant"}
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                {house.societyName}
                {house.block ? ` · Block ${house.block}` : ""}
                {house.floor != null ? ` · Floor ${house.floor}` : ""}
              </p>
            </div>
          </div>
        </div>

        {canManageHouses && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setEditingHouse(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-label-md font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit Details
            </button>
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setDeletingHouse(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-label-md font-semibold text-error hover:bg-error-container/40 transition-colors cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Delete
            </button>
          </div>
        )}
      </section>

      {unassignError && (
        <div className="rounded-xl bg-error-container p-3.5 text-body-sm text-on-error-container flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{unassignError}</span>
        </div>
      )}
      {actionError && (
        <div className="rounded-xl bg-error-container p-3.5 text-body-sm text-on-error-container flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* House Specifications Card */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xs">
        <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/60 pb-3">
          <span className="material-symbols-outlined text-[20px] text-primary">domain</span>
          Unit Specifications
        </h3>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-body-sm">
          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low/40 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">door_front</span> Door No
            </span>
            <p className="mt-1 font-bold text-on-surface">{house.doorNo || house.label || "-"}</p>
          </div>
          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low/40 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">apartment</span> Wing / Block
            </span>
            <p className="mt-1 font-bold text-on-surface">{house.block || "General"}</p>
          </div>
          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low/40 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">layers</span> Floor Level
            </span>
            <p className="mt-1 font-bold text-on-surface">{house.floor != null ? `${house.floor}th Floor` : "Ground"}</p>
          </div>
          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low/40 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">villa</span> Property Type
            </span>
            <p className="mt-1 font-bold text-on-surface capitalize">{house.propertyType || "Residential Flat"}</p>
          </div>
        </div>
      </div>

      {/* Resident Info or Assign Form */}
      {house.isAssigned || house.isRented ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs">
            <div className="flex items-start justify-between gap-3 border-b border-outline-variant/60 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-title-md">
                  {(house.owner || house.tenant)?.name?.charAt(0)?.toUpperCase() || "R"}
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[11px] font-bold ${isRented ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {isRented ? "Current Renter / Tenant" : "Current Registered Owner"}
                  </span>
                  <h3 className="text-title-md font-bold text-on-surface mt-0.5">
                    {(house.owner || house.tenant)?.name}
                  </h3>
                  <p className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[15px] text-primary">call</span>
                    {(house.owner || house.tenant)?.phone}
                  </p>
                  {(house.owner || house.tenant)?.email && !(house.owner || house.tenant).email.endsWith("@residentone.local") && (
                    <p className="flex items-center gap-1.5 text-body-sm text-on-surface-variant mt-0.5">
                      <span className="material-symbols-outlined text-[15px] text-primary">mail</span>
                      {(house.owner || house.tenant)?.email}
                    </p>
                  )}
                </div>
              </div>

              <span className="material-symbols-outlined text-[36px] text-success">verified_user</span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-surface-container-low/60 p-3.5 text-body-sm">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">work</span> Occupation
                </span>
                <p className="mt-1 font-bold text-on-surface">{(house.owner || house.tenant)?.occupation || "—"}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">group</span> Family Members
                </span>
                <p className="mt-1 font-bold text-on-surface">{(house.owner || house.tenant)?.familyMembers ?? "—"}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">directions_car</span> Registered Vehicles
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(house.owner || house.tenant)?.vehicles?.length ? (
                    (house.owner || house.tenant).vehicles.map((v, i) => (
                      <span key={i} className="rounded-md bg-surface-container-high px-2 py-0.5 font-mono text-[11px] font-bold text-on-surface">
                        {v}
                      </span>
                    ))
                  ) : (
                    <p className="font-bold text-outline text-[12px]">None</p>
                  )}
                </div>
              </div>
            </div>

            {canManageHouses && (
              <div className="mt-5 flex justify-end border-t border-outline-variant/60 pt-4">
                <button
                  type="button"
                  onClick={() => setConfirmUnassign(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-error/50 px-4 py-2 text-label-md font-semibold text-error hover:bg-error-container/30 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">person_remove</span>
                  Remove {house.isAssigned ? "Owner" : "Renter"}
                </button>
              </div>
            )}
          </div>

          <ConfirmDialog
            open={confirmUnassign}
            title={`Remove resident from House ${house.label}?`}
            message={`${(house.owner || house.tenant)?.name} will lose access to this house. Their account remains active.`}
            confirmLabel="Remove Resident"
            danger
            busy={unassignMutation.isPending}
            onConfirm={() => unassignMutation.mutate()}
            onClose={() => setConfirmUnassign(false)}
          />
        </section>
      ) : canManageHouses ? (
        <OwnerForm house={house} />
      ) : (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h3 className="mt-3 text-headline-sm text-on-surface">No permission</h3>
          <p className="mt-1 text-body-md text-on-surface-variant">You don’t have permission to manage houses. Ask your Society Admin to grant you <strong>Manage Houses</strong> permission.</p>
          <Link to="/houses" className="mt-4 inline-block text-label-md text-primary no-underline hover:underline">Back to Manage Houses</Link>
        </div>
      )}

      <EditHouseModal
        house={house}
        open={editingHouse}
        onClose={() => {
          setEditingHouse(false);
          setActionError("");
        }}
        onSave={(data) => updateMutation.mutate(data)}
        isSaving={updateMutation.isPending}
        error={actionError}
      />

      <ConfirmDialog
        open={deletingHouse}
        title={`Delete House ${house?.label}?`}
        message={`Are you sure you want to delete House ${house?.label}? Any resident associations with this unit will be unlinked.`}
        confirmLabel="Delete House"
        danger
        busy={deleteMutation.isPending}
        error={actionError}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => {
          setDeletingHouse(false);
          setActionError("");
        }}
      />
    </div>
  );
}
