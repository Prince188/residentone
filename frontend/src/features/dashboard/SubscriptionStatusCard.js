import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import {
  paySocietySubscription,
  SUBSCRIPTION_PLAN_LABELS,
  extractApiError,
} from "../../lib/societies";

export const AVAILABLE_PLANS = [
  {
    id: "starter",
    tier: 1,
    name: "Basic",
    fullName: "Basic (Starter)",
    rate: 6,
    badge: "Cost Effective",
    features: [
      "Gatekeeper & visitor passes",
      "Resident & flat directory",
      "Complaints & ticketing helpdesk",
      "Notice board & broadcasts",
    ],
  },
  {
    id: "professional",
    tier: 2,
    name: "Standard",
    fullName: "Standard (Professional)",
    rate: 10,
    popular: true,
    badge: "Most Popular",
    features: [
      "All Basic features included",
      "Automated maintenance billing & dues",
      "Online UPI & card payment collection",
      "Amenity booking & clubhouse access",
      "Resident opinion polls & voting",
    ],
  },
  {
    id: "enterprise",
    tier: 3,
    name: "Premium",
    fullName: "Premium (Enterprise)",
    rate: 15,
    badge: "Full Automation",
    features: [
      "All Standard features included",
      "Multi-wing hierarchies & wing admins",
      "Granular role & permission matrix",
      "Emergency broadcast & SOS logging",
      "Priority SLA platform support",
    ],
  },
];

export function getSubscriptionRenewalMeta(society) {
  if (!society) {
    return {
      renewalDate: new Date(),
      daysRemaining: 30,
      isExpiringSoon: false,
      isExpired: false,
      formattedDate: "",
    };
  }

  let renewalDate;
  if (society.subscriptionExpiresAt) {
    renewalDate = new Date(society.subscriptionExpiresAt);
  } else {
    const started = society.subscriptionStartedAt
      ? new Date(society.subscriptionStartedAt)
      : new Date(society.createdAt || Date.now());
    const isYearly = society.subscriptionBilling === "yearly";
    renewalDate = new Date(started);
    if (isYearly) {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }
  }

  const now = new Date();
  const diffMs = renewalDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining >= 0;
  const isExpired = daysRemaining < 0;

  return {
    renewalDate,
    daysRemaining,
    isExpiringSoon,
    isExpired,
    formattedDate: renewalDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
}

export default function SubscriptionStatusCard({ isAdmin = false }) {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const loadMySocieties = useSocietyStore((state) => state.loadMySocieties);
  const updateActiveSocietySubscription = useSocietyStore(
    (state) => state.updateActiveSocietySubscription
  );
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(
    activeSociety?.subscriptionPlan || "starter"
  );
  const [selectedCycle, setSelectedCycle] = useState(
    activeSociety?.subscriptionBilling || "monthly"
  );
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRenewalSelector, setShowRenewalSelector] = useState(false);

  useEffect(() => {
    if (activeSociety?.subscriptionPlan) {
      setSelectedPlan(activeSociety.subscriptionPlan);
    }
    if (activeSociety?.subscriptionBilling) {
      setSelectedCycle(activeSociety.subscriptionBilling);
    }
  }, [activeSociety?.id, activeSociety?.subscriptionPlan, activeSociety?.subscriptionBilling]);

  if (!isAdmin || !activeSociety) {
    return null;
  }

  const registeredPlanId = activeSociety.subscriptionPlan || "starter";
  const registeredPlanMeta =
    AVAILABLE_PLANS.find((p) => p.id === registeredPlanId) || AVAILABLE_PLANS[0];

  const chosenPlanMeta =
    AVAILABLE_PLANS.find((p) => p.id === selectedPlan) || AVAILABLE_PLANS[0];

  const rate = chosenPlanMeta.rate || 6;
  const units = Number(activeSociety.totalUnits) || 1;
  const multiplier = selectedCycle === "yearly" ? 12 : 1;
  const totalAmount = units * rate * multiplier;
  const isPaid = Boolean(activeSociety.isSubscriptionPaid);

  const isUpgrade = chosenPlanMeta.tier > registeredPlanMeta.tier;
  const isDowngrade = chosenPlanMeta.tier < registeredPlanMeta.tier;

  const renewalMeta = getSubscriptionRenewalMeta(activeSociety);
  const paidPlanName = SUBSCRIPTION_PLAN_LABELS[activeSociety.subscriptionPlan] || "Basic";

  const handlePay = async (isDemo = false, paymentMethod = "demo_upi") => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await paySocietySubscription(activeSociety.id, {
        plan: selectedPlan,
        billingCycle: selectedCycle,
        isDemoSimulation: isDemo,
        paymentMethod,
      });

      const updatedSociety = res.data?.data?.society;
      if (updateActiveSocietySubscription) {
        updateActiveSocietySubscription({
          isSubscriptionPaid: true,
          subscriptionPlan: updatedSociety?.subscriptionPlan || selectedPlan,
          subscriptionBilling: updatedSociety?.subscriptionBilling || selectedCycle,
          subscriptionExpiresAt: updatedSociety?.subscriptionExpiresAt,
        });
      }

      setSuccessMsg(
        isDemo
          ? `Payment successful! Subscription ${isPaid ? "renewed" : "activated"} on the ${chosenPlanMeta.fullName} plan.`
          : `Payment successful! Subscription ${isPaid ? "renewed" : "activated"} on the ${chosenPlanMeta.fullName} plan.`
      );
      setShowPayModal(false);
      setShowRenewalSelector(false);

      await loadMySocieties();
      queryClient.invalidateQueries();
    } catch (err) {
      setError(extractApiError(err, "Payment failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const renderPlanSelectorAndActions = (isRenewalFlow = false) => (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-label-md font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
              {isRenewalFlow
                ? "Choose Plan for Renewal (Upgrade or Degrade Available)"
                : "Select or Change Plan (Upgrade / Degrade)"}
            </h4>
            <p className="text-[12px] text-on-surface-variant">
              {isRenewalFlow ? (
                <>Current plan: <strong>{paidPlanName}</strong> (expires <strong>{renewalMeta.formattedDate}</strong>). Advance payments add time cumulatively to your existing expiry date.</>
              ) : (
                <>Originally registered on <strong>{registeredPlanMeta.name}</strong>. Choose any plan that suits your community.</>
              )}
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/50 p-1 rounded-xl">
            <span className="text-[11px] font-bold text-outline uppercase px-1">Billing:</span>
            <button
              type="button"
              onClick={() => setSelectedCycle("monthly")}
              className={`px-3 py-1 rounded-lg text-label-sm font-bold transition-all cursor-pointer ${
                selectedCycle === "monthly"
                  ? "bg-white text-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycle("yearly")}
              className={`px-3 py-1 rounded-lg text-label-sm font-bold transition-all cursor-pointer ${
                selectedCycle === "yearly"
                  ? "bg-white text-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Yearly (12 Mo)
            </button>
          </div>
        </div>

        {/* 3 Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {AVAILABLE_PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isCurrentPlan = registeredPlanId === plan.id;
            const isPlanUpgrade = plan.tier > registeredPlanMeta.tier;
            const isPlanDowngrade = plan.tier < registeredPlanMeta.tier;
            const monthlyPlanCost = units * plan.rate;
            const cyclePlanCost = monthlyPlanCost * multiplier;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative rounded-2xl p-4 cursor-pointer border-2 transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                    : "border-outline-variant/60 bg-surface-container-lowest hover:border-outline hover:bg-surface-container-low"
                }`}
              >
                {/* Popular or Status Tag */}
                <div className="flex items-center justify-between gap-1.5 pb-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name={`subscriptionPlanChoice_${isRenewalFlow ? "renewal" : "new"}`}
                      checked={isSelected}
                      onChange={() => setSelectedPlan(plan.id)}
                      className="accent-primary h-4 w-4 cursor-pointer"
                    />
                    <span className="font-extrabold text-title-sm text-on-surface">
                      {plan.name}
                    </span>
                  </div>

                  {/* Tier Change Indicator */}
                  {isPlanUpgrade && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase">
                      <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                      Upgrade
                    </span>
                  )}
                  {isPlanDowngrade && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-black uppercase">
                      <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                      Degrade
                    </span>
                  )}
                  {isCurrentPlan && !isPlanUpgrade && !isPlanDowngrade && (
                    <span className="inline-flex items-center rounded-full bg-surface-container text-on-surface-variant border border-outline-variant px-2 py-0.5 text-[10px] font-bold">
                      {isRenewalFlow ? "Current Plan" : "Registered"}
                    </span>
                  )}
                </div>

                {/* Rate & Units Calculation */}
                <div className="mt-1 py-2 border-y border-outline-variant/30">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[26px] font-black text-on-surface leading-none">
                        ₹{plan.rate}
                      </span>
                      <span className="text-[11px] font-semibold text-on-surface-variant">
                        / unit / mo
                      </span>
                    </div>
                    <span className="text-[12px] font-bold text-primary">
                      ₹{monthlyPlanCost.toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    Total for {units} unit{units > 1 ? "s" : ""}: ₹{cyclePlanCost.toLocaleString("en-IN")} / {selectedCycle === "yearly" ? "year" : "month"}
                  </p>
                </div>

                {/* Features List */}
                <ul className="mt-3 space-y-1.5 text-[11px] text-on-surface-variant grow">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-emerald-600 font-bold shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Bottom Selection Button / Indicator */}
                <div className="mt-3.5 pt-2 border-t border-outline-variant/30 text-center">
                  {isSelected ? (
                    <span className="inline-flex items-center justify-center gap-1 w-full py-1 rounded-lg bg-primary text-on-primary text-[11px] font-bold shadow-xs">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      Selected Plan
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-full py-1 rounded-lg bg-surface-container text-on-surface-variant text-[11px] font-semibold hover:bg-surface-container-high transition-colors">
                      {isPlanUpgrade ? "Select to Upgrade" : isPlanDowngrade ? "Select to Degrade" : "Select Plan"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Box & Checkout Actions */}
      <div className="rounded-2xl bg-surface-container border border-outline-variant/60 p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
              {isRenewalFlow ? "Renewal Summary:" : "Checkout Summary:"}
            </span>
            <span className="font-extrabold text-on-surface text-body-md">
              {chosenPlanMeta.fullName}
            </span>
            {isUpgrade && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Upgraded from {registeredPlanMeta.name}
              </span>
            )}
            {isDowngrade && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Degraded from {registeredPlanMeta.name}
              </span>
            )}
          </div>
          <p className="text-body-xs text-on-surface-variant mt-1">
            {units} Units × ₹{rate}/unit/mo · {selectedCycle === "yearly" ? "12 Months (Yearly)" : "1 Month (Monthly)"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="text-left sm:text-right pr-2">
            <span className="text-[11px] font-bold uppercase text-outline block">
              Total Due Now
            </span>
            <span className="text-[28px] font-black text-primary leading-none">
              ₹{totalAmount.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePay(true, "instant_simulation")}
              disabled={loading}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-label-md shadow-xs hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>{isRenewalFlow ? "Quick Pay & Renew" : "Quick Pay & Unlock"}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowPayModal(true)}
              disabled={loading}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-primary text-on-primary px-4 py-2.5 rounded-xl font-bold text-label-md shadow-xs hover:bg-inverse-surface transition-all disabled:opacity-60 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">credit_card</span>
              <span>Pay Online</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Flow A: Paid Subscription
  if (isPaid) {
    const isWarning = renewalMeta.isExpiringSoon || renewalMeta.isExpired;

    return (
      <div className="space-y-4">
        {/* Warning Line (shown when plan is about to end before 7 days of end, or expired) */}
        {isWarning && (
          <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-amber-50 to-surface-container-lowest p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-xs ${
                  renewalMeta.daysRemaining <= 0 ? "bg-red-600" : "bg-amber-600"
                }`}>
                  <span className="material-symbols-outlined text-[24px]">
                    {renewalMeta.daysRemaining <= 0 ? "error" : "warning"}
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-on-surface text-body-md">
                      Subscription Expiry Warning
                    </h4>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white ${
                      renewalMeta.daysRemaining <= 0 ? "bg-red-600" : "bg-amber-600"
                    }`}>
                      {renewalMeta.daysRemaining < 0
                        ? "Expired"
                        : renewalMeta.daysRemaining === 0
                        ? "Expires Today"
                        : `Expires in ${renewalMeta.daysRemaining} Day${renewalMeta.daysRemaining > 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <p className="text-body-xs text-on-surface-variant mt-0.5">
                    {renewalMeta.daysRemaining < 0 ? (
                      <>Your <strong>{paidPlanName}</strong> subscription expired on <strong>{renewalMeta.formattedDate}</strong>. Renew now to avoid feature interruptions.</>
                    ) : (
                      <>Your <strong>{paidPlanName}</strong> subscription will end on <strong>{renewalMeta.formattedDate}</strong> ({renewalMeta.daysRemaining} days remaining). Click pay below to renew or change your plan.</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowRenewalSelector((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-bold text-label-md shadow-xs transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  <span>{showRenewalSelector ? "Hide Plans" : "Pay / Renew Plan"}</span>
                </button>
              </div>
            </div>

            {/* When user clicks on Pay, show again 3 plans incase he wants to change the plan */}
            {showRenewalSelector && (
              <div className="pt-3 border-t border-amber-500/20">
                {renderPlanSelectorAndActions(true)}
              </div>
            )}
          </div>
        )}

        {/* Regular Active Subscription Card */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 shadow-xs transition-all space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-on-surface text-body-md">
                    Active Subscription: {paidPlanName} ({(activeSociety.subscriptionPlan || "starter").toUpperCase()})
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold">
                    ✓ Paid & Active
                  </span>
                </div>
                <p className="text-body-xs text-on-surface-variant mt-0.5">
                  {units} Total Units · Billed {activeSociety.subscriptionBilling || "monthly"} · Renewal: <strong>{renewalMeta.formattedDate}</strong> ({renewalMeta.daysRemaining > 0 ? `${renewalMeta.daysRemaining} days left` : "due for renewal"})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {!isWarning && (
                <button
                  type="button"
                  onClick={() => setShowRenewalSelector((prev) => !prev)}
                  className="text-label-sm text-primary hover:text-on-surface bg-primary/10 hover:bg-primary/15 border border-primary/20 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                  <span>{showRenewalSelector ? "Hide Options" : "Upgrade / Change Plan"}</span>
                </button>
              )}
              <span className="text-label-sm text-emerald-700 bg-emerald-100/70 border border-emerald-300/60 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">lock_open</span>
                All Features Unlocked
              </span>
            </div>
          </div>

          {/* Voluntary plan change/upgrade when not in warning mode */}
          {!isWarning && showRenewalSelector && (
            <div className="pt-3 border-t border-emerald-500/20">
              {renderPlanSelectorAndActions(true)}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-body-sm text-red-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-body-sm text-emerald-700 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal for checkout confirmation */}
        {showPayModal && renderCheckoutModal(true)}
      </div>
    );
  }

  // Flow B: Unpaid Subscription
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-surface-container-lowest to-surface-container-low p-4 sm:p-6 shadow-sm space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-outline-variant/40">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm mt-0.5">
            <span className="material-symbols-outlined text-[28px]">payments</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-title-md font-extrabold text-on-surface">
                Activate Subscription to Unlock Features
              </h3>
              <span className="inline-flex items-center rounded-full bg-amber-600 text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                Payment Required
              </span>
            </div>
            <p className="text-body-xs text-on-surface-variant mt-1">
              Your society has been approved by Super Admin. You can review, upgrade, or degrade your subscription plan below before making payment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-400/30 px-3 py-1.5 self-start md:self-center">
          <span className="material-symbols-outlined text-amber-700 text-[18px]">lock</span>
          <span className="text-[11px] font-bold text-amber-900">
            Features Locked Until Paid
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-body-sm text-red-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-body-sm text-emerald-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Plan Selector & Actions */}
      {renderPlanSelectorAndActions(false)}

      {/* Modal for checkout confirmation */}
      {showPayModal && renderCheckoutModal(false)}
    </div>
  );

  function renderCheckoutModal(isRenewalFlow = false) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-outline-variant space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
            <h4 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">account_balance_wallet</span>
              {isRenewalFlow ? "Subscription Renewal Checkout" : "Subscription Checkout"}
            </h4>
            <button
              type="button"
              onClick={() => setShowPayModal(false)}
              className="text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="space-y-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant/40">
            <div className="flex justify-between text-body-sm">
              <span className="text-on-surface-variant">Society</span>
              <span className="font-semibold text-on-surface">{activeSociety.name}</span>
            </div>
            <div className="flex justify-between text-body-sm">
              <span className="text-on-surface-variant">Chosen Plan</span>
              <span className="font-semibold text-on-surface">{chosenPlanMeta.fullName}</span>
            </div>
            <div className="flex justify-between text-body-sm">
              <span className="text-on-surface-variant">Tier Action</span>
              <span className="font-semibold text-on-surface">
                {isUpgrade ? "▲ Upgrade" : isDowngrade ? "▼ Degrade" : isRenewalFlow ? "Renew Current Plan" : "Original Choice"}
              </span>
            </div>
            <div className="flex justify-between text-body-sm">
              <span className="text-on-surface-variant">Units / Rate</span>
              <span className="font-semibold text-on-surface">{units} units × ₹{rate}/mo</span>
            </div>
            <div className="flex justify-between text-body-sm">
              <span className="text-on-surface-variant">Billing Cycle</span>
              <span className="font-semibold capitalize text-on-surface">{selectedCycle}</span>
            </div>
            <div className="border-t border-outline-variant/40 pt-2 flex justify-between font-bold text-title-sm text-primary">
              <span>Total Due</span>
              <span>₹{totalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 text-blue-900 rounded-xl text-body-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-blue-700">verified_user</span>
            <span>Online Payment Gateway: Completing this payment activates the {chosenPlanMeta.fullName} plan immediately.</span>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowPayModal(false)}
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
              {loading ? "Processing..." : `Pay ₹${totalAmount.toLocaleString("en-IN")}`}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

