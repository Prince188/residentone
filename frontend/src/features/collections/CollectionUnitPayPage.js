import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCollectionUnitDetail, recordCollectionPayment, removeCollectionPayment, createRazorpayOrder, verifyRazorpayPayment, extractApiError, formatAmount, formatDate, STATUS_UI } from "../../lib/collections";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";
import { useState } from "react";

export default function CollectionUnitPayPage() {
  const { id, unitId } = useParams();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const permQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const isAdmin = hasPermission(membership?.role, "manage_collections", permQuery.data) || hasPermission(membership?.role, "manage_maintenance", permQuery.data);

  const detailQuery = useQuery({
    queryKey: ["collection-unit-detail", id, unitId],
    queryFn: async () => (await getCollectionUnitDetail(id, unitId)).data.data,
    enabled: Boolean(id && unitId),
  });

  const detail = detailQuery.data;
  const isPaid = detail && ["paid", "late_paid"].includes(detail.status);

  const payMutation = useMutation({
    mutationFn: () => recordCollectionPayment(id, unitId, { method: "Cash" }).then((r) => r.data.data),
    onSuccess: () => { setMsg("Payment recorded as Cash"); setErr(""); queryClient.invalidateQueries({ queryKey: ["collection-unit-detail"] }); queryClient.invalidateQueries({ queryKey: ["collection-units"] }); },
    onError: (e) => { setErr(extractApiError(e, "Failed to record")); setMsg(""); },
  });

  const unpayMutation = useMutation({
    mutationFn: () => removeCollectionPayment(id, unitId).then((r) => r.data.data),
    onSuccess: () => { setMsg("Payment removed"); setErr(""); queryClient.invalidateQueries({ queryKey: ["collection-unit-detail"] }); },
    onError: (e) => { setErr(extractApiError(e, "Failed")); setMsg(""); },
  });

  const razorOrderMutation = useMutation({
    mutationFn: () => createRazorpayOrder(id, unitId).then((r) => r.data.data),
    onSuccess: async (order) => {
      // Load Razorpay checkout if available
      try {
        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID || order.keyId || "",
          amount: order.total * 100,
          currency: "INR",
          name: detail.collection.title,
          description: `House ${detail.label} · Collection`,
          order_id: order.id,
          handler: async function (response) {
            try {
              await verifyRazorpayPayment(id, unitId, {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              setMsg("Online payment verified!");
              queryClient.invalidateQueries({ queryKey: ["collection-unit-detail"] });
            } catch (e) {
              setErr(extractApiError(e, "Verification failed"));
            }
          },
          theme: { color: "#6750A4" },
        };
        if (window.Razorpay) {
          const rz = new window.Razorpay(options);
          rz.open();
        } else {
          // Fallback: if SDK not loaded, show order info and simulate verify
          setErr("Razorpay SDK not loaded. Order created: " + order.id);
        }
      } catch (e) {
        setErr(extractApiError(e, "Razorpay failed"));
      }
    },
    onError: (e) => { setErr(extractApiError(e, "Order failed")); setMsg(""); },
  });

  if (detailQuery.isLoading) return <div className="mx-auto max-w-3xl p-10 text-center">Loading...</div>;
  if (detailQuery.isError) return <div className="mx-auto max-w-3xl p-6 text-center text-error">{extractApiError(detailQuery.error, "Failed to load")}</div>;
  if (!detail) return null;

  const status = STATUS_UI[detail.status] || STATUS_UI.pending;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to={`/collections/${id}`} className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary">
        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to {detail.collection.title}
      </Link>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <h1 className="text-title-md font-semibold">House {detail.label}</h1>
        <p className="text-body-sm text-on-surface-variant">{detail.ownerName || "No resident"} · {detail.block || ""} {detail.floor || ""} {detail.doorNo || ""}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-label-sm font-semibold ${status.pill}`}>{status.label}</span>
          <span className="text-body-md font-semibold">{formatAmount(detail.amount)} due {formatDate(detail.collection.dueDate)}</span>
        </div>
        {detail.paidOn && <p className="mt-2 text-label-sm text-outline">Paid on {formatDate(detail.paidOn)} via {detail.method} {detail.receiptNo && `· ${detail.receiptNo}`}</p>}
        {detail.fee > 0 && <p className="text-label-sm text-outline">Fee: {formatAmount(detail.fee)} · Total: {formatAmount(detail.totalAmount)}</p>}
      </section>

      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-body-sm text-emerald-800">{msg}</p>}
      {err && <p className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">{err}</p>}

      <section className="space-y-3">
        {isPaid ? (
          <>
            <p className="text-body-sm font-semibold text-emerald-700 flex items-center gap-1"><span className="material-symbols-outlined">check_circle</span> Payment completed</p>
            {isAdmin && (
              <button type="button" onClick={() => { if (window.confirm("Remove this payment?")) unpayMutation.mutate(); }} disabled={unpayMutation.isPending} className="rounded-full border border-error px-4 py-2 text-label-md text-error hover:bg-error-container">
                {unpayMutation.isPending ? "Removing..." : "Remove Payment (Admin)"}
              </button>
            )}
          </>
        ) : (
          <>
            {isAdmin && (
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => payMutation.mutate()} disabled={payMutation.isPending} className="rounded-full bg-primary px-5 py-2.5 text-label-md text-on-primary disabled:opacity-50">
                  {payMutation.isPending ? "Recording..." : "Mark as Paid (Cash)"}
                </button>
                <button type="button" onClick={() => razorOrderMutation.mutate()} disabled={razorOrderMutation.isPending} className="rounded-full border border-primary px-5 py-2.5 text-label-md text-primary hover:bg-primary-fixed">
                  {razorOrderMutation.isPending ? "Creating Order..." : "Pay Online (Razorpay)"}
                </button>
              </div>
            )}
            {!isAdmin && (
              <button type="button" onClick={() => razorOrderMutation.mutate()} disabled={razorOrderMutation.isPending} className="w-full rounded-full bg-primary px-6 py-3 text-body-md font-semibold text-on-primary disabled:opacity-50">
                {razorOrderMutation.isPending ? "Processing..." : `Pay ${formatAmount(detail.amount)} Online`}
              </button>
            )}
            {!isAdmin && <p className="text-label-sm text-outline text-center">You can pay online via UPI/Card. Contact admin for cash payment.</p>}
          </>
        )}
      </section>
    </div>
  );
}
