import { useState, useEffect } from "react";
import { getMyReferralInfo } from "../../lib/referrals";

export default function MyReferralsModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getMyReferralInfo()
        .then((res) => {
          setData(res.data?.data || null);
        })
        .catch((err) => {
          console.error("Failed to load referral info:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const code = data?.referralCode || "";
  const stats = data?.stats || {
    totalReferred: 0,
    registeredCount: 0,
    paidCount: 0,
    pendingGiftsCount: 0,
    dispatchedGiftsCount: 0,
  };
  const referrals = data?.referrals || [];

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Use my referral code *${code}* when registering your society on ResidentOne to get exclusive discounts!`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-3xl">card_giftcard</span>
            <div>
              <h3 className="text-lg font-bold text-on-surface">Refer & Earn Gifts 🎁</h3>
              <p className="text-xs text-on-surface-variant">
                Invite societies to ResidentOne & earn gifts when they make their first subscription payment!
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-outline hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Important Info Callout */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-950">
          <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">info</span>
          <div>
            <p className="font-bold text-amber-900">Reward Policy</p>
            <p className="text-[11.5px] text-amber-800 leading-snug mt-0.5">
              Physical reward gifts are unlocked and dispatched <strong>only after</strong> your referred society completes their <strong>first subscription payment</strong>.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl animate-spin text-primary">progress_activity</span>
            <p className="text-sm">Fetching your referral code...</p>
          </div>
        ) : (
          <>
            {/* Referral Code Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Your Referral Code</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-700 text-emerald-100 font-semibold">
                  Active Code
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 bg-emerald-950/60 p-3 rounded-xl border border-emerald-700/50">
                <span className="font-mono text-xl font-bold tracking-widest text-emerald-300">{code}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant">
                <p className="text-[10px] uppercase text-outline font-semibold">Total Referred</p>
                <p className="text-xl font-bold text-on-surface mt-0.5">{stats.totalReferred}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] uppercase text-emerald-700 font-semibold">Paid Societies</p>
                <p className="text-xl font-bold text-emerald-900 mt-0.5">{stats.paidCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] uppercase text-amber-700 font-semibold">Gifts Earned 🎁</p>
                <p className="text-xl font-bold text-amber-900 mt-0.5">{stats.pendingGiftsCount + stats.dispatchedGiftsCount}</p>
              </div>
            </div>

            {/* Referral List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-outline">Your Referred Societies</h4>
              {referrals.length === 0 ? (
                <div className="p-6 text-center text-xs text-outline bg-surface-container-low rounded-xl border border-dashed border-outline-variant">
                  No societies registered with your code yet. Share your code to start earning gifts!
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {referrals.map((r) => (
                    <div
                      key={r._id}
                      className="p-3 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-on-surface">{r.referredSociety?.name || "Registered Society"}</p>
                        <p className="text-[11px] text-outline">{r.referredSociety?.city || "Awaiting activation"}</p>
                      </div>

                      <div className="text-right">
                        {r.status === "PAID" ? (
                          r.giftStatus === "GIFT_DISPATCHED" || r.giftStatus === "GIFT_DELIVERED" ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-semibold text-[10px]">
                              🎁 Gift Dispatched
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-semibold text-[10px]">
                              🎁 Gift Processing
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant font-semibold text-[10px]">
                            Pending Payment
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
