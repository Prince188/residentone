import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveSociety,
  selectActiveMembership,
} from "../../stores/society.store";
import {
  getDonations,
  createDonation,
  cancelDonation,
  formatAmount,
  formatDate,
  extractApiError,
  DONATION_PURPOSES,
  exportDonationsExcel,
} from "../../lib/donations";
import { getHouseCards } from "../../lib/houses";
import { hasPermission } from "../../lib/permissions";

export default function DonationsPage() {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);

  const societyId = activeSociety?.id || activeSociety?._id;
  const canCollect = hasPermission(activeMembership?.role, "collect_donations");

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedPurpose, setSelectedPurpose] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modal States
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [cancelModalId, setCancelModalId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // Form State
  const [form, setForm] = useState({
    unitId: "",
    donorName: "",
    donorPhone: "",
    amount: "",
    purpose: "ganesh_utsav",
    paymentMode: "cash",
    notes: "",
  });

  // Queries
  const { data: donationsRes, isLoading } = useQuery({
    queryKey: ["donations", societyId],
    queryFn: () => getDonations({ limit: 100 }),
    enabled: Boolean(societyId),
  });

  const donations = Array.isArray(donationsRes?.data) ? donationsRes.data : Array.isArray(donationsRes?.data?.data) ? donationsRes.data.data : [];

  const { data: unitsRes } = useQuery({
    queryKey: ["units", societyId],
    queryFn: () => getHouseCards(),
    enabled: Boolean(societyId),
  });

  const units = Array.isArray(unitsRes?.data?.data) ? unitsRes.data.data : Array.isArray(unitsRes?.data) ? unitsRes.data : [];

  // Mutations
  const collectMutation = useMutation({
    mutationFn: (payload) => createDonation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["donations", societyId]);
      queryClient.invalidateQueries(["wallet-summary", societyId]);
      setIsCollectOpen(false);
      setStatusMsg("Donation recorded successfully!");
      setTimeout(() => setStatusMsg(""), 3500);
      setForm({
        unitId: "",
        donorName: "",
        donorPhone: "",
        amount: "",
        purpose: "ganesh_utsav",
        paymentMode: "cash",
        notes: "",
      });
    },
    onError: (err) => {
      setErrorMsg(extractApiError(err, "Failed to record donation"));
      setTimeout(() => setErrorMsg(""), 4000);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => cancelDonation(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(["donations", societyId]);
      queryClient.invalidateQueries(["wallet-summary", societyId]);
      setCancelModalId(null);
      setCancelReason("");
      setStatusMsg("Donation cancelled successfully");
      setTimeout(() => setStatusMsg(""), 3500);
    },
    onError: (err) => {
      setErrorMsg(extractApiError(err, "Failed to cancel donation"));
      setTimeout(() => setErrorMsg(""), 4000);
    },
  });

  const handleUnitSelect = (e) => {
    const selectedId = e.target.value;
    const selectedUnit = units.find((u) => (u._id || u.id) === selectedId);
    setForm((prev) => ({
      ...prev,
      unitId: selectedId,
      donorName: selectedUnit?.owner?.name || selectedUnit?.occupantName || prev.donorName,
      donorPhone: selectedUnit?.owner?.phone || prev.donorPhone,
    }));
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await exportDonationsExcel();
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Donations_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatusMsg("Donations report downloaded successfully");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Failed to download donations report");
      setTimeout(() => setErrorMsg(""), 3500);
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      setErrorMsg("Please enter a valid donation amount");
      return;
    }

    const payload = {
      unitId: form.unitId || undefined,
      donorName: form.donorName.trim() || undefined,
      donorPhone: form.donorPhone.trim() || undefined,
      amount: amt,
      purpose: form.purpose,
      paymentMode: form.paymentMode,
      notes: form.notes.trim() || undefined,
    };

    collectMutation.mutate(payload);
  };

  // Filtered donations
  const filteredDonations = useMemo(() => {
    return donations.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (item.donorName || "").toLowerCase().includes(q) ||
        (item.donorPhone || "").toLowerCase().includes(q) ||
        (item.receiptNo || "").toLowerCase().includes(q) ||
        (item.unit?.unitNumber || "").toLowerCase().includes(q);

      const matchPurpose =
        selectedPurpose === "all" || item.purpose === selectedPurpose;

      return matchSearch && matchPurpose;
    });
  }, [donations, search, selectedPurpose]);

  const totalCollected = useMemo(() => {
    return donations
      .filter((d) => d.status !== "cancelled")
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [donations]);

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
            <span className="material-symbols-outlined text-purple-600 text-[28px]">volunteer_activism</span>
            <h1 className="text-2xl font-bold text-on-surface">Donations & Charity Drives</h1>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Collect and track contributions for festivals, temple maintenance, welfare funds, and causes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/donations/my"
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            My Donations
          </Link>

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
              onClick={() => setIsCollectOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Record Donation
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Collections</span>
            <span className="material-symbols-outlined text-purple-600 bg-purple-50 p-2 rounded-xl text-[20px]">volunteer_activism</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-on-surface">{formatAmount(totalCollected)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">From active donation drives</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Donors Count</span>
            <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-xl text-[20px]">group</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-on-surface">{donations.length}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Total receipts generated</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Active Causes</span>
            <span className="material-symbols-outlined text-amber-600 bg-amber-50 p-2 rounded-xl text-[20px]">celebration</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-on-surface">{DONATION_PURPOSES.length}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Festivals, mandir & relief funds</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search donor name, phone, flat number, receipt ID..."
              className="w-full rounded-xl border border-outline-variant bg-surface py-2 pl-10 pr-4 text-sm text-on-surface focus:border-primary focus:outline-none"
            />
          </div>

          <select
            value={selectedPurpose}
            onChange={(e) => setSelectedPurpose(e.target.value)}
            className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
          >
            <option value="all">All Causes & Purposes</option>
            {DONATION_PURPOSES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Donations Table */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-on-surface-variant">Loading donations...</div>
        ) : filteredDonations.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[44px] text-outline">volunteer_activism</span>
            <h3 className="mt-2 text-base font-semibold text-on-surface">No donations found</h3>
            <p className="mt-1 text-sm">No donation receipts match your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold uppercase text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3.5">Donor / Flat</th>
                  <th className="px-4 py-3.5">Cause / Purpose</th>
                  <th className="px-4 py-3.5">Receipt #</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Mode</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  {canCollect && <th className="px-4 py-3.5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredDonations.map((d) => {
                  const purposeMeta = DONATION_PURPOSES.find((p) => p.id === d.purpose);
                  const isCancelled = d.status === "cancelled";
                  return (
                    <tr key={d._id || d.id} className="hover:bg-surface-container-low/50">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-on-surface">{d.donorName || "Anonymous Resident"}</div>
                        <div className="text-xs text-on-surface-variant">
                          {d.unit?.unitNumber ? `Flat ${d.unit.unitNumber}` : "General Member"}
                          {d.donorPhone ? ` · ${d.donorPhone}` : ""}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                          {purposeMeta?.label || d.purpose || "General Donation"}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-mono text-xs text-on-surface-variant whitespace-nowrap">
                        {d.receiptNo || "—"}
                      </td>

                      <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                        {formatDate(d.createdAt || d.date)}
                      </td>

                      <td className="px-4 py-4 capitalize text-on-surface-variant whitespace-nowrap">
                        {d.paymentMode || "Cash"}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {formatAmount(d.amount)}
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isCancelled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {isCancelled ? "Cancelled" : "Success"}
                        </span>
                      </td>

                      {canCollect && (
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          {!isCancelled ? (
                            <button
                              onClick={() => setCancelModalId(d._id || d.id)}
                              className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                            >
                              Cancel Receipt
                            </button>
                          ) : (
                            <span className="text-xs text-outline">—</span>
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

      {/* Record Donation Modal */}
      {isCollectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h2 className="text-lg font-bold text-on-surface">Record Donation Receipt</h2>
              <button
                onClick={() => setIsCollectOpen(false)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Select Unit / Flat (Optional)
                </label>
                <select
                  value={form.unitId}
                  onChange={handleUnitSelect}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="">General Contributor / Guest</option>
                  {units.map((u) => (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      Flat {u.unitNumber} {u.wing?.name ? `(Wing ${u.wing.name})` : ""} {u.owner?.name ? `· ${u.owner.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Donor Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={form.donorName}
                    onChange={(e) => setForm({ ...form, donorName: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="10-digit mobile"
                    value={form.donorPhone}
                    onChange={(e) => setForm({ ...form, donorPhone: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Donation Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 501, 1100, 5000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                    Cause / Purpose *
                  </label>
                  <select
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                  >
                    {DONATION_PURPOSES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["cash", "upi", "bank_transfer"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMode: mode })}
                      className={`rounded-xl border py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                        form.paymentMode === mode
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      {mode.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Notes / Reference
                </label>
                <textarea
                  rows="2"
                  placeholder="UPI Ref, Cheque No, or specific wishes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsCollectOpen(false)}
                  className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={collectMutation.isPending}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {collectMutation.isPending ? "Generating Receipt..." : "Record & Issue Receipt"}
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
            <h3 className="text-lg font-bold text-on-surface">Cancel Donation Receipt?</h3>
            <p className="text-sm text-on-surface-variant">
              Are you sure you want to cancel this receipt? This will revoke the donation voucher in the society accounts.
            </p>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                Reason for cancellation *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Wrong amount entered, cheque returned"
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
                Keep Receipt
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
