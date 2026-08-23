import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getHouse,
  checkOwnerByPhone,
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
  const [checkedUser, setCheckedUser] = useState(null);
  const [checkedPhone, setCheckedPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [assignedResult, setAssignedResult] = useState(null);
  const [invite, setInvite] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["house", house.id] });
    queryClient.invalidateQueries({ queryKey: ["house-cards"] });
    queryClient.invalidateQueries({ queryKey: ["my-societies"] });
  };

  const resetCheck = () => {
    setCheckedUser(null);
    setCheckedPhone("");
    setAssignedResult(null);
  };

  const checkMutation = useMutation({
    mutationFn: () => checkOwnerByPhone(house.id, phone),
    onSuccess: (response) => {
      setFormError("");
      setCheckedUser(response.data.data.user);
      setCheckedPhone(phone.trim());
      if (!response.data.data.exists) setName("");
    },
    onError: (error) => {
      setCheckedUser(null);
      setCheckedPhone("");
      setFormError(extractApiError(error, "Could not verify this number."));
    },
  });

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

  const handleAssignExisting = () => {
    if (!checkedUser) return;
    assignMutation.mutate({ phone: checkedPhone });
  };

  const handleAssignNew = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Name is required to create a new account.");
      return;
    }
    assignMutation.mutate({ name: name.trim(), phone: checkedPhone, email: email.trim() });
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
          Enter the owner&apos;s phone number. If they already have a ResidentOne
          account we will reuse it; otherwise an account is created automatically.
        </p>

        {formError && (
          <p className="mt-3 text-body-sm text-error">{formError}</p>
        )}

        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <FormField id="phone" label="Owner Phone Number" required>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => phone.trim() && phone.trim() !== checkedPhone && !checkedUser && checkMutation.mutate()}
                placeholder="9876543210"
                className={inputClass}
                disabled={checkMutation.isPending || Boolean(checkedPhone)}
              />
            </FormField>
          </div>
          {!checkedPhone && (
            <button
              type="button"
              onClick={() => checkMutation.mutate()}
              disabled={!phone.trim() || checkMutation.isPending}
              className="rounded-lg bg-primary-fixed px-4 py-2 text-label-md text-on-primary-fixed transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkMutation.isPending ? "Checking..." : "Check"}
            </button>
          )}
          {checkedPhone && (
            <button
              type="button"
              onClick={() => {
                setPhone("");
                resetCheck();
                setEmail("");
              }}
              className="rounded-lg border border-outline-variant px-4 py-2 text-label-md text-on-surface-variant hover:bg-surface-container-low"
            >
              Change
            </button>
          )}
        </div>

        {checkedUser && (
          <div className="mt-4 rounded-lg border border-outline-variant bg-secondary-fixed p-4">
            <p className="flex items-center gap-2 text-label-md font-semibold text-success">
              <span className="material-symbols-outlined text-[18px]">person_search</span>
              Existing account found
            </p>
            <p className="mt-2 text-body-md text-on-surface">{checkedUser.name}</p>
            <p className="text-body-sm text-on-surface-variant">
              {checkedUser.phone}
              {checkedUser.email ? ` · ${checkedUser.email}` : ""}
            </p>
            <p className="mt-2 text-label-sm text-outline">
              Their existing credentials will continue to work.
            </p>
            <button
              type="button"
              onClick={handleAssignExisting}
              disabled={assignMutation.isPending}
              className="mt-3 rounded-lg bg-inverse-surface px-4 py-2 text-label-md text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {assignMutation.isPending ? "Assigning..." : `Assign House ${house.label}`}
            </button>
          </div>
        )}

        {checkedPhone && !checkedUser && (
          <form onSubmit={handleAssignNew} className="mt-4 space-y-stack-md">
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
              No account found. A new one will be created — login username and
              password will both be <strong>{checkedPhone}</strong>.
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
              disabled={assignMutation.isPending}
              className="rounded-lg bg-inverse-surface px-4 py-2 text-label-md text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {assignMutation.isPending ? "Creating & assigning..." : "Create Account & Assign"}
            </button>
          </form>
        )}
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
