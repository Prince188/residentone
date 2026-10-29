import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyReferralInfo } from "../../lib/referrals";

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: referralData, isLoading, refetch } = useQuery({
    queryKey: ["my-referrals"],
    queryFn: async () => {
      const res = await getMyReferralInfo();
      return res.data?.data || res.data || {};
    },
  });

  const referralCode = referralData?.referralCode || "REF-SOCIETY";
  const stats = referralData?.stats || {
    totalReferred: 0,
    registeredCount: 0,
    paidCount: 0,
    pendingGiftsCount: 0,
    dispatchedGiftsCount: 0,
  };
  const referrals = Array.isArray(referralData?.referrals) ? referralData.referrals : [];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const filteredReferrals = referrals.filter((item) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "paid") return item.status === "paid" || item.isSubscriptionPaid;
    if (statusFilter === "pending") return item.status !== "paid" && !item.isSubscriptionPaid;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-600 text-[28px]">card_giftcard</span>
            <h1 className="text-2xl font-bold text-on-surface">Refer & Earn Rewards 🎁</h1>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Invite neighboring society committee members to ResidentOne and earn exclusive rewards when they join.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh
        </button>
      </div>

      {/* Referral Code Share Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-800 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <span className="material-symbols-outlined text-[15px] text-amber-400">award_star</span>
              Official Referral Code
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Share ResidentOne with Societies
            </h2>
            <p className="text-xs text-purple-200 max-w-md">
              When a new society registers with your code and activates their subscription, you receive a guaranteed society welcome gift!
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-2 backdrop-blur-md border border-white/20">
              <span className="font-mono text-xl md:text-2xl font-extrabold tracking-widest px-4 text-amber-300">
                {referralCode}
              </span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-purple-900 hover:bg-purple-50 shadow-md transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? "check" : "content_copy"}
                </span>
                {copied ? "Copied!" : "Copy Code"}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-emerald-300 font-medium">
                Referral code copied to clipboard! Share it with your friends & committee contacts.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Societies Invited</span>
            <span className="material-symbols-outlined text-purple-600 bg-purple-50 p-2 rounded-xl text-[20px]">apartment</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-on-surface">{stats.totalReferred}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{stats.registeredCount} successfully registered</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Subscribed Societies</span>
            <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-2 rounded-xl text-[20px]">verified</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.paidCount}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Activated subscription</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Pending Gifts</span>
            <span className="material-symbols-outlined text-amber-600 bg-amber-50 p-2 rounded-xl text-[20px]">schedule</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{stats.pendingGiftsCount}</p>
          <p className="mt-1 text-xs text-on-surface-variant">In queue for dispatch</p>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Gifts Dispatched</span>
            <span className="material-symbols-outlined text-purple-600 bg-purple-50 p-2 rounded-xl text-[20px]">local_shipping</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-purple-700">{stats.dispatchedGiftsCount}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Delivered rewards</p>
        </div>
      </div>

      {/* Referrals List */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant bg-surface-container-low px-5 py-3.5 gap-2">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Referred Societies List</h3>
            <p className="text-xs text-on-surface-variant">Societies that signed up using your code</p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-surface p-1 border border-outline-variant text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1 transition-colors ${
                statusFilter === "all" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("paid")}
              className={`rounded-lg px-3 py-1 transition-colors ${
                statusFilter === "paid" ? "bg-emerald-700 text-white" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Subscribed
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`rounded-lg px-3 py-1 transition-colors ${
                statusFilter === "pending" ? "bg-amber-600 text-white" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Trial / Pending
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-on-surface-variant">Loading referral history...</div>
        ) : filteredReferrals.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[44px] text-outline">group_add</span>
            <h3 className="mt-2 text-base font-semibold text-on-surface">No referrals yet</h3>
            <p className="mt-1 text-sm">Share your referral code with other society committees to start earning gifts!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold uppercase text-on-surface-variant">
                <tr>
                  <th className="px-5 py-3.5">Society Name</th>
                  <th className="px-4 py-3.5">Admin / City</th>
                  <th className="px-4 py-3.5">Registered Date</th>
                  <th className="px-4 py-3.5">Subscription Status</th>
                  <th className="px-4 py-3.5 text-right">Gift Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredReferrals.map((r, idx) => {
                  const isPaid = r.status === "paid" || r.isSubscriptionPaid;
                  const giftStatus = r.giftStatus || (isPaid ? "Eligible" : "Pending Activation");

                  return (
                    <tr key={r._id || r.id || idx} className="hover:bg-surface-container-low/50">
                      <td className="px-5 py-4 font-bold text-on-surface">
                        {r.societyName || r.name || "Society"}
                      </td>

                      <td className="px-4 py-4 text-on-surface-variant">
                        {r.adminName || r.city || "—"}
                      </td>

                      <td className="px-4 py-4 text-on-surface-variant">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          <span className="material-symbols-outlined text-[13px]">
                            {isPaid ? "verified" : "schedule"}
                          </span>
                          {isPaid ? "Subscribed" : "Pending Subscription"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-purple-700 text-xs">
                          {giftStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
