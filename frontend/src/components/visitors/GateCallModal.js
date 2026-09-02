import { useState, useEffect } from "react";
import sound from "../../lib/sound";

const CATEGORY_META = {
  delivery: { label: "Delivery Driver", icon: "local_shipping", color: "bg-amber-500 text-white", border: "border-amber-400" },
  cab: { label: "Cab / Taxi", icon: "local_taxi", color: "bg-indigo-500 text-white", border: "border-indigo-400" },
  guest: { label: "Guest / Visitor", icon: "group", color: "bg-emerald-500 text-white", border: "border-emerald-400" },
  service: { label: "Service / Maintenance", icon: "handyman", color: "bg-cyan-500 text-white", border: "border-cyan-400" },
  other: { label: "Visitor", icon: "badge", color: "bg-slate-600 text-white", border: "border-slate-400" },
};

export default function GateCallModal({
  visitor,
  onApprove,
  onLeaveAtGate,
  onDeny,
  onClose,
  isResponding = false,
}) {
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [isSilenced, setIsSilenced] = useState(false);

  // Play continuous intercom ringtone on mount
  useEffect(() => {
    if (!isSilenced) {
      sound.playIntercomRing();
    }
    return () => {
      sound.stopIntercomRing();
    };
  }, [isSilenced]);

  // 45-second live countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          sound.stopIntercomRing();
          onClose?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  if (!visitor) return null;

  const meta = CATEGORY_META[visitor.visitorType] || CATEGORY_META.other;
  const progressPercent = Math.max(0, (secondsLeft / 45) * 100);

  const handleAction = async (actionType) => {
    sound.stopIntercomRing();
    if (actionType === "approved") {
      sound.playSuccess();
      await onApprove?.(visitor._id || visitor.id);
    } else if (actionType === "leave_at_gate") {
      sound.playSuccess();
      await onLeaveAtGate?.(visitor._id || visitor.id);
    } else if (actionType === "rejected") {
      sound.playAlert();
      await onDeny?.(visitor._id || visitor.id);
    }
  };

  const toggleSilence = () => {
    if (isSilenced) {
      setIsSilenced(false);
      sound.playIntercomRing();
    } else {
      setIsSilenced(true);
      sound.stopIntercomRing();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border-2 border-primary/40 bg-surface-container-lowest shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Pulsing Header */}
        <div className="relative bg-gradient-to-r from-primary to-primary-container px-6 py-4 text-on-primary flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs text-white">
              <span className="material-symbols-outlined text-[24px] animate-pulse">ring_volume</span>
              {/* Radar pulse rings */}
              <span className="absolute -inset-1 rounded-2xl border-2 border-white/40 animate-ping" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase opacity-90 block">
                Main Security Gate Intercom
              </span>
              <h3 className="text-title-md font-extrabold leading-tight">Incoming Gate Call</h3>
            </div>
          </div>

          {/* Quick Mute / Dismiss */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSilence}
              title={isSilenced ? "Unmute Ring" : "Silence Ring"}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isSilenced ? "volume_off" : "volume_up"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                sound.stopIntercomRing();
                onClose?.();
              }}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Live Timer Progress Bar */}
        <div className="h-1.5 w-full bg-surface-container-high overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              secondsLeft > 20
                ? "bg-emerald-500"
                : secondsLeft > 10
                ? "bg-amber-500"
                : "bg-error"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Visitor Card */}
          <div className="flex items-start gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low/70 p-4 shadow-xs">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${meta.color}`}>
              <span className="material-symbols-outlined text-[32px]">{meta.icon}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-block rounded-md bg-surface-container-highest px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-on-surface">
                  {meta.label}
                </span>
                <span className="text-[12px] font-bold text-outline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  {secondsLeft}s left
                </span>
              </div>

              <h4 className="text-title-lg font-black text-on-surface mt-1 truncate">
                {visitor.name}
              </h4>

              <p className="text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
                {visitor.company && <strong className="text-primary font-bold">{visitor.company}</strong>}
                {visitor.phone && <span>· {visitor.phone}</span>}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-container-lowest p-3.5 border border-outline-variant/40 text-body-sm shadow-inner">
            <div>
              <span className="text-[11px] font-bold uppercase text-outline">Destination House:</span>
              <p className="font-extrabold text-on-surface text-title-sm">
                House {visitor.unitId?.label || "Your Flat"}
              </p>
              {visitor.unitId?.block && (
                <span className="text-label-sm text-on-surface-variant">Block {visitor.unitId.block}</span>
              )}
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase text-outline">Vehicle Plate:</span>
              <p className="font-mono font-bold text-on-surface text-title-sm">
                {visitor.vehicleNumber || "No Vehicle"}
              </p>
              {visitor.isParcel && (
                <span className="inline-block rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2 mt-0.5">
                  📦 Has Package
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            {/* Primary Allow Entry Button */}
            <button
              type="button"
              disabled={isResponding}
              onClick={() => handleAction("approved")}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 px-6 py-4 text-title-md font-extrabold text-white shadow-lg hover:bg-emerald-700 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[24px]">check_circle</span>
              <span>{isResponding ? "Processing..." : "🟢 APPROVE & ALLOW ENTRY"}</span>
            </button>

            {/* Secondary Option: Leave at Gate (Great for Swiggy/Amazon deliveries) */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isResponding}
                onClick={() => handleAction("leave_at_gate")}
                className="flex items-center justify-center gap-2 rounded-2xl border border-sky-300 bg-sky-50 px-4 py-3 text-body-md font-bold text-sky-900 hover:bg-sky-100 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px] text-sky-700">inventory_2</span>
                <span>Leave at Gate</span>
              </button>

              <button
                type="button"
                disabled={isResponding}
                onClick={() => handleAction("rejected")}
                className="flex items-center justify-center gap-2 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-body-md font-bold text-error hover:bg-error/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">block</span>
                <span>Deny Entry</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
