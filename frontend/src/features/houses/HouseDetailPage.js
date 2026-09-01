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
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

const inputClass =
  "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow disabled:bg-surface-container-high disabled:text-on-surface-variant";

const PROPERTY_TYPES = [
  { value: "flat", label: "Flat / Apartment", icon: "apartment" },
  { value: "villa", label: "Villa", icon: "villa" },
  { value: "row_house", label: "Row House", icon: "cottage" },
  { value: "penthouse", label: "Penthouse", icon: "domain" },
  { value: "studio", label: "Studio", icon: "bed" },
  { value: "shop", label: "Commercial Shop", icon: "storefront" },
  { value: "office", label: "Office Unit", icon: "business_center" },
  { value: "plot", label: "Open Plot", icon: "landscape" },
];

function EditHouseModal({ house, open, onClose, onSave, isSaving, error }) {
  const [label, setLabel] = useState(house?.label || "");
  const [block, setBlock] = useState(house?.block || "");
  const [floor, setFloor] = useState(house?.floor ?? "");
  const [doorNo, setDoorNo] = useState(house?.doorNo || "");
  const [propertyType, setPropertyType] = useState(house?.propertyType || "flat");

  useEffect(() => {
    if (house) {
      setLabel(house.label || "");
      setBlock(house.block || "");
      setFloor(house.floor ?? "");
      setDoorNo(house.doorNo || "");
      setPropertyType(house.propertyType || "flat");
    }
  }, [house, open]);

  if (!open || !house) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({
      label: label.trim(),
      block: block.trim() || null,
      floor: floor !== "" ? Number(floor) : null,
      doorNo: doorNo.trim() || null,
      propertyType,
    });
  };

  const selectedPropType = PROPERTY_TYPES.find((p) => p.value === propertyType) || PROPERTY_TYPES[0];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity" onClick={isSaving ? undefined : onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-outline-variant/40 bg-surface-container-lowest shadow-2xl transition-all">
        {/* Header with decorative background */}
        <div className="border-b border-outline-variant/20 bg-gradient-to-r from-primary/10 via-surface-container-low to-surface-container-lowest p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-[24px]">home_work</span>
              </div>
              <div>
                <h3 className="text-title-lg font-bold text-on-surface">Edit House Details</h3>
                <p className="text-body-sm text-on-surface-variant">
                  Update unit number, block, and property specs
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Live Preview Pill */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] text-primary">{selectedPropType.icon}</span>
              <p className="truncate text-body-sm font-semibold text-on-surface">
                House {label || "—"} {block ? `· Wing ${block}` : ""} {floor !== "" ? `· Floor ${floor}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              {selectedPropType.label.split(" ")[0]}
            </span>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-error/30 bg-error/10 p-3.5 text-body-sm text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-180px)] overflow-y-auto">
          <div>
            <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">tag</span>
              House / Flat Number <span className="text-error">*</span>
            </label>
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. 101, B-402, Villa 12"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">apartment</span>
                Wing / Block
              </label>
              <input
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                placeholder="e.g. A, Tower 2"
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
            <div>
              <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">layers</span>
                Floor Number
              </label>
              <input
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 1, 4, 12"
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">door_front</span>
                Door / Physical No
              </label>
              <input
                value={doorNo}
                onChange={(e) => setDoorNo(e.target.value)}
                placeholder="e.g. 101, 102"
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
            <div>
              <label className="text-label-sm font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">domain</span>
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium cursor-pointer"
              >
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-outline-variant/20 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full border border-outline-variant px-5 py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !label.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-label-md font-semibold text-on-primary shadow-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPickedUser(false);
                }}
                placeholder="e.g. 9876543210"
                className={inputClass}
                disabled={assignMutation.isPending}
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
      <div className="mx-auto max-w-3xl p-10 text-center text-body-sm text-on-surface-variant">
        Loading house...
      </div>
    );
  }

  if (houseQuery.isError || !house) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
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

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/houses"
            className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Manage Houses
          </Link>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[34px] text-primary">
              {house.isAssigned ? "home" : "home_work"}
            </span>
            <div>
              <h1 className="page-title">House {house.label}</h1>
              <p className="text-body-sm text-on-surface-variant">
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-label-md font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors cursor-pointer shadow-sm"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-label-md font-semibold text-error hover:bg-error-container transition-colors cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Delete
            </button>
          </div>
        )}
      </section>

      {unassignError && <p className="text-body-sm text-error">{unassignError}</p>}
      {actionError && <p className="text-body-sm text-error">{actionError}</p>}

      {house.isAssigned || house.isRented ? (
        <section className="space-y-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <p className="flex items-center gap-1 text-label-sm font-semibold uppercase tracking-wide text-primary">
              <span className="material-symbols-outlined text-[16px]">home</span> House {house.label}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-body-sm">
              <span className="text-on-surface-variant">Door: <b className="text-on-surface">{house.doorNo || "-"}</b></span>
              {house.block && <span className="text-on-surface-variant">Block: <b className="text-on-surface">{house.block}</b></span>}
              {house.floor != null && <span className="text-on-surface-variant">Floor: <b className="text-on-surface">{house.floor}</b></span>}
              {house.propertyType && <span className="text-on-surface-variant">Type: <b className="text-on-surface capitalize">{house.propertyType}</b></span>}
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-headline-sm text-on-surface">{house.isAssigned ? "Current Owner" : "Current Renter"}</h3>
                <p className="mt-2 text-body-lg font-semibold text-on-surface">{(house.owner || house.tenant)?.name}</p>
                <p className="flex items-center gap-1 text-body-md text-on-surface-variant"><span className="material-symbols-outlined text-[16px]">call</span> {(house.owner || house.tenant)?.phone}</p>
                {(house.owner || house.tenant)?.email && !(house.owner || house.tenant).email.endsWith("@residentone.local") && (
                  <p className="flex items-center gap-1 text-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-[14px]">mail</span> {(house.owner || house.tenant)?.email}</p>
                )}
              </div>
              <span className="material-symbols-outlined text-[40px] text-success">verified_user</span>
            </div>
            <div className="mt-4 grid gap-2 rounded-lg bg-surface-container-lowest p-3 text-body-sm">
              <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-primary">work</span> Occupation: <b>{(house.owner || house.tenant)?.occupation || "—"}</b></p>
              <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px] text-primary">group</span> Family Members: <b>{(house.owner || house.tenant)?.familyMembers ?? "—"}</b></p>
              <div className="flex items-start gap-2"><span className="material-symbols-outlined text-[16px] text-primary mt-0.5">directions_car</span><div><p>Vehicles ({(house.owner || house.tenant)?.vehicles?.length || 0}):</p>{(house.owner || house.tenant)?.vehicles?.length ? (house.owner || house.tenant).vehicles.map((v,i)=><span key={i} className="mr-1 mt-1 inline-block rounded-full bg-secondary-fixed px-2 py-0.5 font-mono text-label-sm font-bold tracking-widest">{v}</span>) : <b>— No vehicles</b>}</div></div>
            </div>
          {canManageHouses && (
          <button
            type="button"
            onClick={() => setConfirmUnassign(true)}
            className="mt-5 flex items-center gap-2 rounded-lg border border-error px-4 py-2 text-label-md text-error hover:bg-surface-container-low cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_remove</span>
            Remove {house.isAssigned ? "Owner" : "Renter"}
          </button>
          )}
          {!canManageHouses && (
            <p className="mt-3 text-label-sm text-outline">No permission to remove. Ask your Society Admin for <strong>Manage Houses</strong> permission.</p>
          )}
          </div>

          <ConfirmDialog
            open={confirmUnassign}
            title={`Remove owner from House ${house.label}?`}
            message={`${house.owner?.name} will lose access to this house. Their account remains active.`}
            confirmLabel="Remove Owner"
            danger
            busy={unassignMutation.isPending}
            onConfirm={() => unassignMutation.mutate()}
            onClose={() => setConfirmUnassign(false)}
          />
        </section>
      ) : canManageHouses ? (
        <OwnerForm house={house} />
      ) : (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
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
