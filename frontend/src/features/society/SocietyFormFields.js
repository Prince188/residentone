import FormField from "../../components/form/FormField";
import PhoneInput from "../../components/ui/PhoneInput";

export const SOCIETY_TYPE_OPTIONS = [
  { value: "apartment", label: "Apartment" },
  { value: "row_house", label: "Row House" },
  { value: "mixed", label: "Mixed" },
];

export const PLAN_OPTIONS = [
  {
    id: "starter",
    name: "Basic (Starter)",
    rate: 6,
    badge: "Cost Effective",
    features: ["Gate & visitor passes", "Resident directory", "Complaints ticketing"],
  },
  {
    id: "professional",
    name: "Standard (Professional)",
    rate: 10,
    popular: true,
    badge: "Most Popular",
    features: ["Automated maintenance dues", "Online payments", "Amenity booking", "Full financials"],
  },
  {
    id: "enterprise",
    name: "Premium (Enterprise)",
    rate: 15,
    badge: "Full Automation",
    features: ["Multi-wing hierarchies", "Granular role matrix", "Priority SLA support", "Custom workflows"],
  },
];

const inputClass =
  "w-full bg-white border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow disabled:opacity-60";

function SocietyFormFields({ values, errors, onChange, disabled = false }) {
  const set = (field) => (e) => onChange(field, e.target.value);

  const selectedPlan = values.subscriptionPlan || "starter";
  const selectedBilling = values.subscriptionBilling || "monthly";
  const rawUnits = Number(values.totalUnits) || 0;
  const activePlanMeta = PLAN_OPTIONS.find((p) => p.id === selectedPlan) || PLAN_OPTIONS[0];
  const multiplier = selectedBilling === "yearly" ? 12 : 1;
  const estimatedCost = rawUnits * activePlanMeta.rate * multiplier;

  return (
    <div className="space-y-stack-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
        <FormField
          id="societyName"
          label="Society Name"
          required
          error={errors.societyName}
        >
          <input
            id="societyName"
            type="text"
            className={inputClass}
            placeholder="Green Valley CHS"
            value={values.societyName}
            onChange={set("societyName")}
            disabled={disabled}
            maxLength={200}
          />
        </FormField>
        <FormField
          id="societyType"
          label="Society Type"
          required
          error={errors.societyType}
        >
          <select
            id="societyType"
            className={inputClass}
            value={values.societyType}
            onChange={set("societyType")}
            disabled={disabled}
          >
            {SOCIETY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField id="address" label="Address" required error={errors.address}>
        <input
          id="address"
          type="text"
          className={inputClass}
          placeholder="12 Green Valley Road"
          value={values.address}
          onChange={set("address")}
          disabled={disabled}
          maxLength={300}
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-md">
        <FormField id="city" label="City" required error={errors.city}>
          <input
            id="city"
            type="text"
            className={inputClass}
            placeholder="Pune"
            value={values.city}
            onChange={set("city")}
            disabled={disabled}
            maxLength={100}
          />
        </FormField>
        <FormField id="state" label="State" required error={errors.state}>
          <input
            id="state"
            type="text"
            className={inputClass}
            placeholder="Maharashtra"
            value={values.state}
            onChange={set("state")}
            disabled={disabled}
            maxLength={100}
          />
        </FormField>
        <FormField
          id="pincode"
          label="Pincode"
          required
          error={errors.pincode}
          hint="6-digit code"
        >
          <input
            id="pincode"
            type="text"
            inputMode="numeric"
            className={inputClass}
            placeholder="411001"
            value={values.pincode}
            onChange={(e) =>
              set("pincode")({
                target: { value: e.target.value.replace(/[^\d]/g, "").slice(0, 6) },
              })
            }
            disabled={disabled}
          />
        </FormField>
      </div>

      <FormField
        id="totalUnits"
        label="Number of Units"
        required
        error={errors.totalUnits}
        hint="Total flats, apartments, or row houses (subscription pricing is based on total units)"
      >
        <input
          id="totalUnits"
          type="number"
          min="1"
          step="1"
          className={inputClass}
          placeholder="120"
          value={values.totalUnits}
          onChange={set("totalUnits")}
          disabled={disabled}
        />
      </FormField>

      {/* Subscription Plan Selection */}
      <div className="pt-2 border-t border-outline-variant/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-primary">
              Choose Subscription Plan
            </p>
            <p className="text-body-xs text-on-surface-variant">
              Pricing scales transparently with your total units
            </p>
          </div>
          <div className="inline-flex rounded-lg bg-surface-container p-0.5 border border-outline-variant/40">
            <button
              type="button"
              onClick={() => onChange("subscriptionBilling", "monthly")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedBilling === "monthly"
                  ? "bg-white text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => onChange("subscriptionBilling", "yearly")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedBilling === "yearly"
                  ? "bg-white text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Yearly (12 mo)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PLAN_OPTIONS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const cost = rawUnits * plan.rate * multiplier;
            return (
              <div
                key={plan.id}
                onClick={() => !disabled && onChange("subscriptionPlan", plan.id)}
                className={`relative rounded-xl p-3.5 cursor-pointer border-2 transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-outline-variant/50 bg-surface-container-low hover:border-outline hover:bg-surface-container"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 right-3 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    POPULAR
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-body-sm text-on-surface">
                      {plan.name}
                    </span>
                    <input
                      type="radio"
                      name="subscriptionPlanRadio"
                      checked={isSelected}
                      onChange={() => onChange("subscriptionPlan", plan.id)}
                      className="accent-primary h-4 w-4"
                    />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-title-lg font-black text-on-surface">
                      ₹{plan.rate}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      / unit / mo
                    </span>
                  </div>
                  <ul className="mt-2.5 space-y-1 text-[11px] text-on-surface-variant">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-600 font-bold shrink-0">
                          check
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {rawUnits > 0 && (
                  <div className="mt-3 pt-2 border-t border-outline-variant/30 text-[11px] text-on-surface-variant flex justify-between items-center font-medium">
                    <span>Est. {selectedBilling}:</span>
                    <span className="font-bold text-on-surface">
                      ₹{cost.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Live calculated cost preview */}
        {rawUnits > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-surface-container-high border border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                calculate
              </span>
              <span className="text-body-xs text-on-surface">
                Selected: <strong className="capitalize">{activePlanMeta.name}</strong> ({rawUnits} units × ₹{activePlanMeta.rate})
              </span>
            </div>
            <div className="text-right">
              <span className="text-body-xs text-on-surface-variant block">Total ({selectedBilling}):</span>
              <span className="text-title-sm font-bold text-primary">
                ₹{estimatedCost.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        {/* Pay After Approval Trust Banner */}
        <div className="mt-3 p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-blue-700 text-[20px] shrink-0 mt-0.5">
            verified_user
          </span>
          <div className="text-body-xs text-blue-900 leading-relaxed">
            <p className="font-bold text-blue-950">
              Pay after approval through dashboard — No payment required today
            </p>
            <p className="mt-0.5 text-blue-800">
              Your society registration will be reviewed by ResidentOne Super Admins. Once approved, you can complete payment or activate your subscription right inside your Society Admin Dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-outline-variant/30">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
          Contact Person
        </p>
      </div>

      <FormField
        id="contactName"
        label="Full Name"
        required
        error={errors.contactName}
      >
        <input
          id="contactName"
          type="text"
          className={inputClass}
          placeholder="Priya Deshmukh"
          value={values.contactName}
          onChange={set("contactName")}
          disabled={disabled}
          maxLength={100}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
        <FormField
          id="contactMobile"
          label="Mobile Number"
          required
          error={errors.contactMobile}
        >
          <PhoneInput
            id="contactMobile"
            value={values.contactMobile}
            onChange={(e) => onChange("contactMobile", e.target.value)}
            disabled={disabled}
            showDigitCounter={true}
          />
        </FormField>
        <FormField
          id="contactEmail"
          label="Email"
          required
          error={errors.contactEmail}
        >
          <input
            id="contactEmail"
            type="email"
            className={inputClass}
            placeholder="priya@example.com"
            value={values.contactEmail}
            onChange={set("contactEmail")}
            disabled={disabled}
          />
        </FormField>
      </div>
    </div>
  );
}

export function validateSocietyForm(values) {
  const errors = {};
  if (!values.societyName?.trim()) errors.societyName = "Society name is required";
  if (!values.address?.trim()) errors.address = "Address is required";
  if (!values.city?.trim()) errors.city = "City is required";
  if (!values.state?.trim()) errors.state = "State is required";
  if (!/^\d{6}$/.test(values.pincode))
    errors.pincode = "Enter a valid 6-digit pincode";
  const units = Number(values.totalUnits);
  if (!values.totalUnits || Number.isNaN(units) || !Number.isInteger(units) || units < 1)
    errors.totalUnits = "Enter a valid number of units (min 1)";
  else if (units > 100000) errors.totalUnits = "Number of units cannot exceed 100000";

  if (!values.contactName?.trim()) errors.contactName = "Contact person name is required";
  if (!/^[+\d][\d\s-]{6,14}$/.test(values.contactMobile?.trim() || ""))
    errors.contactMobile = "Enter a valid mobile number";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail?.trim() || ""))
    errors.contactEmail = "Enter a valid email address";
  return errors;
}

export function toApiPayload(values) {
  const units = Number(values.totalUnits);
  return {
    societyName: values.societyName.trim(),
    societyType: values.societyType,
    address: values.address.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    pincode: values.pincode,
    totalUnits: units,
    subscriptionPlan: values.subscriptionPlan || "starter",
    subscriptionBilling: values.subscriptionBilling || "monthly",
    contactName: values.contactName.trim(),
    contactMobile: values.contactMobile.trim(),
    contactEmail: values.contactEmail.trim().toLowerCase(),
  };
}

export const EMPTY_SOCIETY_FORM = {
  societyName: "",
  societyType: "apartment",
  address: "",
  city: "",
  state: "",
  pincode: "",
  totalUnits: "",
  subscriptionPlan: "starter",
  subscriptionBilling: "monthly",
  contactName: "",
  contactMobile: "",
  contactEmail: "",
};

export default SocietyFormFields;
