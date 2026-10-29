import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveSociety,
  selectActiveMembership,
} from "../../stores/society.store";
import {
  getTransferFees,
  createTransferFee,
  cancelTransferFee,
  formatAmount,
  formatDate,
  extractApiError,
  exportTransferFeesExcel,
} from "../../lib/transferFees";
import { getHouseCards } from "../../lib/houses";
import { hasPermission } from "../../lib/permissions";

export default function TransferFeesPage() {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);

  const societyId = activeSociety?.id || activeSociety?._id;
  const canCollect = hasPermission(activeMembership?.role, "collect_transfer_fees");

  // State
  const [search, setSearch] = useState("");
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [cancelModalId, setCancelModalId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [exporting, setExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [form, setForm] = useState({
    unitId: "",
    sellerName: "",
    sellerPhone: "",
    buyerName: "",
    buyerPhone: "",
    amount: "",
    paymentMode: "bank_transfer",
    referenceNo: "",
    nocIssued: true,
    notes: "",
  });

  // Queries
  const { data: feesRes, isLoading } = useQuery({
    queryKey: ["transfer-fees", societyId],
    queryFn: () => getTransferFees(),
    enabled: Boolean(societyId),
  });

  const transferFees = Array.isArray(feesRes?.data) ? feesRes.data : Array.isArray(feesRes?.data?.data) ? feesRes.data.data : [];

  const { data: unitsRes } = useQuery({
    queryKey: ["units", societyId],
    queryFn: () => getHouseCards(),
    enabled: Boolean(societyId),
  });

  const units = Array.isArray(unitsRes?.data?.data) ? unitsRes.data.data : Array.isArray(unitsRes?.data) ? unitsRes.data : [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => createTransferFee(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["transfer-fees", societyId]);
      queryClient.invalidateQueries(["wallet-summary", societyId]);
      setIsRecordOpen(false);
      setStatusMsg("Transfer fee recorded & receipt generated!");
      setTimeout(() => setStatusMsg(""), 3500);
      setForm({
        unitId: "",
        sellerName: "",
        sellerPhone: "",
        buyerName: "",
        buyerPhone: "",
        amount: "",
        paymentMode: "bank_transfer",
        referenceNo: "",
        nocIssued: true,
        notes: "",
      });
    },
    onError: (err) => {
      setErrorMsg(extractApiError(err, "Failed to record transfer fee"));
      setTimeout(() => setErrorMsg(""), 4000);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => cancelTransferFee(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(["transfer-fees", societyId]);
      queryClient.invalidateQueries(["wallet-summary", societyId]);
      setCancelModalId(null);
      setCancelReason("");
      setStatusMsg("Transfer fee record cancelled");
      setTimeout(() => setStatusMsg(""), 3500);
    },
    onError: (err) => {
      setErrorMsg(extractApiError(err, "Failed to cancel transfer fee"));
      setTimeout(() => setErrorMsg(""), 4000);
    },
  });

  const handleUnitSelect = (e) => {
    const selectedId = e.target.value;
    const selectedUnit = units.find((u) => (u._id || u.id) === selectedId);
    setForm((prev) => ({
      ...prev,
      unitId: selectedId,
      sellerName: selectedUnit?.owner?.name || selectedUnit?.occupantName || prev.sellerName,
      sellerPhone: selectedUnit?.owner?.phone || prev.sellerPhone,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.unitId) {
      setErrorMsg("Please select the flat/unit being transferred");
      return;
    }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      setErrorMsg("Please enter a valid transfer fee amount");
      return;
    }

    const payload = {
      unitId: form.unitId,
      sellerName: form.sellerName.trim() || undefined,
      sellerPhone: form.sellerPhone.trim() || undefined,
      buyerName: form.buyerName.trim() || undefined,
      buyerPhone: form.buyerPhone.trim() || undefined,
      amount: amt,
      paymentMode: form.paymentMode,
      referenceNo: form.referenceNo.trim() || undefined,
      nocIssued: form.nocIssued,
      notes: form.notes.trim() || undefined,
    };

    createMutation.mutate(payload);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await exportTransferFeesExcel();
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Transfer_Fees_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatusMsg("Transfer fees spreadsheet downloaded");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Failed to download transfer fees spreadsheet");
      setTimeout(() => setErrorMsg(""), 3500);
    } finally {
      setExporting(false);
    }
  };

  // Filtered
  const filteredFees = useMemo(() => {
    return transferFees.filter((item) => {
      const q = search.toLowerCase();
      return (
        !search ||
        (item.sellerName || "").toLowerCase().includes(q) ||
        (item.buyerName || "").toLowerCase().includes(q) ||
        (item.receiptNo || "").toLowerCase().includes(q) ||
        (item.unit?.unitNumber || "").toLowerCase().includes(q)
      );
    });
  }, [transferFees, search]);

  const totalCollected = useMemo(() => {
    return transferFees
      .filter((f) => f.status !== "cancelled")
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [transferFees]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 space-y-6">
      {/* Toast Alert */}
      {statusMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-medium">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm font-medium">
          <span className="material-symbols-outlined text-red-600">error</span>
          {errorMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700 text-[28px]">real_estate_agent</span>
            <h1 className="text-2xl font-bold text-on-surface">Transfer Fees & Resale NOC</h1>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage flat resale transfer charges, buyer/seller details, society NOC issuance, and revenue records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCollect && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              {exporting ? "Exporting..." : "Export Excel"}
            </button>
          )}

          {canCollect && (
            <button
              onClick={() => setIsRecordOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Record Transfer Fee
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Transfer Revenue</span>
            <span className="material-symbols-outlined text-emerald-700 bg-emerald-50 p-2 rounded-xl text-[20px]">real_estate_agent</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-on-surface">{formatAmount(totalCollected)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Credited to society capital reserve</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Transfers Executed</span>
            <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-xl text-[20px]">apartment</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-on-surface">{transferFees.length}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Flats transferred</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">NOC Issued</span>
            <span className="material-symbols-outlined text-sky-700 bg-sky-50 p-2 rounded-xl text-[20px]">verified</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-on-surface">
            {transferFees.filter((f) => f.nocIssued).length}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">Clearance certificates granted</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by buyer, seller, flat number, or receipt..."
            className="w-full rounded-xl border border-outline-variant bg-surface py-2 pl-10 pr-4 text-sm text-on-surface focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-on-surface-variant">Loading transfer fee records...</div>
        ) : filteredFees.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[44px] text-outline">real_estate_agent</span>
            <h3 className="mt-2 text-base font-semibold text-on-surface">No transfer fees found</h3>
            <p className="mt-1 text-sm">No property ownership transfer records match your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold uppercase text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3.5">Flat / Unit</th>
                  <th className="px-4 py-3.5">Seller (Current)</th>
                  <th className="px-4 py-3.5">Buyer (New)</th>
                  <th className="px-4 py-3.5">Receipt #</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">NOC Status</th>
                  <th className="px-4 py-3.5 text-right">Fee Amount</th>
                  {canCollect && <th className="px-4 py-3.5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredFees.map((f) => {
                  const isCancelled = f.status === "cancelled";
                  return (
                    <tr key={f._id || f.id} className="hover:bg-surface-container-low/50">
                      <td className="px-5 py-4 font-bold text-on-surface whitespace-nowrap">
                        Flat {f.unit?.unitNumber || "—"} {f.unit?.wing?.name ? `(Wing ${f.unit.wing.name})` : ""}
                      </td>

                      <td className="px-4 py-4 text-on-surface">
                        <div className="font-semibold">{f.sellerName || "—"}</div>
                        {f.sellerPhone && <div className="text-xs text-on-surface-variant">{f.sellerPhone}</div>}
                      </td>

                      <td className="px-4 py-4 text-on-surface">
                        <div className="font-semibold">{f.buyerName || "—"}</div>
                        {f.buyerPhone && <div className="text-xs text-on-surface-variant">{f.buyerPhone}</div>}
                      </td>

                      <td className="px-4 py-4 font-mono text-xs text-on-surface-variant whitespace-nowrap">
                        {f.receiptNo || "—"}
                      </td>

                      <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                        {formatDate(f.createdAt || f.date)}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          f.nocIssued ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          <span className="material-symbols-outlined text-[13px]">
                            {f.nocIssued ? "verified" : "pending"}
                          </span>
                          {f.nocIssued ? "NOC Granted" : "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {formatAmount(f.amount)}
                      </td>

                      {canCollect && (
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          {!isCancelled ? (
                            <button
                              onClick={() => setCancelModalId(f._id || f.id)}
                              className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                            >
                              Cancel Receipt
                            </button>
                          ) : (
                            <span className="text-xs text-outline font-semibold">Cancelled</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Transfer Fee Modal */}
      {isRecordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h2 className="text-lg font-bold text-on-surface">Record Ownership Transfer Fee</h2>
              <button
                onClick={() => setIsRecordOpen(false)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Select Transferred Flat / Unit *
                </label>
                <select
                  required
                  value={form.unitId}
                  onChange={handleUnitSelect}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="">-- Choose Unit --</option>
                  {units.map((u) => (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      Flat {u.unitNumber} {u.wing?.name ? `(Wing ${u.wing.name})` : ""} {u.owner?.name ? `· Current Owner: ${u.owner.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Seller Name (Old Owner)
                  </label>
                  <input
                    type="text"
                    value={form.sellerName}
                    onChange={(e) => setForm({ ...form, sellerName: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Seller Phone
                  </label>
                  <input
                    type="text"
                    value={form.sellerPhone}
                    onChange={(e) => setForm({ ...form, sellerPhone: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Buyer Name (New Purchaser) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full name of buyer"
                    value={form.buyerName}
                    onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Buyer Phone
                  </label>
                  <input
                    type="text"
                    placeholder="10-digit mobile"
                    value={form.buyerPhone}
                    onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Transfer Fee Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 10000, 25000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={form.paymentMode}
                    onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="cheque">Cheque / Demand Draft</option>
                    <option value="upi">UPI / Online</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Bank Reference / Cheque No
                </label>
                <input
                  type="text"
                  placeholder="UTR Number or Cheque Number"
                  value={form.referenceNo}
                  onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="nocIssued"
                  checked={form.nocIssued}
                  onChange={(e) => setForm({ ...form, nocIssued: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <label htmlFor="nocIssued" className="text-sm font-medium text-on-surface cursor-pointer">
                  Issue Society NOC Clearance Certificate
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Agreement dates, lawyer references..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsRecordOpen(false)}
                  className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Recording..." : "Record Fee & Issue Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-on-surface">Cancel Transfer Fee Record?</h3>
            <p className="text-sm text-on-surface-variant">
              Are you sure you want to cancel this transfer fee receipt? This will revoke the payment voucher from the society records.
            </p>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                Reason for cancellation *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sale cancelled, incorrect fee amount"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelModalId(null)}
                className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                Keep Record
              </button>
              <button
                onClick={() => cancelMutation.mutate({ id: cancelModalId, reason: cancelReason })}
                disabled={cancelMutation.isPending}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
