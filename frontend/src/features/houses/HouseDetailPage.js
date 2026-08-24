import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getHouse,
  searchUsersByQuery,
  assignOwnerToHouse,
  unassignOwnerFromHouse,
  createHouseInviteLink,
  extractApiError,
} from "../../lib/houses";
import FormField from "../../components/form/FormField";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

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
      <div className="rounded-xl border border-outline-variant bg-secondary-fixed p-6">
        <span className="material-symbols-outlined text-[36px] text-success">check_circle</span>
        <h3 className="mt-2 text-headline-sm text-on-surface">
          House {house.label} assigned
        </h3>
        <p className="mt-1 text-body-md text-on-surface-variant">{assignedResult.message}</p>
        {assignedResult.credentialsCreated && (
          <div className="mt-4 rounded-lg bg-surface-container-lowest p-4 text-body-sm text-on-surface">
            <p className="font-semibold">Share these login details with the owner:</p>
            <p className="mt-1">
              Username: <span className="font-mono font-semibold">{assignedResult.loginUsername}</span>
              {" · "}
              Password: <span className="font-mono font-semibold">{assignedResult.temporaryPassword}</span>
            </p>
          </div>
        )}
        <Link
          to="/houses"
          className="mt-4 inline-block rounded-lg bg-primary-fixed px-4 py-2 text-label-md text-on-primary-fixed no-underline hover:opacity-90"
        >
          Back to Manage Houses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-stack-lg">
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <h3 className="text-headline-sm text-on-surface">Assign Owner</h3>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Fill in the owner&apos;s details below. If the phone number already
          has a ResidentOne account we reuse it; otherwise an account is
          created automatically.
        </p>

        {formError && (
          <p className="mt-3 text-body-sm text-error">{formError}</p>
        )}

        <form onSubmit={handleAssign} className="mt-4 space-y-stack-md">
          <div className="relative">
            <FormField id="phone" label="Phone Number" required>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPickedUser(false);
                }}
                placeholder="Type to search existing accounts, e.g. 91062..."
                className={inputClass}
                autoComplete="off"
              />
            </FormField>

            {isSearching && searchQuery.isFetching && (
              <p className="absolute right-3 top-9 text-label-sm text-on-surface-variant">
                Searching...
              </p>
            )}

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

          <FormField id="owner-name" label="Owner Full Name" required>
            <input
              id="owner-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className={inputClass}
              required
            />
          </FormField>

          <FormField
            id="owner-email"
            label="Email (optional)"
            hint="If left blank, a placeholder email is generated."
          >
            <input
              id="owner-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rahul@example.com"
              className={inputClass}
            />
          </FormField>

          <button
            type="submit"
            disabled={!canSubmit || assignMutation.isPending}
            className="rounded-lg bg-inverse-surface px-4 py-2 text-label-md text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assignMutation.isPending ? "Assigning..." : `Assign House ${house.label}`}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-6">
        <h3 className="text-headline-sm text-on-surface">
          Let the owner fill their details
        </h3>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Share a link with the owner. It opens a form pre-filled with{" "}
          <strong>{house.societyName}</strong> and{" "}
          <strong>House {house.label}</strong>. The link is valid for 7 days.
        </p>

        {invite && (
          <div className="mt-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
            <p className="break-all font-mono text-label-sm text-on-surface">
              {invite.inviteUrl}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(invite.inviteUrl)}
                className="rounded-lg bg-primary-fixed px-4 py-2 text-label-md text-on-primary-fixed hover:opacity-90"
              >
                Copy Link
              </button>
              <button
                type="button"
                onClick={() => inviteMutation.mutate()}
                className="rounded-lg border border-outline-variant px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}

        {!invite && (
          <button
            type="button"
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
            className="mt-3 flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-label-md text-primary hover:bg-secondary-fixed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            {inviteMutation.isPending ? "Generating..." : "Generate Share Link"}
          </button>
        )}
      </section>
    </div>
  );
}

export default function HouseDetailPage() {
  const { unitId } = useParams();
  const queryClient = useQueryClient();
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [unassignError, setUnassignError] = useState("");

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
      <div className="mx-auto max-w-3xl space-y-stack-lg">
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
    <div className="mx-auto max-w-3xl space-y-stack-lg">
      <section>
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
            <h1 className="text-headline-md text-on-surface">House {house.label}</h1>
            <p className="text-body-sm text-on-surface-variant">
              {house.societyName}
              {house.block ? ` · Block ${house.block}` : ""}
              {house.floor ? ` · Floor ${house.floor}` : ""}
            </p>
          </div>
        </div>
      </section>

      {unassignError && <p className="text-body-sm text-error">{unassignError}</p>}

      {house.isAssigned ? (
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-headline-sm text-on-surface">Current Owner</h3>
              <p className="mt-2 text-body-lg font-semibold text-on-surface">
                {house.owner?.name}
              </p>
              <p className="text-body-md text-on-surface-variant">{house.owner?.phone}</p>
              {house.owner?.email && !house.owner.email.endsWith("@residentone.local") && (
                <p className="text-body-sm text-on-surface-variant">{house.owner.email}</p>
              )}
            </div>
            <span className="material-symbols-outlined text-[40px] text-success">verified_user</span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmUnassign(true)}
            className="mt-5 flex items-center gap-2 rounded-lg border border-error px-4 py-2 text-label-md text-error hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">person_remove</span>
            Remove Owner
          </button>

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
      ) : (
        <OwnerForm house={house} />
      )}
    </div>
  );
}
