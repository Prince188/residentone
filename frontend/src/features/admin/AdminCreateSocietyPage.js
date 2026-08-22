import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createSocietyManually,
  extractApiError,
  extractFieldErrors,
} from "../../lib/societies";
import SocietyFormFields, {
  validateSocietyForm,
  toApiPayload,
  EMPTY_SOCIETY_FORM,
} from "../society/SocietyFormFields";

export default function AdminCreateSocietyPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(EMPTY_SOCIETY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

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
      const response = await createSocietyManually(toApiPayload(values));
      const societyId = response.data.data._id || response.data.data.societyId;
      navigate(societyId ? `/admin/societies/${societyId}` : "/admin/societies");
    } catch (err) {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      setFormError(
        extractApiError(err, "Something went wrong while creating the society. Please try again.")
      );
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-stack-lg">
      <div>
        <Link
          to="/admin/societies"
          className="inline-flex items-center gap-1 text-label-md text-primary hover:underline no-underline"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Societies
        </Link>
        <h1 className="mt-2 text-headline-md text-on-surface">Create Society</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Manually register a society. It becomes active immediately.
        </p>
      </div>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
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
            {loading ? "Creating..." : "Create Society"}
          </button>
        </form>
      </section>
    </div>
  );
}
