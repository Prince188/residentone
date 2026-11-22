import { useState } from "react";
import { extendSocietySubscription } from "../../lib/societies";
import { getSubscriptionRenewalMeta } from "../dashboard/SubscriptionStatusCard";

export default function ExtendSubscriptionModal({ society, onClose, onSuccess }) {
  const [mode, setMode] = useState("preset"); // 'preset' | 'custom'
  const [selectedPreset, setSelectedPreset] = useState("7_days");
  const [customDate, setCustomDate] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [billingCycle, setBillingCycle] = useState(society.subscriptionBilling || "yearly");
  const [notes, setNotes] = useState("");
  const [recordedAmount, setRecordedAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Super Admin Manual Grant");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentMeta = getSubscriptionRenewalMeta(society);

  const presets = [
    { id: "7_days", label: "+7 Days Grace", days: 7, months: 0, badge: "Quick Grace" },
    { id: "15_days", label: "+15 Days Trial", days: 15, months: 0, badge: "Trial Extension" },
    { id: "30_days", label: "+30 Days (1 Month)", days: 30, months: 0 },
    { id: "6_months", label: "+6 Months (Semi-Annual)", days: 0, months: 6, badge: "₹2,100 Plan" },
    { id: "12_months", label: "+12 Months (Annual)", days: 0, months: 12, badge: "₹4,000 Plan" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      let payload = {
        isSubscriptionPaid: isPaid,
        plan: "standard",
        billingCycle,
        paymentMode,
        recordedAmount: recordedAmount ? Number(recordedAmount) : 0,
        notes: notes.trim() || undefined,
      };

      if (mode === "custom") {
        if (!customDate) {
          setError("Please select a valid custom date.");
          setSubmitting(false);
          return;
        }
        payload.customDate = customDate;
      } else {
        const p = presets.find((x) => x.id === selectedPreset);
        if (p) {
          payload.days = p.days;
          payload.months = p.months;
        }
      }

      await extendSocietySubscription(society._id, payload);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to extend subscription.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">update</span>
              <h3 className="text-title-md font-bold text-on-surface">Extend Validity & Grace Period</h3>
            </div>
            <p className="text-label-sm text-on-surface-variant mt-0.5">
              {society.name} ({society.city || "India"}) · {society.totalUnits || 0} Units
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-low cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-container-low/70 p-3 text-label-sm">
          <span className="text-on-surface-variant">Current Validity:</span>
          <span className="font-bold text-on-surface">
            {currentMeta.formattedDate ? (
              <>
                {currentMeta.formattedDate}{" "}
                <span className={currentMeta.isExpired ? "text-error" : currentMeta.isExpiringSoon ? "text-amber-700" : "text-emerald-700"}>
                  ({currentMeta.isExpired ? `Expired ${Math.abs(currentMeta.daysRemaining)}d ago` : `${currentMeta.daysRemaining}d left`})
                </span>
              </>
            ) : (
              "No active subscription"
            )}
          </span>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-error-container/40 p-2.5 text-label-sm text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-label-sm font-semibold text-on-surface mb-2">
              Select Extension Option:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setMode("preset");
                    setSelectedPreset(p.id);
                  }}
                  className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                    mode === "preset" && selectedPreset === p.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-outline-variant bg-white hover:bg-surface-container-low"
                  }`}
                >
                  <span className="text-label-sm font-bold text-on-surface">{p.label}</span>
                  {p.badge && (
                    <span className="mt-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {p.badge}
                    </span>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                  mode === "custom"
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-outline-variant bg-white hover:bg-surface-container-low"
                }`}
              >
                <span className="text-label-sm font-bold text-on-surface">Custom Expiry Date</span>
                <span className="mt-1 text-[10px] text-outline">Pick specific day</span>
              </button>
            </div>
          </div>

          {mode === "custom" && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low/40 p-3">
              <label className="block text-label-sm font-semibold text-on-surface mb-1">
                New Expiry Date:
              </label>
              <input
                type="date"
                value={customDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label-sm font-semibold text-on-surface mb-1">
                Plan Duration:
              </label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-body-sm font-bold text-on-surface focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="yearly">12 Months (₹4,000 base)</option>
                <option value="semi_annual">6 Months (₹2,100 base)</option>
              </select>
            </div>
            <div>
              <label className="block text-label-sm font-semibold text-on-surface mb-1">
                Payment Status:
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modal-is-paid"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="modal-is-paid" className="text-label-sm text-on-surface cursor-pointer select-none">
                  Mark as Paid Active
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label-sm font-semibold text-on-surface mb-1">
                Recorded Amount (₹):
              </label>
              <input
                type="number"
                placeholder="0 (Complimentary / Trial)"
                value={recordedAmount}
                onChange={(e) => setRecordedAmount(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-label-sm font-semibold text-on-surface mb-1">
                Payment Mode / Gateway:
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="Super Admin Manual Grant">Super Admin Grant / Trial</option>
                <option value="Offline NEFT/RTGS">Offline Bank Transfer (NEFT/RTGS)</option>
                <option value="Offline Cheque">Offline Cheque</option>
                <option value="Offline Cash">Cash Receipt</option>
                <option value="UPI Direct">UPI Direct Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface mb-1">
              Admin Notes / Reference (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Cheque #49281 cleared / Granted 15-day onboarding trial"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-outline-variant/60 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-outline-variant px-4 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-md font-bold text-on-primary hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              {submitting ? "Applying..." : "Confirm Extension"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
