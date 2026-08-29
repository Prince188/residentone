import { useState } from "react";
import { Link } from "react-router-dom";
import {
  registerSociety,
  extractApiError,
  extractFieldErrors,
} from "../../lib/societies";
import SocietyFormFields, {
  validateSocietyForm,
  toApiPayload,
  EMPTY_SOCIETY_FORM,
} from "./SocietyFormFields";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBu3pr4U7oKtJbQULJB8mzgvMWa8328HhCorKsYSzhTKKFP0w1OAbMY4Yaw0YGxreD0vX7LNioT2JqepVRsAu2T7yhNSBbJPHkICey52GnLh5KkMwupSou6FMVX6qrvB2GoLi0q8Y2IP3M9D4TJh3f0nr6vDaFg0X_jIETyycsPEJ8UOYwuMCEpUgnfXK75p3PbDVTQ79wZ9QM4kPilDtS2bH_8erhTD04cjUabxWtSveqAoWewOkFfjA";

function SuccessPanel({ result }) {
  return (
    <div className="w-full max-w-md text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-fixed">
        <span className="material-symbols-outlined text-[36px] text-on-tertiary-fixed">
          check_circle
        </span>
      </div>
      <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">
        Registration Submitted
      </h2>
      <p className="font-body-md text-body-md text-on-surface-variant mb-stack-md">
        Your society registration has been submitted successfully. Our team will
        review your request and notify you once it is approved.
      </p>
      {result?.societyId && (
        <div className="mb-stack-lg inline-flex flex-col items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-low px-6 py-4">
          <span className="text-label-sm uppercase tracking-widest text-outline">
            Registration ID
          </span>
          <span className="text-body-md font-semibold text-on-surface break-all">
            {result.societyId}
          </span>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-3 py-0.5 text-label-sm font-semibold capitalize text-on-secondary-fixed">
            Status: {result.status}
          </span>
        </div>
      )}
      <div>
        <Link
          to="/"
          className="inline-block bg-inverse-surface text-white font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-primary transition-colors no-underline"
        >
          Back to ResidentOne
        </Link>
      </div>
    </div>
  );
}

export default function CreateSocietyPage() {
  const [values, setValues] = useState(EMPTY_SOCIETY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null);

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (formError) setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const validationErrors = validateSocietyForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await registerSociety(toApiPayload(values));
      setResult(response.data.data);
      window.scrollTo({ top: 0 });
    } catch (err) {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      setFormError(
        extractApiError(err, "Something went wrong while submitting your registration. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex bg-surface-container-lowest pt-16 md:pt-24">
      <div className="w-full flex">
        <div className="hidden lg:flex w-1/2 relative bg-surface-container-highest">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-on-primary-fixed/90 to-on-primary-fixed/40 mix-blend-multiply" />
          </div>
          <div className="relative z-10 p-16 flex flex-col justify-end text-white max-w-2xl">
            <h1 className="font-display-lg text-display-lg mb-stack-lg leading-tight">
              Bring Your Society Online
            </h1>
            <p className="font-body-lg text-body-lg text-primary-fixed-dim opacity-90 max-w-lg">
              Register your community on ResidentOne and give your residents a
              modern, transparent way to manage everything from maintenance to
              visitors.
            </p>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-margin-mobile md:p-margin-desktop py-16">
          {result ? (
            <SuccessPanel result={result} />
          ) : (
            <div className="w-full max-w-xl">
              <div className="mb-stack-lg text-center lg:text-left">
                <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">
                  Create Your Society
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Register your society on ResidentOne. Our team will review your
                  request before activation.
                </p>
              </div>

              {formError && (
                <div className="mb-stack-md rounded-lg border border-error-container bg-error-container/40 px-4 py-3">
                  <p className="text-body-sm text-error">{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
                  Society Information
                </p>
                <SocietyFormFields
                  values={values}
                  errors={errors}
                  onChange={handleChange}
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-stack-lg w-full font-label-md text-label-md bg-primary text-on-primary py-3 rounded-lg hover:bg-inverse-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Submitting..." : "Submit Registration"}
                </button>
              </form>

              <p className="mt-stack-md text-center lg:text-left text-label-sm text-outline">
                Submitting this form does not activate your society. It will remain
                in review until approved by the ResidentOne team.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
