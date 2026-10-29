import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import {
  verifyReceiptToken,
  parseQrPayload,
  formatAmount,
  formatDate,
  extractApiError,
} from "../../lib/receipts";

export default function VerifyReceiptPage() {
  const [searchParams] = useSearchParams();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const societyId = activeSociety?.id || activeSociety?._id;

  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Auto verify if query param ?t= or ?token= is in URL
  useEffect(() => {
    const queryToken = searchParams.get("t") || searchParams.get("token");
    if (queryToken) {
      setInputVal(queryToken);
      performVerification(queryToken);
    }
  }, [searchParams]);

  const performVerification = async (rawInput) => {
    if (!rawInput.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const parsed = parseQrPayload(rawInput);
    const tokenToVerify = parsed.token || rawInput.trim();

    try {
      const data = await verifyReceiptToken(tokenToVerify, societyId);
      setResult(data);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 403 || data?.error?.code === "WRONG_SOCIETY" || data?.code === "WRONG_SOCIETY") {
        setError({
          code: "WRONG_SOCIETY",
          message: data?.error?.message || data?.message || "Wrong Receipt: This receipt was issued by a different society.",
        });
      } else if (status === 404 || data?.error?.code === "NOT_FOUND") {
        setError({
          code: "NOT_FOUND",
          message: "Receipt not found in database. Please check the receipt number or QR code.",
        });
      } else {
        setError({
          code: "ERROR",
          message: extractApiError(err, "Failed to verify receipt authenticity. Invalid token."),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    performVerification(inputVal);
  };

  const isVoided = result?.isVoided || result?.status === "voided" || result?.valid === false;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-3 text-primary">
          <span className="material-symbols-outlined text-[36px]">verified</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface">Official Receipt Verification</h1>
        <p className="text-sm text-on-surface-variant max-w-lg mx-auto">
          Verify digital authenticity of society maintenance bills, donations, transfer fees, and payment vouchers.
        </p>
      </div>

      {/* Input Card */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
        <form onSubmit={handleFormSubmit} className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Enter Receipt Number or Paste QR Token
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              placeholder="e.g. REC-2026-0001, TF-2026-0005, or paste JWT token"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              {loading ? "Verifying..." : "Verify Receipt"}
            </button>
          </div>
          <p className="text-xs text-on-surface-variant">
            You can enter any receipt code, scan a QR code with your phone camera, or paste the link here.
          </p>
        </form>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 text-center text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
          <p className="mt-2 text-sm font-medium">Validating cryptographic signature & society records...</p>
        </div>
      )}

      {/* Error Card */}
      {error && !loading && (
        <div className={`rounded-2xl border p-5 shadow-sm space-y-2 ${
          error.code === "WRONG_SOCIETY"
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-red-300 bg-red-50 text-red-900"
        }`}>
          <div className="flex items-center gap-2.5 font-bold text-base">
            <span className="material-symbols-outlined text-[24px]">
              {error.code === "WRONG_SOCIETY" ? "warning" : "error"}
            </span>
            {error.code === "WRONG_SOCIETY" ? "Wrong Society Receipt" : "Verification Failed"}
          </div>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Verified Result Card */}
      {result && !loading && (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-md overflow-hidden space-y-0 divide-y divide-outline-variant">
          {/* Status Header */}
          {isVoided ? (
            <div className="bg-red-600 p-5 text-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-lg">
                <span className="material-symbols-outlined text-[26px]">cancel</span>
                VOIDED / CANCELLED PAYMENT RECEIPT
              </div>
              <p className="text-xs text-red-100">
                Warning: This payment was cancelled or refunded by the society administration. It is no longer valid.
              </p>
              {result.reversal && (
                <div className="mt-2 rounded-xl bg-black/20 p-3 text-xs space-y-1">
                  <div><strong>Cancelled On:</strong> {formatDate(result.reversal.reversedAt)}</div>
                  {result.reversal.reason && <div><strong>Reason:</strong> {result.reversal.reason}</div>}
                  {result.reversal.reversedByName && <div><strong>Authorized By:</strong> {result.reversal.reversedByName}</div>}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-600 p-5 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-bold text-lg">
                  <span className="material-symbols-outlined text-[26px]">verified</span>
                  AUTHENTIC SOCIETY RECEIPT
                </div>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Cryptographically verified and confirmed in society database
                </p>
              </div>
              <span className="font-mono text-xs bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">
                {result.receiptNo}
              </span>
            </div>
          )}

          {/* Details Body */}
          <div className="p-6 space-y-5">
            {/* Society & Amount Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Issued By</span>
                <h3 className="text-lg font-bold text-on-surface">{result.society?.name || "Registered Society"}</h3>
                {result.society?.address && (
                  <p className="text-xs text-on-surface-variant">{result.society.address}</p>
                )}
              </div>
              <div className="sm:text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Amount Paid</span>
                <p className={`text-3xl font-extrabold ${isVoided ? "text-red-600 line-through" : "text-emerald-700"}`}>
                  {formatAmount(result.total || result.amount || result.payment?.totalAmount)}
                </p>
              </div>
            </div>

            {/* Grid Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-surface-container-low p-3.5 space-y-1">
                <span className="text-xs font-semibold uppercase text-on-surface-variant">Allocated Unit / Flat</span>
                <p className="font-bold text-on-surface">
                  {result.house || (result.unit ? `Flat ${result.unit.unitNumber}` : "General Society")}
                </p>
              </div>

              <div className="rounded-xl bg-surface-container-low p-3.5 space-y-1">
                <span className="text-xs font-semibold uppercase text-on-surface-variant">Resident / Payee</span>
                <p className="font-bold text-on-surface">
                  {result.resident?.name || result.payment?.donorName || result.payment?.buyerName || "Resident"}
                  {result.resident?.phone ? ` · ${result.resident.phone}` : ""}
                </p>
              </div>

              <div className="rounded-xl bg-surface-container-low p-3.5 space-y-1">
                <span className="text-xs font-semibold uppercase text-on-surface-variant">Period / Purpose</span>
                <p className="font-semibold text-on-surface capitalize">
                  {result.period || result.type?.replace(/_/g, " ") || "Maintenance Dues"}
                </p>
              </div>

              <div className="rounded-xl bg-surface-container-low p-3.5 space-y-1">
                <span className="text-xs font-semibold uppercase text-on-surface-variant">Payment Mode & Ref</span>
                <p className="font-semibold text-on-surface capitalize">
                  {result.method || result.payment?.method || "Cash"}
                  {result.txn ? ` (Txn: ${result.txn})` : ""}
                </p>
              </div>

              <div className="rounded-xl bg-surface-container-low p-3.5 space-y-1">
                <span className="text-xs font-semibold uppercase text-on-surface-variant">Payment Date</span>
                <p className="font-semibold text-on-surface">
                  {formatDate(result.paidOn || result.payment?.paidOn)}
                </p>
              </div>

              <div className="rounded-xl bg-surface-container-low p-3.5 space-y-1">
                <span className="text-xs font-semibold uppercase text-on-surface-variant">Collected / Verified By</span>
                <p className="font-semibold text-on-surface">
                  {result.payment?.collectedBy || result.payment?.acceptedBy?.name || "Society Administrator"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
