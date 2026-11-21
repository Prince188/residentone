import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import api from "../../lib/api";
import {
  paySocietySubscription,
  createSubscriptionOrder,
  extractApiError,
} from "../../lib/societies";
import { openCashfreeCheckout } from "../../lib/cashfree";

export const BILLING_DURATIONS = [
  {
    id: "semi_annual",
    name: "6 Months",
    subTitle: "Semi-Annual access",
    months: 6,
    basePrice: 2100,
    perMonthRate: 350,
    badge: null,
  },
  {
    id: "yearly",
    name: "12 Months (Annual)",
    subTitle: "Full year uninterrupted",
    months: 12,
    basePrice: 4000,
    perMonthRate: 333,
    badge: "SAVE ₹200",
    popular: true,
  },
];

export const INCLUDED_FEATURES = [
  "Full Society Management & Admin Portal",
  "Gatekeeper & Instant Visitor Passes",
  "Automated Maintenance Invoicing & Ledger",
  "Cashfree UPI, Card & Netbanking Collection",
  "Complaints & Ticketing Helpdesk",
  "Amenity Booking & Notice Broadcasts",
  "Multi-Wing Directory & Role Permissions",
  "Emergency SOS & Guard Patrol Logging",
];

export const AVAILABLE_PLANS = [
  {
    id: "standard",
    tier: 1,
    name: "All-in-One",
    fullName: "ResidentOne All-in-One Suite",
    rate: 2,
    features: INCLUDED_FEATURES,
  },
];

export function calculateSubscriptionAmount(unitsCount = 1, billingCycle = "yearly") {
  const units = Math.max(1, Number(unitsCount) || 1);
  const isSemiAnnual = ["semi_annual", "half_yearly", "6months"].includes(billingCycle);
  const months = isSemiAnnual ? 6 : 12;
  const basePrice = isSemiAnnual ? 2100 : 4000;
  const baseUnitsIncluded = 200;
  const extraUnits = Math.max(0, units - baseUnitsIncluded);
  const overageRatePerUnitMonth = 2;
  const overageAmount = extraUnits * overageRatePerUnitMonth * months;
  const totalBase = basePrice + overageAmount;

  return {
    isSemiAnnual,
    months,
    basePrice,
    baseUnitsIncluded,
    units,
    extraUnits,
    overageRatePerUnitMonth,
    overageAmount,
    totalBase,
    monthlyRateEffective: Math.round(totalBase / months),
  };
}

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
    const isSemiAnnual = ["semi_annual", "half_yearly", "6months"].includes(society.subscriptionBilling);
    const months = isSemiAnnual ? 6 : 12;
    renewalDate = new Date(started);
    renewalDate.setMonth(renewalDate.getMonth() + months);
  }

  const now = new Date();
  const diffMs = renewalDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysRemaining <= 15 && daysRemaining >= 0;
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
  const [selectedCycle, setSelectedCycle] = useState("yearly");
  const [showPayModal, setShowPayModal] = useState(false);
  const [editingUnits, setEditingUnits] = useState(false);
  const [tempUnits, setTempUnits] = useState(1);
  const [unitSaveLoading, setUnitSaveLoading] = useState(false);
  const [unitSaveError, setUnitSaveError] = useState("");

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    if (activeSociety?.subscriptionBilling) {
      const cycle = ["semi_annual", "half_yearly", "6months"].includes(activeSociety.subscriptionBilling)
        ? "semi_annual"
        : "yearly";
      setSelectedCycle(cycle);
    }
    if (activeSociety?.totalUnits) {
      setTempUnits(activeSociety.totalUnits);
    }
  }, [activeSociety?.id, activeSociety?.subscriptionBilling, activeSociety?.totalUnits]);

  useEffect(() => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setCouponError("");
    }
  }, [selectedCycle]);

  if (!isAdmin || !activeSociety) {
    return null;
  }

  const units = Math.max(1, Number(activeSociety.totalUnits) || 1);
  const isPaid = Boolean(activeSociety.isSubscriptionPaid);
  const renewalMeta = getSubscriptionRenewalMeta(activeSociety);

  // If already paid and active with more than 15 days, don't show intrusive banner
  if (isPaid && !renewalMeta.isExpiringSoon && !renewalMeta.isExpired) {
    return null;
  }

  const calc = calculateSubscriptionAmount(units, selectedCycle);
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount || 0 : 0;
  const totalAmount = Math.max(0, calc.totalBase - couponDiscount);

  const handleApplyCoupon = async () => {
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await api.post("/coupons/validate", {
        code: cleanCode,
        orderAmount: calc.totalBase,
        societyId: activeSociety.id,
      });
      if (res.data?.success && res.data?.data) {
        setAppliedCoupon(res.data.data);
        setCouponError("");
      } else {
        setCouponError(res.data?.message || "Invalid coupon code");
      }
    } catch (err) {
      setCouponError(extractApiError(err, "Invalid or expired coupon code"));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  const handleSaveUnits = async () => {
    const val = parseInt(tempUnits, 10);
    if (!val || val < 1) {
      setUnitSaveError("Please enter a valid unit count (min 1).");
      return;
    }
    setUnitSaveLoading(true);
    setUnitSaveError("");
    try {
      await api.patch("/societies/me", { totalUnits: val });
      await loadMySocieties();
      queryClient.invalidateQueries();
      setEditingUnits(false);
    } catch (err) {
      setUnitSaveError(extractApiError(err, "Failed to update total units"));
    } finally {
      setUnitSaveLoading(false);
    }
  };

  const handlePay = async (paymentMethod = "upi") => {
    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");

      const isDemo = paymentMethod === "demo_upi";
      const couponCode = appliedCoupon
        ? appliedCoupon.coupon?.code || appliedCoupon.code || couponInput.trim().toUpperCase()
        : undefined;

      // 1. Instant Demo Simulation: Fast activation for testing without gateway
      if (isDemo) {
        const res = await paySocietySubscription(activeSociety.id, {
          plan: "standard",
          billingCycle: selectedCycle,
          isDemoSimulation: true,
          paymentMethod: "demo_upi",
          couponCode,
        });

        const updatedSociety = res.data?.data?.society || res.data?.society;
        if (updateActiveSocietySubscription) {
          updateActiveSocietySubscription({
            isSubscriptionPaid: true,
            subscriptionPlan: "standard",
            subscriptionBilling: updatedSociety?.subscriptionBilling || selectedCycle,
            subscriptionExpiresAt: updatedSociety?.subscriptionExpiresAt,
          });
        }

        setSuccessMsg(
          `Demo Simulation: Subscription ${isPaid ? "renewed" : "activated"} on ResidentOne All-in-One (${calc.months} months).`
        );
        setShowPayModal(false);

        await loadMySocieties();
        queryClient.invalidateQueries();
        setLoading(false);
        return;
      }

      // 2. Real Payment via Cashfree Gateway (UPI, Card, Netbanking)
      const orderRes = await createSubscriptionOrder(activeSociety.id, {
        plan: "standard",
        billingCycle: selectedCycle,
        units,
        couponCode,
      });

      const order = orderRes.data?.data || orderRes.data;
      if (!order?.paymentSessionId) {
        throw new Error("Failed to generate Cashfree payment session");
      }

      await openCashfreeCheckout({
        paymentSessionId: order.paymentSessionId,
        mode: order.env || "sandbox",
        onSuccess: async () => {
          try {
            setLoading(true);
            const res = await paySocietySubscription(activeSociety.id, {
              plan: "standard",
              billingCycle: selectedCycle,
              isDemoSimulation: false,
              paymentMethod,
              orderId: order.orderId || order.id,
              cfOrderId: order.cfOrderId,
              transactionId: order.orderId || order.id,
              couponCode,
            });

            const updatedSociety = res.data?.data?.society;

            if (updateActiveSocietySubscription) {
              updateActiveSocietySubscription({
                isSubscriptionPaid: true,
                subscriptionPlan: "standard",
                subscriptionBilling: updatedSociety?.subscriptionBilling || selectedCycle,
                subscriptionExpiresAt: updatedSociety?.subscriptionExpiresAt,
              });
            }

            setSuccessMsg(
              `Payment successful! Subscription ${isPaid ? "renewed" : "activated"} on ResidentOne All-in-One (${calc.months} months).`
            );
            setShowPayModal(false);

            await loadMySocieties();
            queryClient.invalidateQueries();
          } catch (verifyErr) {
            setError(extractApiError(verifyErr, "Payment was cancelled or could not be verified by Cashfree."));
          } finally {
            setLoading(false);
          }
        },
        onFailure: (err) => {
          setError(err?.message || "Payment window closed or cancelled.");
          setLoading(false);
        },
      });
    } catch (err) {
      setError(extractApiError(err, "Payment failed. Please try again."));
      setLoading(false);
    }
  };

  return (
    <>
      {/* Dashboard Warning / Action Banner */}
      <div
        className={`rounded-2xl border-2 p-5 sm:p-6 shadow-sm transition-all ${
          isPaid
            ? renewalMeta.isExpired
              ? "border-red-500/50 bg-gradient-to-r from-red-500/10 via-surface-container-lowest to-surface-container-lowest"
              : "border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-surface-container-lowest to-surface-container-lowest"
            : "border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-surface-container-lowest to-surface-container-lowest"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${
                isPaid && renewalMeta.isExpired ? "bg-red-600" : "bg-amber-600"
              }`}
            >
              <span className="material-symbols-outlined text-[26px]">
                {isPaid && renewalMeta.isExpired ? "error" : "lock_open"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-body-lg font-black text-on-surface">
                  {isPaid
                    ? renewalMeta.isExpired
                      ? "Society Subscription Expired"
                      : `Renewal Due: ${renewalMeta.daysRemaining} Days Left`
                    : "Subscription Payment Required"}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    isPaid && renewalMeta.isExpired
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {isPaid ? (renewalMeta.isExpired ? "EXPIRED" : "EXPIRING SOON") : "ACTION REQUIRED"}
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
                {isPaid
                  ? `Your society subscription expires on ${renewalMeta.formattedDate}. Renew now to keep all administrative tools, maintenance billing, and gatekeeper passes active.`
                  : `Complete your society subscription payment to unlock full management privileges, automated maintenance invoices, visitor logs, and resident directories.`}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-label-sm font-semibold text-on-surface-variant">
                <span className="text-on-surface font-bold">ResidentOne All-in-One</span>
                <span>·</span>
                <span>{units} Units ({units <= 200 ? "within 200 base" : `${units - 200} extra @ ₹2/mo`})</span>
                <span>·</span>
                <span className="text-primary font-bold">₹{totalAmount.toLocaleString("en-IN")} / {calc.months} mos</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowPayModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-label-md font-bold text-white shadow-sm hover:bg-inverse-surface transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">credit_card</span>
              <span>{isPaid ? "Renew Plan" : `Pay ₹${totalAmount.toLocaleString("en-IN")} & Activate`}</span>
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-body-sm font-semibold text-emerald-800">
            {successMsg}
          </div>
        )}
      </div>

      {/* Payment & Duration Selection Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div>
                <h3 className="text-headline-sm font-black text-on-surface">
                  {isPaid ? "Renew Society Subscription" : "Activate Society Subscription"}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-label-sm text-on-surface-variant font-medium">
                    {activeSociety.name} · {units} Units Total
                  </span>
                  {!editingUnits && (
                    <button
                      type="button"
                      onClick={() => setEditingUnits(true)}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      (Edit Units)
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                disabled={loading}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {editingUnits && (
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-2">
                <span className="text-[11px] font-bold text-on-surface">Change Total Units (Pre-Payment):</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={tempUnits}
                    onChange={(e) => setTempUnits(e.target.value)}
                    className="w-28 rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-body-sm font-bold text-on-surface focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveUnits}
                    disabled={unitSaveLoading}
                    className="rounded-lg bg-primary px-3 py-1.5 text-label-sm font-bold text-white hover:bg-inverse-surface cursor-pointer disabled:opacity-50"
                  >
                    {unitSaveLoading ? "..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUnits(false)}
                    className="rounded-lg bg-surface-container-high px-3 py-1.5 text-label-sm font-semibold text-on-surface cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                {unitSaveError && <p className="text-[11px] font-semibold text-red-600">{unitSaveError}</p>}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-body-sm font-semibold text-red-800">
                {error}
              </div>
            )}

            {/* 1. Duration Options */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                1. Select Billing Duration
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BILLING_DURATIONS.map((d) => {
                  const isSel = selectedCycle === d.id;
                  const durCalc = calculateSubscriptionAmount(units, d.id);
                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedCycle(d.id)}
                      className={`relative rounded-2xl p-4 cursor-pointer border-2 transition-all flex flex-col justify-between ${
                        isSel
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-outline-variant/60 bg-surface-container-low hover:border-outline"
                      }`}
                    >
                      {d.badge && (
                        <span className="absolute -top-2.5 right-3 bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                          {d.badge}
                        </span>
                      )}
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`font-bold text-body-sm ${isSel ? "text-primary" : "text-on-surface"}`}>
                            {d.name}
                          </span>
                          <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${isSel ? "border-primary" : "border-outline"}`}>
                            {isSel && <span className="h-2 w-2 rounded-full bg-primary" />}
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className={`text-title-lg font-black ${isSel ? "text-primary" : "text-on-surface"}`}>
                            ₹{durCalc.totalBase.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">/ {d.months} mos</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1">₹{d.perMonthRate}/mo base up to 200 units</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Included Features & Unit Allowance */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-body-sm text-primary">ResidentOne All-in-One Suite</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                  All Features Unlocked
                </span>
              </div>
              <p className="text-[12px] text-on-surface-variant">
                {calc.extraUnits > 0 ? (
                  <><strong>{units} Units:</strong> 200 units included base + {calc.extraUnits} extra units @ ₹2/unit/mo (+₹{calc.overageAmount.toLocaleString("en-IN")})</>
                ) : (
                  <><strong>{units} Units:</strong> Fully covered under standard flat allowance (up to 200 units included).</>
                )}
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-primary/10">
                {INCLUDED_FEATURES.slice(0, 6).map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-[14px]">check_circle</span>
                    <span className="truncate">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Coupon Code */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                2. Coupon Code (Optional)
              </span>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-700 text-[18px]">local_offer</span>
                    <span className="text-body-sm font-bold text-emerald-800">
                      {appliedCoupon.coupon?.code || couponInput.toUpperCase()}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      (-₹{appliedCoupon.discountAmount} applied)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-[11px] font-bold text-red-700 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter Coupon Code"
                    className="flex-1 rounded-xl border border-outline-variant bg-white px-3.5 py-2 text-body-sm font-bold uppercase tracking-wider text-on-surface focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="rounded-xl bg-primary px-4 py-2 text-label-sm font-bold text-white hover:bg-inverse-surface disabled:opacity-50 cursor-pointer"
                  >
                    {couponLoading ? "..." : "Apply"}
                  </button>
                </div>
              )}
              {couponError && <p className="text-[11px] font-semibold text-red-600">{couponError}</p>}
            </div>

            {/* 4. Order Summary & Payment CTAs */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 space-y-3">
              <div className="flex justify-between text-body-sm">
                <span className="text-on-surface-variant">Base Plan ({calc.months} mos · up to 200 units)</span>
                <span className="font-bold text-on-surface">₹{calc.basePrice.toLocaleString("en-IN")}</span>
              </div>
              {calc.extraUnits > 0 && (
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Extra Units ({calc.extraUnits} units × ₹2 × {calc.months}m)</span>
                  <span className="font-bold text-on-surface">+₹{calc.overageAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              {appliedCoupon && couponDiscount > 0 && (
                <div className="flex justify-between text-body-sm text-emerald-700 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-₹{couponDiscount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="border-t border-outline-variant/60 pt-2.5 flex justify-between items-baseline">
                <span className="text-body-md font-bold text-on-surface">Total Payable</span>
                <span className="text-title-lg font-black text-primary">₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* CTAs: Cashfree and Demo Simulation */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handlePay("upi")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-label-md font-bold text-white shadow-sm hover:bg-inverse-surface disabled:opacity-50 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">lock</span>
                <span>
                  {loading ? "Processing..." : `Pay ₹${totalAmount.toLocaleString("en-IN")} via Cashfree (UPI / Cards)`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handlePay("demo_upi")}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low py-2.5 text-label-sm font-bold text-on-surface hover:bg-surface-container-high disabled:opacity-50 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>Instant Demo Activation (Test Simulation)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
