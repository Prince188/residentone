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
  matchText = "",
  matchLabel = "",
  busy = false,
  error = "",
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [inputMatch, setInputMatch] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setReasonError("");
      setInputMatch("");
      return;
    }
    const handleEscape = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, busy, onClose]);

  if (!open) return null;

  const isMatchValid = !matchText || inputMatch.trim().toLowerCase() === matchText.trim().toLowerCase();

  const handleConfirm = () => {
    if (matchText && !isMatchValid) {
      return;
    }
    if (requireReason && reason.trim().length < 3) {
      setReasonError("Please provide a reason (min 3 characters)");
      return;
    }
    setReasonError("");
    onConfirm(requireReason ? reason.trim() : undefined);
  };

  const confirmClasses = danger
    ? "bg-error text-white hover:opacity-90 shadow-xs"
    : "bg-primary text-white hover:bg-primary-hover shadow-xs";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={busy ? undefined : onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-3xl border border-black/[0.08] bg-white p-6 shadow-apple-modal"
      >
        <h2 className="text-xl font-bold text-on-surface font-display">{title}</h2>
        {message && (
          <p className="mt-2 whitespace-pre-line text-body-sm text-on-surface-variant leading-relaxed">
            {message}
          </p>
        )}

        {matchText && (
          <div className="mt-4 space-y-1.5">
            <label
              htmlFor="confirm-dialog-match"
              className="block text-xs font-semibold text-on-surface"
            >
              {matchLabel || (
                <>
                  Please type <strong className="text-error font-mono">{matchText}</strong> to confirm:
                </>
              )}
            </label>
            <input
              id="confirm-dialog-match"
              type="text"
              value={inputMatch}
              onChange={(e) => setInputMatch(e.target.value)}
              placeholder={matchText}
              disabled={busy}
              className="w-full bg-white border border-black/[0.1] rounded-xl px-4 py-2.5 text-body-sm font-mono text-on-surface focus:outline-none focus:border-error focus:ring-4 focus:ring-error/10 transition-all disabled:opacity-60"
            />
          </div>
        )}

        {requireReason && (
          <div className="mt-4">
            <label
              htmlFor="confirm-dialog-reason"
              className="block text-xs font-semibold text-on-surface-variant mb-1"
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
              className="w-full bg-white border border-black/[0.1] rounded-xl px-4 py-2.5 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-60"
            />
            {reasonError && (
              <p className="mt-1 text-xs text-error font-medium">{reasonError}</p>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-xs text-error font-medium">{error}</p>}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-black/[0.1] bg-surface-container px-5 py-2.5 text-body-sm font-semibold text-on-surface transition-all hover:bg-surface-container-high cursor-pointer active:scale-95 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || (matchText && !isMatchValid)}
            className={`rounded-full px-5 py-2.5 text-body-sm font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${confirmClasses}`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}