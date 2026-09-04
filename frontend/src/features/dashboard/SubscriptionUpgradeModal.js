import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveSociety,
} from "../../stores/society.store";
import {
  paySocietySubscription,
  SUBSCRIPTION_PLAN_LABELS,
  extractApiError,
} from "../../lib/societies";
import { AVAILABLE_PLANS, getSubscriptionRenewalMeta } from "./SubscriptionStatusCard";
import toast from "../../lib/toast";

export default function SubscriptionUpgradeModal() {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const isUpgradeModalOpen = useSocietyStore((state) => state.isUpgradeModalOpen);
  const closeUpgradeModal = useSocietyStore((state) => state.closeUpgradeModal);
  const updateActiveSocietySubscription = useSocietyStore(
    (state) => state.updateActiveSocietySubscription
  );
  const loadMySocieties = useSocietyStore((state) => state.loadMySocieties);

  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);

  const registeredPlanId = activeSociety?.subscriptionPlan || "starter";
  const registeredPlanMeta =
    AVAILABLE_PLANS.find((p) => p.id === registeredPlanId) || AVAILABLE_PLANS[0];

  // Set default selection to the next higher tier when modal opens or plan changes
  useEffect(() => {
    if (isUpgradeModalOpen && activeSociety) {
      setError("");
      setShowCheckoutConfirm(false);
      const nextTier = AVAILABLE_PLANS.find((p) => p.tier > registeredPlanMeta.tier);
      if (nextTier) {
        setSelectedPlan(nextTier.id);
      } else {
        setSelectedPlan(registeredPlanMeta.id);
      }
    }
  }, [isUpgradeModalOpen, activeSociety?.id, registeredPlanMeta.tier]);

  if (!isUpgradeModalOpen || !activeSociety || !activeSociety.isSubscriptionPaid) {
    return null;
  }

  const chosenPlanMeta =
    AVAILABLE_PLANS.find((p) => p.id === selectedPlan) || AVAILABLE_PLANS[0];

  const units = Number(activeSociety.totalUnits) || 1;
  const currentRate = registeredPlanMeta.rate || 6;
  const renewalMeta = getSubscriptionRenewalMeta(activeSociety);
  const paidPlanName = SUBSCRIPTION_PLAN_LABELS[activeSociety.subscriptionPlan] || "Basic";

  const isUpgrade = chosenPlanMeta.tier > registeredPlanMeta.tier;
  const isHighestPlan = registeredPlanMeta.tier === 3;

  // Proration Calculation for Mid-Cycle Upgrade
  let unusedCredit = 0;
  let newPeriodCost = 0;
  let proratedPayable = 0;

  if (isUpgrade && renewalMeta.daysRemaining > 0) {
    const currentDailyBurn = (units * currentRate) / 30;
    const newDailyBurn = (units * chosenPlanMeta.rate) / 30;
    unusedCredit = Math.round(currentDailyBurn * renewalMeta.daysRemaining);
    newPeriodCost = Math.round(newDailyBurn * renewalMeta.daysRemaining);
    proratedPayable = Math.max(1, newPeriodCost - unusedCredit);
  }

  const handlePay = async (isDemo = false, paymentMethod = "demo_upi") => {
    setLoading(true);
    setError("");
    try {
      const res = await paySocietySubscription(activeSociety.id, {
        plan: selectedPlan,
        billingCycle: activeSociety.subscriptionBilling || "yearly",
        isDemoSimulation: isDemo,
        paymentMethod,
      });

      const updatedSociety = res.data?.data?.society;

      if (updateActiveSocietySubscription) {
        updateActiveSocietySubscription({
          isSubscriptionPaid: true,
          subscriptionPlan: updatedSociety?.subscriptionPlan || selectedPlan,
          subscriptionBilling: updatedSociety?.subscriptionBilling || activeSociety.subscriptionBilling,
          subscriptionExpiresAt: updatedSociety?.subscriptionExpiresAt || activeSociety.subscriptionExpiresAt,
        });
      }

      toast.success(
        "Plan Upgraded Successfully!",
        `Upgraded to ${chosenPlanMeta.fullName}. Expiry date preserved (${renewalMeta.formattedDate}).`
      );

      closeUpgradeModal();
      setShowCheckoutConfirm(false);
      await loadMySocieties();
      queryClient.invalidateQueries();
    } catch (err) {
      setError(extractApiError(err, "Plan upgrade failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-outline-variant space-y-5 my-8 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[26px]">upgrade</span>
            </div>
            <div>
              <h3 className="text-title-md font-extrabold text-on-surface flex items-center gap-2">
                Upgrade Society Plan
              </h3>
              <p className="text-body-xs text-on-surface-variant">
                Apply instant prorated credit from your current active subscription
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeUpgradeModal}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Current Plan Status Info Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface-container border border-outline-variant/60 text-body-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">apartment</span>
            <span className="font-bold text-on-surface">{activeSociety.name}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300/60 px-2.5 py-0.5 text-[11px] font-bold">
              <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
              Current: {paidPlanName} (₹{currentRate}/unit/mo)
            </span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant text-label-sm">
            <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
            <span>
              <strong>{renewalMeta.daysRemaining} days</strong> remaining (until {renewalMeta.formattedDate})
            </span>
          </div>
        </div>

        {/* Highest plan notice */}
        {isHighestPlan ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-[26px] shrink-0">workspace_premium</span>
            <div>
              <p className="font-bold text-body-sm">Highest Tier Active</p>
              <p className="text-body-xs text-emerald-800 mt-0.5">
                Your society is already enjoying our top-tier <strong>{registeredPlanMeta.fullName}</strong> plan with all platform features unlocked.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Plan Selection Cards */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                Choose Target Plan to Upgrade:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {AVAILABLE_PLANS.map((plan) => {
                  const isCurrent = plan.id === registeredPlanId;
                  const isPlanDowngrade = plan.tier < registeredPlanMeta.tier;
                  const isPlanUpgrade = plan.tier > registeredPlanMeta.tier;
                  const isSelected = selectedPlan === plan.id;
                  const isDisabled = !isPlanUpgrade;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        if (isPlanUpgrade) setSelectedPlan(plan.id);
                      }}
                      className={`relative flex flex-col justify-between rounded-2xl p-4 transition-all border ${
                        isDisabled
                          ? "opacity-55 cursor-not-allowed bg-surface-container-low border-outline-variant/40"
                          : isSelected
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm cursor-pointer"
                          : "border-outline-variant/70 bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low/40 cursor-pointer"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-extrabold text-on-surface text-body-sm">
                            {plan.name}
                          </span>
                          {plan.popular && (
                            <span className="bg-primary text-on-primary text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                              Popular
                            </span>
                          )}
                          {isCurrent && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>

                        <div className="mb-2">
                          <span className="text-[20px] font-black text-on-surface">
                            ₹{plan.rate}
                          </span>
                          <span className="text-[11px] text-on-surface-variant"> /unit/mo</span>
                        </div>

                        <ul className="space-y-1 text-[11px] text-on-surface-variant">
                          {plan.features.slice(0, 3).map((f, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="material-symbols-outlined text-[13px] text-emerald-600 shrink-0 mt-0.5">
                                check
                              </span>
                              <span className="truncate">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-3 pt-2 border-t border-outline-variant/30 text-center">
                        {isCurrent ? (
                          <span className="text-[10px] font-semibold text-outline">Current Active Plan</span>
                        ) : isPlanDowngrade ? (
                          <span className="text-[10px] font-semibold text-outline">Available at Renewal</span>
                        ) : isSelected ? (
                          <span className="inline-flex items-center justify-center gap-1 w-full py-1 rounded-lg bg-primary text-on-primary text-[11px] font-bold shadow-2xs">
                            <span className="material-symbols-outlined text-[13px]">check</span>
                            Selected
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-full py-1 rounded-lg bg-surface-container text-on-surface-variant text-[11px] font-semibold hover:bg-surface-container-high transition-colors">
                            Select Upgrade
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Proration Math Itemized Invoice */}
            {isUpgrade && (
              <div className="rounded-2xl bg-surface-container-low border border-outline-variant/70 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Proration Math Breakdown
                  </span>
                  <span className="text-[11px] font-bold text-primary">
                    Duration: {renewalMeta.daysRemaining} days (Preserved until {renewalMeta.formattedDate})
                  </span>
                </div>

                <div className="space-y-1.5 text-body-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">
                      New Plan ({chosenPlanMeta.fullName} @ ₹{chosenPlanMeta.rate}/unit/mo × {units} units)
                    </span>
                    <span className="font-semibold text-on-surface">₹{newPeriodCost.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">savings</span>
                      Less Unused {registeredPlanMeta.name} Credit
                    </span>
                    <span>-₹{unusedCredit.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="border-t border-outline-variant/50 pt-2 flex justify-between items-center text-on-surface">
                    <div>
                      <span className="font-bold text-body-md text-primary block leading-tight">
                        Net Payable Today
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        Instant upgrade with no loss of remaining days
                      </span>
                    </div>
                    <span className="text-[26px] font-black text-primary leading-none">
                      ₹{proratedPayable.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-body-sm text-red-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeUpgradeModal}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-outline-variant font-semibold text-label-md text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handlePay(true, "instant_simulation")}
                disabled={loading || !isUpgrade}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-label-md shadow-xs hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    <span>Quick Upgrade (Demo)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowCheckoutConfirm(true)}
                disabled={loading || !isUpgrade}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-label-md shadow-xs hover:bg-inverse-surface transition-all disabled:opacity-60 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">credit_card</span>
                <span>Upgrade Online (₹{proratedPayable.toLocaleString("en-IN")})</span>
              </button>
            </div>
          </>
        )}

        {/* Checkout confirmation sub-modal */}
        {showCheckoutConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-outline-variant space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
                <h4 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    upgrade
                  </span>
                  Plan Upgrade Invoice
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCheckoutConfirm(false)}
                  className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-2.5 bg-surface-container-low p-4 rounded-xl border border-outline-variant/40 text-body-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Society</span>
                  <span className="font-semibold text-on-surface">{activeSociety.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Target Plan</span>
                  <span className="font-semibold text-on-surface">{chosenPlanMeta.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Duration Remaining</span>
                  <span className="font-semibold text-on-surface">{renewalMeta.daysRemaining} days (until {renewalMeta.formattedDate})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">New Plan Charge</span>
                  <span className="font-semibold text-on-surface">₹{newPeriodCost.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Less Unused {registeredPlanMeta.name} Credit</span>
                  <span>-₹{unusedCredit.toLocaleString("en-IN")}</span>
                </div>
                <div className="border-t border-outline-variant/40 pt-2 flex justify-between font-bold text-title-sm text-primary">
                  <span>Net Payable Today</span>
                  <span>₹{proratedPayable.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl text-body-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-blue-700 shrink-0">verified_user</span>
                <span>
                  Completing this payment upgrades your plan to {chosenPlanMeta.fullName} immediately for your remaining duration.
                </span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-outline-variant font-semibold text-label-md hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handlePay(false, "razorpay_gateway")}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-label-md shadow-xs hover:bg-inverse-surface transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? "Processing..." : `Pay ₹${proratedPayable.toLocaleString("en-IN")}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
