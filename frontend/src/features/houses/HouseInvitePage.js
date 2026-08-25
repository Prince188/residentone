import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getHouseInvitePreview,
  submitHouseInvite,
  extractApiError,
} from "../../lib/houses";
import FormField from "../../components/form/FormField";
import useAuthStore from "../../stores/auth.store";

const inputClass =
  "w-full bg-white border border-outline-variant rounded-lg px-4 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow";

const STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Vehicles" },
  { id: 3, label: "Additional" },
];

function StepIndicator({ current }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex flex-1 items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-label-sm font-semibold ${
                current > step.id
                  ? "bg-success text-white"
                  : current === step.id
                    ? "bg-primary text-white"
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

export default function HouseInvitePage() {
  const { token } = useParams();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [occupation, setOccupation] = useState("");
  const [familyMembers, setFamilyMembers] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const previewQuery = useQuery({
    queryKey: ["house-invite", token],
    queryFn: async () => (await getHouseInvitePreview(token)).data.data,
    retry: false,
  });

  const preview = previewQuery.data;
  const isRenter = preview?.residentType === "renter";
  const roleLabel = isRenter ? "Renter" : "Owner";

  const goNext = () => {
    setError("");
    if (step === 1) {
      if (!name.trim()) {
        setError("Name is required.");
        return;
      }
      if (phone.replace(/\D/g, "").length < 10) {
        setError("Enter a valid phone number.");
        return;
      }
    }
    if (step === 2) {
      const filled = vehicles.filter((v) => v.trim());
      if (filled.length !== vehicles.filter((v) => v.trim() !== "").length || vehicles.some((v) => v.trim() === "" && v !== "")) {
        setError("Fill in or remove the empty vehicle rows.");
        return;
      }
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const response = await submitHouseInvite(token, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        vehicles: vehicles.map((v) => v.trim()).filter(Boolean),
        occupation: occupation.trim(),
        familyMembers: familyMembers === "" ? undefined : Number(familyMembers),
      });
      setResult(response.data.data);

      // Log the user straight in (username and password are both the phone).
      try {
        await login(phone.trim(), phone.trim().replace(/\D/g, ""));
      } catch {
        // Auto-login is best effort; they can still use the login page.
      }
    } catch (err) {
      setError(extractApiError(err, "Could not submit your details."));
    } finally {
      setSubmitting(false);
    }
  };

  if (previewQuery.isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center p-10 text-body-md text-on-surface-variant">
        Loading invite...
      </div>
    );
  }

  if (previewQuery.isError || !preview) {
    return (
      <div className="flex-grow flex items-center justify-center p-10">
        <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">link_off</span>
          <h1 className="mt-3 text-headline-sm text-on-surface">Invalid or expired link</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            This house invite link is no longer valid. Please ask your society
            admin for a new link.
          </p>
          <Link to="/" className="mt-4 inline-block text-label-md text-primary no-underline hover:underline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex-grow flex items-center justify-center p-margin-mobile md:p-margin-desktop py-16">
        <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
          <span className="material-symbols-outlined text-success text-[44px]">check_circle</span>
          <h1 className="mt-3 text-headline-sm text-on-surface">You&apos;re all set!</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">{result.message}</p>
          {result.credentialsCreated && (
            <p className="mt-3 rounded-lg bg-secondary-fixed p-3 text-body-sm text-on-surface">
              Username: <strong>{result.loginUsername}</strong> · Password:{" "}
              <strong>{result.loginUsername}</strong>
            </p>
          )}
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="mt-5 inline-block rounded-lg bg-primary-fixed px-5 py-2.5 text-label-md text-on-primary-fixed no-underline hover:opacity-90"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="mt-5 inline-block rounded-lg bg-inverse-surface px-5 py-2.5 text-label-md text-white no-underline hover:opacity-90"
            >
              Login Now
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-start justify-center p-margin-mobile md:p-margin-desktop py-16">
      <div className="w-full max-w-md">
        <div className="mb-stack-lg text-center">
          <h1 className="text-headline-lg text-on-surface">Claim Your House</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Your society admin has invited you to register as{" "}
            <strong>{isRenter ? "a renter" : "the owner"}</strong>.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-surface-container-low p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
              Society
            </p>
            <p className="mt-1 truncate text-body-md font-semibold text-on-surface">
              {preview.societyName}
            </p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
              House Number
            </p>
            <p className="mt-1 text-body-md font-semibold text-on-surface">
              House {preview.houseNumber}
            </p>
          </div>
          <div className="rounded-xl bg-secondary-fixed p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
              You are
            </p>
            <p className="mt-1 text-body-md font-semibold text-on-surface">{roleLabel}</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 3) goNext();
            else handleSubmit();
          }}
          className="space-y-stack-md"
        >
          <StepIndicator current={step} />

          {error && <p className="text-body-sm text-error">{error}</p>}

          {step === 1 && (
            <>
              <FormField id="invite-name" label="Full Name" required>
                <input
                  id="invite-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className={inputClass}
                  required
                />
              </FormField>
              <FormField
                id="invite-phone"
                label="Phone Number"
                required
                hint="This becomes your login username and password."
              >
                <input
                  id="invite-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className={inputClass}
                  required
                />
              </FormField>
              <FormField
                id="invite-email"
                label="Email (optional)"
                hint="If left blank, a placeholder email is generated."
              >
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className={inputClass}
                />
              </FormField>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-body-sm text-on-surface-variant">
                Add vehicle numbers registered under you (optional).
              </p>
              {vehicles.map((vehicle, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={vehicle}
                    onChange={(e) =>
                      setVehicles((list) =>
                        list.map((item, idx) =>
                          idx === index ? e.target.value.toUpperCase() : item
                        )
                      )
                    }
                    placeholder={`e.g. MH12AB${1234 + index}`}
                    maxLength={15}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setVehicles((list) => list.filter((_, idx) => idx !== index))
                    }
                    aria-label="Remove vehicle"
                    disabled={vehicles.length <= 1}
                    className="rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-colors hover:bg-error hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
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
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-body-sm text-on-surface-variant">
                Almost done! A couple of optional details.
              </p>
              <FormField id="invite-occupation" label="Occupation">
                <input
                  id="invite-occupation"
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  maxLength={100}
                  className={inputClass}
                />
              </FormField>
              <FormField
                id="invite-family"
                label="Family Members"
                hint="Total people living in the house."
              >
                <input
                  id="invite-family"
                  type="number"
                  min={0}
                  max={50}
                  value={familyMembers}
                  onChange={(e) => setFamilyMembers(e.target.value)}
                  placeholder="e.g. 4"
                  className={inputClass}
                />
              </FormField>
            </>
          )}

          <div className="flex items-center gap-3 pt-1">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep((s) => s - 1);
                }}
                className="rounded-lg border border-outline-variant px-4 py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container-low"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className={`rounded-lg py-3 text-label-md text-white transition-colors hover:bg-primary disabled:opacity-50 cursor-pointer ${
                step > 1 ? "flex-1 bg-inverse-surface" : "w-full bg-inverse-surface"
              }`}
            >
              {step < 3
                ? "Next"
                : submitting
                  ? "Submitting..."
                  : `Register as ${roleLabel}`}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-label-sm text-outline">
          If you already have a ResidentOne account with this number, we will
          simply link this house to it.
        </p>
      </div>
    </div>
  );
}
