import FormField from "../../components/form/FormField";

export const SOCIETY_TYPE_OPTIONS = [
  { value: "apartment", label: "Apartment" },
  { value: "row_house", label: "Row House" },
  { value: "mixed", label: "Mixed" },
];

const inputClass =
  "w-full bg-white border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow disabled:opacity-60";

function SocietyFormFields({ values, errors, onChange, disabled = false }) {
  const set = (field) => (e) => onChange(field, e.target.value);

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
        hint="Total flats and row houses in the society"
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

      <div className="pt-stack-sm">
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
          <input
            id="contactMobile"
            type="tel"
            className={inputClass}
            placeholder="+91 98765 43210"
            value={values.contactMobile}
            onChange={set("contactMobile")}
            disabled={disabled}
            maxLength={16}
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
  if (!values.societyName.trim()) errors.societyName = "Society name is required";
  if (!values.address.trim()) errors.address = "Address is required";
  if (!values.city.trim()) errors.city = "City is required";
  if (!values.state.trim()) errors.state = "State is required";
  if (!/^\d{6}$/.test(values.pincode))
    errors.pincode = "Enter a valid 6-digit pincode";
  const units = Number(values.totalUnits);
  if (!values.totalUnits || Number.isNaN(units) || !Number.isInteger(units) || units < 1)
    errors.totalUnits = "Enter a valid number of units (min 1)";
  else if (units > 100000) errors.totalUnits = "Number of units cannot exceed 100000";
  if (!values.contactName.trim()) errors.contactName = "Contact person name is required";
  if (!/^[+\d][\d\s-]{6,14}$/.test(values.contactMobile.trim()))
    errors.contactMobile = "Enter a valid mobile number";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim()))
    errors.contactEmail = "Enter a valid email address";
  return errors;
}

export function toApiPayload(values) {
  return {
    societyName: values.societyName.trim(),
    societyType: values.societyType,
    address: values.address.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    pincode: values.pincode,
    totalUnits: Number(values.totalUnits),
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
  contactName: "",
  contactMobile: "",
  contactEmail: "",
};

export default SocietyFormFields;
