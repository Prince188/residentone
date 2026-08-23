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

export default function HouseInvitePage() {
  const { token } = useParams();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await submitHouseInvite(token, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      setResult(response.data.data);

      // Log the owner straight in (username and password are both the phone).
      try {
        await login(phone.trim(), phone.trim().replace(/\D/g, ""));
      } catch {
        // Auto-login is best effort; the owner can still use the login page.
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
            Your society admin has invited you to register as an owner.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
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
        </div>

        {error && <p className="mb-4 text-body-sm text-error">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-stack-md">
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
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-inverse-surface py-3 text-label-md text-white transition-colors hover:bg-primary disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Submitting..." : "Register as Owner"}
          </button>
        </form>

        <p className="mt-4 text-center text-label-sm text-outline">
          If you already have a ResidentOne account with this number, we will
          simply link this house to it.
        </p>
      </div>
    </div>
  );
}
