import { useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCollectionUnitDetail,
  recordCollectionPayment,
  removeCollectionPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getCollectionReceipt,
  extractApiError,
  formatAmount,
  formatDate,
  STATUS_UI,
} from "../../lib/collections";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

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

export default function CollectionUnitPayPage() {
  const { id, unitId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [feeInfo, setFeeInfo] = useState(null);

  const permQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const isAdmin =
    hasPermission(membership?.role, "manage_collections", permQuery.data) ||
    hasPermission(membership?.role, "manage_maintenance", permQuery.data);

  const detailQuery = useQuery({
    queryKey: ["collection-unit-detail", id, unitId],
    queryFn: async () => (await getCollectionUnitDetail(id, unitId)).data.data,
    enabled: Boolean(id && unitId),
  });

  const r = detailQuery.data;
  const isPaid = r && ["paid", "late_paid"].includes(r.status);
  const base = r?.amount || r?.collection?.amount || 0;
  const mockFee = Math.ceil(base * 0.02 * 1.18);
  const total = base + mockFee;

  const handleDownloadReceipt = async () => {
    try {
      const res = await getCollectionReceipt(id, unitId);
      const data = res.data.data;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt ${data.receiptNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a; max-width: 650px; margin: 0 auto; }
            .header { border-bottom: 2px solid #134a36; padding-bottom: 16px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #134a36; font-size: 22px; }
            .header p { margin: 4px 0; color: #555; font-size: 13px; }
            .row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #eee; font-size: 14px; }
            .label { color: #666; }
            .value { font-weight: 600; }
            .total { font-size: 16px; font-weight: 800; margin-top: 14px; border-top: 2px solid #134a36; padding-top: 12px; }
            .footer { margin-top: 28px; font-size: 11px; color: #888; text-align: center; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${data.society.name}</h1>
            <p>${data.society.address}</p>
            <h2 style="margin-top:16px;font-size:18px;color:#134a36;">Collection Contribution Receipt</h2>
            <p>Receipt No: <b>${data.receiptNo}</b> | Date: ${new Date(data.payment.paidOn).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div class="row"><span class="label">Collection Fund</span><span class="value">${data.collection.title}</span></div>
          <div class="row"><span class="label">House / Flat</span><span class="value">House ${data.unit.label}${data.unit.block ? " · Block " + data.unit.block : ""}</span></div>
          <div class="row"><span class="label">Resident</span><span class="value">${data.unit.ownerName} ${data.unit.ownerPhone ? "· " + data.unit.ownerPhone : ""}</span></div>
          <div class="row"><span class="label">Due Date</span><span class="value">${new Date(data.collection.dueDate).toLocaleDateString("en-IN")}</span></div>
          <div class="row"><span class="label">Payment Method</span><span class="value">${data.payment.method}${data.payment.razorpayPaymentId ? " · " + data.payment.razorpayPaymentId : ""}</span></div>
          <div class="row"><span class="label">Collection Amount</span><span class="value">₹${Number(data.payment.amount).toLocaleString("en-IN")}</span></div>
          <div class="row"><span class="label">Gateway Fee ${data.payment.fee ? "(2% + GST)" : "(Cash - No Fee)"}</span><span class="value">₹${Number(data.payment.fee || 0).toLocaleString("en-IN")}</span></div>
          <div class="row total"><span>Total Paid</span><span>₹${Number(data.payment.totalAmount).toLocaleString("en-IN")}</span></div>
          <div class="row"><span class="label">Payment Status</span><span class="value" style="color:#0a7a42">${data.status.toUpperCase()}</span></div>
          <div class="footer">
            This is a computer-generated receipt from ResidentOne for <b>${data.collection.title}</b>.<br/>
            For questions or queries, please contact your society office.<br/>
            Thank you for your timely contribution!
          </div>
        </body>
        </html>
      `;
      const win = window.open("", "_blank");
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    } catch (e) {
      alert(extractApiError(e, "Failed to download receipt. Make sure payment is completed."));
    }
  };

  const payCashMutation = useMutation({
    mutationFn: () => recordCollectionPayment(id, unitId, { method: "Cash" }).then((r) => r.data.data),
    onSuccess: () => {
      setSuccess("Payment recorded as Cash. Receipt generated.");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["collection-unit-detail"] });
      queryClient.invalidateQueries({ queryKey: ["collection-units"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (e) => {
      setError(extractApiError(e, "Failed to record payment"));
      setSuccess("");
    },
  });

  const unpayMutation = useMutation({
    mutationFn: () => removeCollectionPayment(id, unitId).then((r) => r.data.data),
    onSuccess: () => {
      setSuccess("Payment record removed.");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["collection-unit-detail"] });
      queryClient.invalidateQueries({ queryKey: ["collection-units"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (e) => {
      setError(extractApiError(e, "Failed to remove payment"));
      setSuccess("");
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await createRazorpayOrder(id, unitId);
      return res.data.data;
    },
    onSuccess: async (order) => {
      setFeeInfo(order);
      setError("");

      if (order.isMock) {
        const fakePaymentId = `pay_col_mock_${Date.now()}`;
        const fakeSignature = `sig_col_mock_${Date.now()}`;
        try {
          await verifyRazorpayPayment(id, unitId, {
            razorpayOrderId: order.id,
            razorpayPaymentId: fakePaymentId,
            razorpaySignature: fakeSignature,
          });
          setSuccess(`Payment successful (mock) — ₹${order.total}. Receipt generated.`);
          queryClient.invalidateQueries({ queryKey: ["collection-unit-detail"] });
          queryClient.invalidateQueries({ queryKey: ["collection-units"] });
          queryClient.invalidateQueries({ queryKey: ["collections"] });
          setTimeout(() => {
            navigate(`/collections/pay?collection=${id}`);
          }, 1500);
        } catch (e) {
          setError(extractApiError(e, "Mock verification failed."));
        }
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError("Failed to load Razorpay checkout SDK. Please check your internet connection.");
        return;
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || order.keyId || "",
        amount: order.amount,
        currency: order.currency || "INR",
        name: "ResidentOne",
        description: `${r.collection?.title || "Collection"} · House ${r.label}`,
        order_id: order.id,
        config: {
          display: {
            preferences: { show_default_blocks: true },
          },
        },
        handler: async function (response) {
          try {
            await verifyRazorpayPayment(id, unitId, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setSuccess(`Payment successful — ₹${order.total} paid. Receipt generated.`);
            queryClient.invalidateQueries({ queryKey: ["collection-unit-detail"] });
            queryClient.invalidateQueries({ queryKey: ["collection-units"] });
            queryClient.invalidateQueries({ queryKey: ["collections"] });
            setTimeout(() => {
              navigate(`/collections/pay?collection=${id}`);
            }, 1500);
          } catch (e) {
            setError(
              extractApiError(
                e,
                "Verification failed. Please contact support with payment ID: " +
                  response.razorpay_payment_id
              )
            );
          }
        },
        prefill: {
          name: r.ownerName || "Resident",
          contact: r.ownerPhone || "",
        },
        theme: { color: "#134a36" },
        modal: { ondismiss: () => setError("Payment cancelled.") },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    },
    onError: (err) => setError(extractApiError(err, "Failed to initiate online payment.")),
  });

  if (detailQuery.isLoading) {
    return <div className="mx-auto max-w-xl p-10 text-center text-body-md text-on-surface-variant">Loading payment details...</div>;
  }

  if (detailQuery.isError) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center text-error">
        {extractApiError(detailQuery.error, "Failed to load collection house details.")}
      </div>
    );
  }

  if (!r) return null;

  const fromAdmin = searchParams.get("from") === "admin";
  const backTarget = fromAdmin ? `/collections/${id}` : `/collections/pay?collection=${id}`;

  return (
    <div className="mx-auto max-w-xl space-y-5 sm:space-y-6">
      {/* Back Link */}
      <Link
        to={backTarget}
        className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        <span>Back to {r.collection?.title || "Collection"}</span>
      </Link>

      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">volunteer_activism</span>
          <span>Pay Collection</span>
        </h1>
        <p className="page-subtitle">
          House {r.label} · {r.isRenterOccupied ? "Renter" : "Owner"} · {r.collection?.title} · {formatAmount(base)} due
        </p>
      </div>

      {/* Status Hero / Paid Box */}
      {isPaid ? (
        <div className="space-y-5">
          {/* Top Hero Section matching MaintenanceDetailPage */}
          <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-5 sm:p-6 text-white">
              <div className="flex items-center justify-between gap-2">
                <p className="text-label-md uppercase tracking-[0.14em] text-white/70">Payment Status</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-label-xs font-bold uppercase tracking-wider backdrop-blur-xs">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Completed
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-headline-md font-extrabold text-white tracking-tight">
                    {formatAmount(r.totalAmount || r.amount || base)}
                  </p>
                  <p className="mt-1 text-body-sm text-white/80">
                    Paid on {formatDate(r.paidOn)} via {r.method || "Online"}
                    {r.receiptNo && ` · #${r.receiptNo}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadReceipt}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-label-md font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    <span>Download Receipt</span>
                  </button>
                  <Link
                    to={backTarget}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-label-md font-semibold text-white hover:bg-white/20 transition-colors no-underline"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    <span>Back</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* 3-Column Summary Bar */}
            <div className="grid grid-cols-3 divide-x divide-outline-variant border-t border-outline-variant bg-surface-container-lowest">
              <div className="p-3.5 sm:p-4 text-center sm:text-left">
                <p className="text-label-sm uppercase tracking-[0.1em] text-on-surface-variant">Status</p>
                <p className="mt-1 text-body-md font-bold text-emerald-600 flex items-center justify-center sm:justify-start gap-1">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Paid</span>
                </p>
              </div>
              <div className="p-3.5 sm:p-4 text-center sm:text-left">
                <p className="text-label-sm uppercase tracking-[0.1em] text-on-surface-variant">Resident Role</p>
                <p className="mt-1 text-body-md font-semibold text-on-surface">
                  {r.isRenterOccupied ? "Renter" : "Owner"}
                </p>
              </div>
              <div className="p-3.5 sm:p-4 text-center sm:text-left">
                <p className="text-label-sm uppercase tracking-[0.1em] text-on-surface-variant">Collection Fund</p>
                <p className="mt-1 text-body-md font-semibold text-on-surface truncate" title={r.collection?.title}>
                  {r.collection?.title || "Fund"}
                </p>
              </div>
            </div>
          </section>

          {/* Payment Details Section matching MaintenanceDetailPage */}
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-2">
              <h2 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                <span>Payment Details</span>
              </h2>
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1 text-label-sm font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Receipt</span>
              </button>
            </div>

            <div className="divide-y divide-outline-variant/60">
              <div className="flex justify-between py-2.5 text-body-sm">
                <span className="text-on-surface-variant">Collection</span>
                <span className="font-semibold text-on-surface">{r.collection?.title}</span>
              </div>
              <div className="flex justify-between py-2.5 text-body-sm">
                <span className="text-on-surface-variant">House / Flat</span>
                <span className="font-semibold text-on-surface">House {r.label}</span>
              </div>
              <div className="flex justify-between py-2.5 text-body-sm">
                <span className="text-on-surface-variant">Resident</span>
                <span className="font-semibold text-on-surface">
                  {r.ownerName || "Resident"} {r.ownerPhone ? `(${r.ownerPhone})` : ""}
                </span>
              </div>
              <div className="flex justify-between py-2.5 text-body-sm">
                <span className="text-on-surface-variant">Base Contribution</span>
                <span className="font-semibold text-on-surface">{formatAmount(base)}</span>
              </div>
              {r.fee > 0 && (
                <div className="flex justify-between py-2.5 text-body-sm">
                  <span className="text-on-surface-variant">Gateway Fee (2% + GST)</span>
                  <span className="font-semibold text-on-surface">+{formatAmount(r.fee)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 text-body-md font-bold">
                <span className="text-on-surface">Total Amount Paid</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-title-sm">
                  {formatAmount(r.totalAmount || r.amount || base)}
                </span>
              </div>
              <div className="flex justify-between py-2.5 text-body-sm">
                <span className="text-on-surface-variant">Payment Method</span>
                <span className="font-semibold text-on-surface">{r.method || "Online"}</span>
              </div>
              <div className="flex justify-between py-2.5 text-body-sm">
                <span className="text-on-surface-variant">Paid On</span>
                <span className="font-semibold text-on-surface">{formatDate(r.paidOn)}</span>
              </div>
              {r.receiptNo && (
                <div className="flex justify-between py-2.5 text-body-sm">
                  <span className="text-on-surface-variant">Receipt No.</span>
                  <span className="font-semibold font-mono text-primary">{r.receiptNo}</span>
                </div>
              )}
              {r.razorpayPaymentId && (
                <div className="flex justify-between py-2.5 text-body-sm">
                  <span className="text-on-surface-variant">Transaction ID</span>
                  <span className="font-mono text-label-sm text-on-surface-variant">{r.razorpayPaymentId}</span>
                </div>
              )}
            </div>
          </section>

          {/* Admin Payment Rollback */}
          {isAdmin && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Remove this recorded payment?")) unpayMutation.mutate();
                }}
                disabled={unpayMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-error/50 px-4 py-2 text-label-sm font-semibold text-error hover:bg-error-container/30 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>{unpayMutation.isPending ? "Removing..." : "Remove Payment (Admin)"}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Unpaid Payment Options Box (exact layout matching PayMaintenancePage) */
        <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm">
          <h3 className="text-title-md font-bold text-on-surface">Choose how to pay</h3>

          <div className="mt-4 space-y-4">
            {/* Razorpay Online Option */}
            <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">payments</span>
                <p className="text-body-md font-bold text-on-surface">Pay Online (Razorpay)</p>
                <span className="ml-auto rounded-full bg-primary px-2.5 py-0.5 text-label-xs font-bold uppercase tracking-wider text-on-primary">
                  Recommended
                </span>
              </div>

              <div className="mt-3.5 space-y-1.5 rounded-xl bg-white dark:bg-surface-container-low p-3.5 text-body-sm shadow-xs border border-outline-variant/40">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Collection ({r.collection?.title})</span>
                  <span className="font-semibold text-on-surface">{formatAmount(base)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Gateway fee (2% + GST)</span>
                  <span className="font-semibold text-on-surface">
                    +{formatAmount(feeInfo ? feeInfo.fee : mockFee)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-outline-variant/60 pt-2 font-bold text-body-md">
                  <span>Total you pay</span>
                  <span className="text-primary font-extrabold">
                    {formatAmount(feeInfo ? feeInfo.total : total)}
                  </span>
                </div>
              </div>

              <p className="mt-2.5 text-label-sm text-on-surface-variant">
                Society gets full {formatAmount(base)} for {r.collection?.title} — Razorpay keeps gateway fee. Instant receipt generated upon payment.
              </p>

              <button
                type="button"
                onClick={() => createOrderMutation.mutate()}
                disabled={createOrderMutation.isPending}
                className="mt-4 w-full rounded-full bg-primary px-4 py-3 text-label-md font-bold text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm cursor-pointer"
              >
                {createOrderMutation.isPending
                  ? "Creating order..."
                  : `Pay ${formatAmount(feeInfo ? feeInfo.total : total)} Online`}
              </button>

              {feeInfo?.isMock && (
                <p className="mt-2 text-center text-label-sm text-amber-700">
                  Mock mode — no real Razorpay keys configured. Simulating success for testing.
                </p>
              )}
            </div>

            {/* Pay Cash Option */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant text-[24px]">payments</span>
                <p className="text-body-md font-bold text-on-surface">Pay Cash at Office</p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-label-xs font-bold uppercase tracking-wider text-emerald-800">
                  No fee
                </span>
              </div>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                Pay <span className="font-bold text-on-surface">{formatAmount(base)} only</span> cash at the society office. No extra fee. Admin will record payment and issue a receipt.
              </p>
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-label-sm text-amber-900 border border-amber-200/60">
                <span className="font-semibold">Save {formatAmount(mockFee)}</span> by paying cash directly at the office.
              </div>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => payCashMutation.mutate()}
                  disabled={payCashMutation.isPending}
                  className="mt-3.5 block w-full rounded-full bg-surface-container-highest py-2.5 text-center text-label-md font-semibold text-on-surface hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                >
                  {payCashMutation.isPending ? "Recording Cash Payment..." : "Record as Paid (Cash Admin)"}
                </button>
              ) : (
                <Link
                  to={backTarget}
                  className="mt-3.5 block rounded-full border border-outline-variant bg-surface-container-lowest py-2.5 text-center text-label-md font-semibold text-on-surface no-underline hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  I will pay cash at office
                </Link>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-error-container px-3.5 py-2.5 text-label-md text-on-error-container">
              {error}
            </p>
          )}
          {success && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-label-md font-medium text-emerald-800 border border-emerald-200">
              {success}
            </p>
          )}

          <p className="mt-4 text-center text-label-sm text-outline">
            Due by {formatDate(r.collection?.dueDate)} · Razorpay = online convenience, Cash = save fee
          </p>
        </section>
      )}
    </div>
  );
}
