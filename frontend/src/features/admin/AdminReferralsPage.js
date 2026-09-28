import { useState, useEffect } from "react";
import {
  getAdminReferrals,
  dispatchReferralGift,
  getReferralSettings,
  updateReferralSettings,
} from "../../lib/referrals";

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [giftStatusFilter, setGiftStatusFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal states
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [giftDetails, setGiftDetails] = useState("");
  const [courierNotes, setCourierNotes] = useState("");
  const [dispatchLoading, setDispatchLoading] = useState(false);

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState({ discountType: "FLAT", discountValue: 500, isReferralActive: true });
  const [settingsLoading, setSettingsLoading] = useState(false);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await getAdminReferrals({
        page,
        limit: 20,
        search,
        giftStatus: giftStatusFilter,
        status: statusFilter,
      });
      setData(res.data?.data || null);
    } catch (err) {
      console.error("Failed to load referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await getReferralSettings();
      if (res.data?.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [page, search, giftStatusFilter, statusFilter]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReferral) return;
    setDispatchLoading(true);
    try {
      await dispatchReferralGift(selectedReferral._id, {
        giftDetails,
        courierOrTrackingNotes: courierNotes,
        giftStatus: "GIFT_DISPATCHED",
      });
      setSelectedReferral(null);
      setGiftDetails("");
      setCourierNotes("");
      fetchReferrals();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to dispatch gift");
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      await updateReferralSettings(settings);
      setShowSettingsModal(false);
      alert("Referral settings updated successfully!");
    } catch (err) {
      alert(err.response?.data?.error?.message || "Failed to update settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  const summary = data?.summary || {
    totalReferrals: 0,
    registeredCount: 0,
    paidCount: 0,
    pendingGiftsCount: 0,
    dispatchedGiftsCount: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">card_giftcard</span>
            Referral & Gift Management
          </h1>
          <p className="text-sm text-on-surface-variant">
            Track user referrals, paid society activations, and fulfill physical gifts for referrers.
          </p>
        </div>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-high text-on-surface border border-outline-variant font-medium rounded-xl hover:bg-surface-container transition-colors shadow-sm text-sm"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          Program Settings
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-outline font-medium">Total Referrals</p>
            <h3 className="text-2xl font-bold text-on-surface mt-1">{summary.totalReferrals}</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              <span className="text-emerald-600 font-semibold">{summary.paidCount} Paid</span> • {summary.registeredCount} Registered
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">group_add</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-700 font-medium">Pending Gifts 🎁</p>
            <h3 className="text-2xl font-bold text-amber-900 mt-1">{summary.pendingGiftsCount}</h3>
            <p className="text-xs text-amber-700/80 mt-1">Awaiting dispatch</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-2xl">featured_seasonal</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-700 font-medium">Gifts Dispatched</p>
            <h3 className="text-2xl font-bold text-emerald-900 mt-1">{summary.dispatchedGiftsCount}</h3>
            <p className="text-xs text-emerald-700/80 mt-1">Gifts sent to users</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-2xl">local_shipping</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-outline font-medium">Society Discount</p>
            <h3 className="text-2xl font-bold text-on-surface mt-1">
              {settings.discountType === "PERCENTAGE" ? `${settings.discountValue}%` : `₹${settings.discountValue}`}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">Given to referred society</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">sell</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => { setGiftStatusFilter(""); setStatusFilter(""); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              giftStatusFilter === "" && statusFilter === ""
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            All Referrals
          </button>
          <button
            onClick={() => { setGiftStatusFilter("PENDING_GIFT"); setStatusFilter(""); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              giftStatusFilter === "PENDING_GIFT"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-500/10 text-amber-800 hover:bg-amber-500/20"
            }`}
          >
            <span>🎁 Pending Gifts</span>
            {summary.pendingGiftsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-700 text-white text-[10px]">
                {summary.pendingGiftsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setGiftStatusFilter("GIFT_DISPATCHED"); setStatusFilter(""); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              giftStatusFilter === "GIFT_DISPATCHED"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20"
            }`}
          >
            Dispatched Gifts
          </button>
          <button
            onClick={() => { setStatusFilter("REGISTERED"); setGiftStatusFilter(""); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === "REGISTERED"
                ? "bg-surface-variant text-on-surface-variant shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            Unpaid / Registered Only
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search referrer or society..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Referrals Table */}
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
            <p>Loading referrals list...</p>
          </div>
        ) : !data?.referrals || data.referrals.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">loyalty</span>
            <p className="font-semibold text-on-surface">No referrals found</p>
            <p className="text-xs text-outline mt-1">Try clearing your search or filter settings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-outline text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Referrer User</th>
                  <th className="py-3.5 px-4 font-semibold">Referred Society</th>
                  <th className="py-3.5 px-4 font-semibold">Code & Discount</th>
                  <th className="py-3.5 px-4 font-semibold">Payment Status</th>
                  <th className="py-3.5 px-4 font-semibold">Gift Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {data.referrals.map((item) => (
                  <tr key={item._id} className="hover:bg-surface-container-low/50 transition-colors">
                    {/* Referrer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-on-surface">{item.referrerUser?.name || "Unknown User"}</div>
                      <div className="text-xs text-on-surface-variant">
                        {item.referrerUser?.phone || item.referrerUser?.email}
                      </div>
                    </td>

                    {/* Society */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-on-surface">{item.referredSociety?.name || "N/A"}</div>
                      <div className="text-xs text-outline">{item.referredSociety?.city || "Registered Society"}</div>
                    </td>

                    {/* Code */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-container font-bold text-primary">
                        {item.referralCodeUsed}
                      </span>
                      <div className="text-xs text-emerald-600 font-medium mt-0.5">
                        ₹{item.discountAmountGiven} Discount
                      </div>
                    </td>

                    {/* Payment Status */}
                    <td className="py-3.5 px-4">
                      {item.status === "PAID" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Paid (Success)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-semibold">
                          <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                          Registered (Unpaid)
                        </span>
                      )}
                    </td>

                    {/* Gift Status */}
                    <td className="py-3.5 px-4">
                      {item.giftStatus === "PENDING_GIFT" ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-semibold shadow-sm animate-pulse">
                            🎁 Eligible - Pending Gift
                          </span>
                        </div>
                      ) : item.giftStatus === "GIFT_DISPATCHED" || item.giftStatus === "GIFT_DELIVERED" ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold">
                            <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                            Gift Dispatched
                          </span>
                          {item.giftDetails && (
                            <p className="text-[11px] text-on-surface-variant mt-0.5 truncate max-w-[180px]">
                              {item.giftDetails}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-outline">Awaiting Payment</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {item.status === "PAID" && (
                        <button
                          onClick={() => {
                            setSelectedReferral(item);
                            setGiftDetails(item.giftDetails || "");
                            setCourierNotes(item.courierOrTrackingNotes || "");
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            item.giftStatus === "PENDING_GIFT"
                              ? "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                              : "bg-surface-container-high text-on-surface hover:bg-surface-container"
                          }`}
                        >
                          {item.giftStatus === "PENDING_GIFT" ? "Fulfill Gift 🎁" : "Edit Gift Info"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispatch Gift Modal */}
      {selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span>🎁</span> Fulfill Gift for Referrer
              </h3>
              <button onClick={() => setSelectedReferral(null)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="bg-surface-container-low p-3 rounded-xl text-xs space-y-1">
              <p><span className="text-outline">Referrer:</span> <strong>{selectedReferral.referrerUser?.name}</strong> ({selectedReferral.referrerUser?.phone || selectedReferral.referrerUser?.email})</p>
              <p><span className="text-outline">Referred Society:</span> <strong>{selectedReferral.referredSociety?.name}</strong></p>
            </div>

            <form onSubmit={handleDispatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Gift Description / Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smartwatch / Amazon Gift Card ₹1,000"
                  value={giftDetails}
                  onChange={(e) => setGiftDetails(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Courier / Tracking / Delivery Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sent via DTDC AWB #987654 or Shared code on WhatsApp"
                  value={courierNotes}
                  onChange={(e) => setCourierNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReferral(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatchLoading}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {dispatchLoading ? "Saving..." : "Mark Gift Sent 🎁"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 className="text-lg font-bold text-on-surface">Global Referral Program Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">Discount Type</label>
                <select
                  value={settings.discountType}
                  onChange={(e) => setSettings({ ...settings, discountType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                >
                  <option value="FLAT">Flat Amount (₹)</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Discount Value ({settings.discountType === "PERCENTAGE" ? "%" : "₹"}) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={settings.discountValue}
                  onChange={(e) => setSettings({ ...settings, discountValue: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-outline-variant text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={settings.isReferralActive}
                  onChange={(e) => setSettings({ ...settings, isReferralActive: e.target.checked })}
                  className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <label htmlFor="activeCheck" className="text-xs font-medium text-on-surface">
                  Referral Program Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
                >
                  {settingsLoading ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
