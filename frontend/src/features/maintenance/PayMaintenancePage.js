import { useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCycleUnitDetail, createRazorpayOrder, verifyRazorpayPayment, extractApiError, formatAmount, formatDate, periodLabel } from "../../lib/maintenance";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PayMaintenancePage() {
  const { unitId } = useParams();
  const [searchParams] = useSearchParams();
  const cycleId = searchParams.get("cycle");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [feeInfo, setFeeInfo] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState(1);

  const detailQuery = useQuery({
    queryKey: ["maintenance", "unit-detail", cycleId, unitId],
    queryFn: async () => (await getCycleUnitDetail(cycleId, unitId)).data.data,
    enabled: Boolean(cycleId && unitId),
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await createRazorpayOrder(cycleId, unitId, selectedMonths);
      return res.data.data;
    },
    onSuccess: async (order) => {
      setFeeInfo(order);
      setError("");
      // If mock order (no real keys), simulate success directly
      if (order.isMock) {
        // Mock: directly verify with fake payment id
        const fakePaymentId = `pay_mock_${Date.now()}`;
        const fakeSignature = `sig_mock_${Date.now()}`;
        try {
          await verifyRazorpayPayment(cycleId, unitId, {
            razorpayOrderId: order.id,
            razorpayPaymentId: fakePaymentId,
            razorpaySignature: fakeSignature,
            months: selectedMonths,
          });
          setSuccess(`Payment successful (mock) — ₹${order.total} for ${selectedMonths} month${selectedMonths>1?"s":""} (₹${order.baseAmount} + ₹${order.fee} fee). Receipt generated.`);
          queryClient.invalidateQueries({ queryKey: ["maintenance"] });
          setTimeout(() => navigate(`/maintenance/${unitId}?cycle=${cycleId}`), 1500);
        } catch (e) {
          setError(extractApiError(e, "Mock verification failed."));
        }
        return;
      }

      // Real Razorpay checkout
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError("Failed to load Razorpay. Check internet.");
        return;
      }
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "ResidentOne",
        description: `Maintenance ${order.receipt}`,
        order_id: order.id,
        // Show all enabled methods - UPI visibility depends on Razorpay dashboard Test Mode settings
        // If UPI still hidden, enable it in dashboard: Settings -> Payment Methods -> UPI ON (Test Mode)
        config: {
          display: {
            preferences: { show_default_blocks: true },
          },
        },
        handler: async function (response) {
          try {
            await verifyRazorpayPayment(cycleId, unitId, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              months: selectedMonths,
            });
            setSuccess(`Payment successful — ₹${order.total} for ${selectedMonths} month${selectedMonths>1?"s":""} paid. Receipt generated.`);
            queryClient.invalidateQueries({ queryKey: ["maintenance"] });
            setTimeout(() => navigate(`/maintenance/${unitId}?cycle=${cycleId}`), 1500);
          } catch (e) {
            setError(extractApiError(e, "Verification failed. Contact support with payment ID: " + response.razorpay_payment_id));
          }
        },
        prefill: { name: "Resident", email: "", contact: "" },
        theme: { color: "#0e4a5a" },
        modal: { ondismiss: () => setError("Payment cancelled.") },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    },
    onError: (err) => setError(extractApiError(err, "Failed to create order.")),
  });

  if (!cycleId) return <div className="p-10 text-center">Missing cycle. Go back.</div>;
  if (detailQuery.isLoading) return <div className="p-10 text-center">Loading...</div>;
  if (detailQuery.isError) return <div className="p-6 text-center text-error">{extractApiError(detailQuery.error, "Load failed")}</div>;

  const r = detailQuery.data;
  const isPaid = ["paid", "late_paid"].includes(r.status);
  const basePerMonth = r.amount || r.dueAmount || r.cycle.amount;
  const roleLabel = r.isOwner ? "Owner" : r.isTenant ? "Renter" : r.houseRole === "owner" ? "Owner" : "Renter";
  const totalBase = basePerMonth * selectedMonths;
  const mockFee = Math.ceil(totalBase * 0.02 * 1.18);
  const total = totalBase + mockFee;
  const base = basePerMonth;

  return (
    <div className="mx-auto max-w-xl space-y-5 sm:space-y-6">
      <Link to={`/maintenance/${unitId}?cycle=${cycleId}`} className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back
      </Link>
      <h1 className="page-title">Pay Maintenance</h1>
      <p className="page-subtitle">House {r.label} · {roleLabel} · {periodLabel(r.cycle.month, r.cycle.year, r.cycle.durationMonths)} · {formatAmount(base)} due</p>

      {r.status === "overdue" && r.cycle.lateCharge > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-body-sm font-semibold text-red-800">
          <span className="material-symbols-outlined text-[20px] text-red-600 shrink-0">error</span>
          <div>
            <p>Late Charge Applied</p>
            <p className="mt-0.5 font-normal text-red-700">
              An overdue charge of {formatAmount(r.cycle.lateCharge)} has been added as the payment deadline ({formatDate(r.cycle.dueDate)}) has passed.
            </p>
          </div>
        </div>
      )}

      {isPaid ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <span className="material-symbols-outlined text-[36px] text-emerald-600">check_circle</span>
          <p className="mt-2 text-body-md font-semibold text-emerald-800">Already paid — {formatAmount(r.totalAmount || base)} via {r.method}</p>
          <p className="text-label-sm text-emerald-700">Receipt: {r.receiptNo}</p>
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <h3 className="text-body-md font-semibold text-on-surface">Pay for how many months?</h3>
            <p className="mt-1 text-label-sm text-on-surface-variant">Pay 4 or 6 months at once as advance — future months auto-marked paid</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1,4,6,12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonths(m)}
                  className={`rounded-full border px-4 py-2 text-label-md font-medium transition-colors ${selectedMonths===m ? "bg-primary text-on-primary border-primary" : "bg-white text-on-surface border-outline-variant hover:border-primary"}`}
                >
                  {m === 1 ? "1 Month" : `${m} Months`}
                  {m>1 && <span className="ml-1 text-label-sm opacity-80">· {formatAmount(basePerMonth * m)}</span>}
                </button>
              ))}
            </div>
            {selectedMonths > 1 && (
              <div className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-label-sm text-primary">
                Advance: {formatAmount(totalBase)} for {selectedMonths} months ({periodLabel(r.cycle.month, r.cycle.year, selectedMonths)}) — next {selectedMonths-1} cycles auto-marked paid after this payment
              </div>
            )}
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <h3 className="text-body-md font-semibold text-on-surface">Choose how to pay</h3>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border-2 border-primary bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">payments</span>
                  <p className="text-body-md font-semibold text-on-surface">Pay Online (Razorpay)</p>
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-label-sm text-on-primary">Recommended</span>
                </div>
                <div className="mt-3 space-y-1 rounded-lg bg-white p-3 text-body-sm">
                  <div className="flex justify-between"><span className="text-on-surface-variant">Maintenance ({roleLabel} × {selectedMonths} month{selectedMonths>1?"s":""})</span><span className="font-semibold text-on-surface">{formatAmount(totalBase)}</span></div>
                  <div className="flex justify-between"><span className="text-on-surface-variant">Gateway fee (2% + GST)</span><span className="font-semibold text-on-surface">+{formatAmount(feeInfo ? feeInfo.fee : mockFee)}</span></div>
                  <div className="flex justify-between border-t border-outline-variant pt-2 font-bold"><span>Total you pay</span><span className="text-primary">{formatAmount(feeInfo ? feeInfo.total : total)}</span></div>
                </div>
                <p className="mt-2 text-label-sm text-on-surface-variant">Society gets full {formatAmount(totalBase)} ({roleLabel} rate{selectedMonths>1 ? ` × ${selectedMonths}` : ""}) — Razorpay keeps fee. Instant receipt.</p>
                <button
                  type="button"
                  onClick={() => createOrderMutation.mutate()}
                  disabled={createOrderMutation.isPending}
                  className="mt-3 w-full rounded-full bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
                >
                  {createOrderMutation.isPending ? "Creating order..." : `Pay ${formatAmount(feeInfo ? feeInfo.total : total)} Online`}
                </button>
                {feeInfo?.isMock && <p className="mt-2 text-center text-label-sm text-amber-700">Mock mode — no real Razorpay keys. Will simulate success for testing cash flow.</p>}
              </div>

              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant">payments</span>
                  <p className="text-body-md font-semibold text-on-surface">Pay Cash at Office</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-label-sm text-emerald-800">No fee</span>
                </div>
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  Pay <span className="font-semibold text-on-surface">{formatAmount(totalBase)} only</span> cash at society office for {selectedMonths} month{selectedMonths>1?"s":""}. No extra fee. Admin will mark as <span className="font-semibold">Cash</span> and give receipt. Takes 1-2 hours.
                </p>
                <div className="mt-3 rounded-lg bg-amber-50 p-3 text-label-sm text-amber-800">
                  <span className="font-semibold">Save {formatAmount(mockFee)}</span> by paying cash — but need to visit office.
                </div>
                <Link to={`/maintenance/${unitId}?cycle=${cycleId}`} className="mt-3 block rounded-full border border-outline-variant bg-surface-container-lowest py-2 text-center text-label-md text-on-surface no-underline hover:border-primary hover:text-primary">
                  I will pay cash at office
                </Link>
              </div>
            </div>

            {error && <p className="mt-4 rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">{error}</p>}
            {success && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-label-md text-emerald-800">{success}</p>}
            <p className="mt-3 text-center text-label-sm text-outline">Due by {formatDate(r.cycle.dueDate)} · Razorpay = online convenience, Cash = save fee</p>
          </section>
        </>
      )}
    </div>
  );
}
