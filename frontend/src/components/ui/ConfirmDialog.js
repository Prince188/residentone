import { useEffect, useRef, useState } from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Enter reason",
  busy = false,
  error = "",
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setReasonError("");
      return;
    }
    const handleEscape = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, busy, onClose]);

  if (!open) return null;

  const handleConfirm = () => {
    if (requireReason && reason.trim().length < 3) {
      setReasonError("Please provide a reason (min 3 characters)");
      return;
    }
    setReasonError("");
    onConfirm(requireReason ? reason.trim() : undefined);
  };

  const confirmClasses = danger
    ? "bg-error text-on-error hover:opacity-90"
    : "bg-primary text-on-primary hover:bg-inverse-surface";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl"
      >
        <h2 className="text-body-lg font-semibold text-on-surface">{title}</h2>
        {message && (
          <p className="mt-2 whitespace-pre-line text-body-sm text-on-surface-variant">
            {message}
          </p>
        )}

        {requireReason && (
          <div className="mt-4">
            <label
              htmlFor="confirm-dialog-reason"
              className="block font-label-sm text-label-sm text-on-surface-variant mb-unit"
            >
              {reasonLabel} <span className="text-error">*</span>
            </label>
            <textarea
              id="confirm-dialog-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              disabled={busy}
              className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow disabled:opacity-60"
            />
            {reasonError && (
              <p className="mt-1 text-label-sm text-error">{reasonError}</p>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-body-sm text-error">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-outline-variant px-4 py-2 text-label-md text-on-surface transition-colors hover:bg-surface-container-low cursor-pointer disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-label-md transition-opacity cursor-pointer disabled:opacity-60 ${confirmClasses}`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
