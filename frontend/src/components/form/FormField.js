export default function FormField({
  id,
  label,
  error,
  required = false,
  hint,
  children,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-label-sm text-label-sm text-on-surface-variant mb-unit"
      >
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-label-sm text-outline">{hint}</p>
      )}
      {error && <p className="mt-1 text-label-sm text-error">{error}</p>}
    </div>
  );
}
