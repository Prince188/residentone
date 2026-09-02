import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { preApproveVisitor, extractApiError } from "../../lib/visitors";
import toast from "../../lib/toast";

const CATEGORIES = [
  { id: "guest", label: "Guest", icon: "group", desc: "Friends & Family" },
  { id: "delivery", label: "Delivery", icon: "local_shipping", desc: "Swiggy, Zomato, Amazon" },
  { id: "cab", label: "Cab / Taxi", icon: "local_taxi", desc: "Uber, Ola, Rapido" },
  { id: "service", label: "Service", icon: "handyman", desc: "Plumber, Electrician, Urban Co" },
  { id: "other", label: "Other", icon: "badge", desc: "General visitor" },
];

export default function PreApproveModal({ myHouses = [], activeSociety, onClose, onCreated }) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1); // 1 = Form, 2 = Pass Summary
  const [createdPass, setCreatedPass] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const initialUnitId = myHouses[0]?.id || myHouses[0]?._id || "";

  const [form, setForm] = useState({
    unitId: initialUnitId ? String(initialUnitId) : "",
    visitorType: "guest",
    name: "",
    phone: "",
    company: "",
    vehicleNumber: "",
    validityOption: "today", // 'today', '4hours', 'tomorrow', 'custom'
    validUntilDate: "",
    notes: "",
  });

  useEffect(() => {
    if (!form.unitId && myHouses.length > 0) {
      const firstId = myHouses[0].id || myHouses[0]._id;
      if (firstId) {
        setForm((prev) => ({ ...prev, unitId: String(firstId) }));
      }
    }
  }, [myHouses, form.unitId]);

  const preApproveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await preApproveVisitor(payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      toast.success("Visitor Pass Created!", `Entry PIN: ${data.passcode} for ${data.name}`);
      setCreatedPass(data);
      setStep(2);
      onCreated?.(data);
    },
    onError: (err) => {
      const msg = extractApiError(err, "Failed to pre-approve visitor.");
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const effectiveUnitId = form.unitId || myHouses[0]?.id || myHouses[0]?._id || "";

    if (!effectiveUnitId) {
      setErrorMsg("Please select an assigned house.");
      return;
    }
    if (!form.name.trim()) {
      setErrorMsg("Visitor name is required.");
      return;
    }
    if (!form.phone.trim()) {
      setErrorMsg("Visitor phone number is required.");
      return;
    }

    const now = new Date();
    let validUntil;
    if (form.validityOption === "4hours") {
      validUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    } else if (form.validityOption === "tomorrow") {
      validUntil = new Date(now);
      validUntil.setDate(validUntil.getDate() + 1);
      validUntil.setHours(23, 59, 59, 999);
    } else if (form.validityOption === "custom" && form.validUntilDate) {
      validUntil = new Date(form.validUntilDate);
    } else {
      // 'today' default: end of today
      validUntil = new Date(now);
      validUntil.setHours(23, 59, 59, 999);
    }

    const payload = {
      unitId: effectiveUnitId,
      visitorType: form.visitorType,
      name: form.name.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString(),
      notes: form.notes.trim(),
    };

    setErrorMsg("");
    preApproveMutation.mutate(payload);
  };

  const shareText = createdPass
    ? `🚪 *ResidentOne Gate Entry Pass*\n` +
      `🏢 Society: ${createdPass.societyId?.name || activeSociety?.name || "Society"}\n` +
      `🏠 House: ${createdPass.unitId?.label || "House"}\n` +
      `👤 Visitor: ${createdPass.name}\n` +
      `🔑 *Entry PIN: ${createdPass.passcode}*\n\n` +
      `Show this 6-digit PIN at the main security gate for direct entry.\n` +
      `📱 View Pass Ticket: ${window.location.origin}/visitor-pass/${createdPass._id || createdPass.id}`
    : "";

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const handleCopyText = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.info("Pass Details Copied!", "Copied visitor invitation & PIN to clipboard.");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const hasAssignedHouses = myHouses.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => !preApproveMutation.isPending && onClose()}
      />
      <div className="relative w-full max-w-lg rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
            <div>
              <h3 className="text-title-md font-bold text-on-surface">
                {step === 1 ? "Pre-Approve Visitor" : "Visitor Entry Pass Ready!"}
              </h3>
              <p className="text-label-sm text-on-surface-variant">
                {step === 1
                  ? "Generate a fast 6-digit gate entry PIN & WhatsApp pass"
                  : "Share this entry code with your visitor"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-body-sm text-error">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: FORM */}
        {step === 1 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selector */}
            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-2">
                Visitor Category
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setForm({ ...form, visitorType: cat.id })}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      form.visitorType === cat.id
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-[1.02]"
                        : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-primary/50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px] mb-1">{cat.icon}</span>
                    <span className="text-[12px] truncate w-full text-center">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Destination House Selector: ONLY User's Assigned Houses */}
            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-1.5">
                Your Destination House *
              </label>
              {myHouses.length > 1 ? (
                <select
                  value={form.unitId || myHouses[0]?.id || myHouses[0]?._id}
                  onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                  required
                  className="w-full rounded-2xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm font-bold text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {myHouses.map((h) => (
                    <option key={h.id || h._id} value={h.id || h._id}>
                      House {h.label} {h.block ? `(Block ${h.block})` : ""} {h.doorNo ? `· Door ${h.doorNo}` : ""}
                    </option>
                  ))}
                </select>
              ) : myHouses.length === 1 ? (
                <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="material-symbols-outlined text-primary text-[22px]">home</span>
                    <div className="min-w-0">
                      <p className="text-body-md font-extrabold text-on-surface truncate">
                        House {myHouses[0].label} {myHouses[0].block ? `· Block ${myHouses[0].block}` : ""}
                      </p>
                      <span className="text-[11px] font-bold text-primary uppercase">
                        Your Assigned Flat
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center text-amber-950 space-y-1">
                  <span className="material-symbols-outlined text-[30px] text-amber-600">domain_disabled</span>
                  <p className="text-body-sm font-bold">No House Assigned to You in this Society</p>
                  <p className="text-label-sm text-amber-800">
                    To pre-approve visitors, you must have an assigned flat/house in this society.
                  </p>
                </div>
              )}
            </div>

            {/* Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Visitor Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Visitor Phone *
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Company & Vehicle Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  {form.visitorType === "delivery"
                    ? "Delivery Service"
                    : form.visitorType === "cab"
                    ? "Cab Service"
                    : form.visitorType === "service"
                    ? "Company / Agency"
                    : "Company / Relation (Optional)"}
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder={
                    form.visitorType === "delivery"
                      ? "e.g. Swiggy, Zomato, Amazon"
                      : form.visitorType === "cab"
                      ? "e.g. Uber, Ola, Rapido"
                      : "e.g. Urban Company, Friend"
                  }
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Vehicle Number (Optional)
                </label>
                <input
                  type="text"
                  value={form.vehicleNumber}
                  onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. MH02AB1234"
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm font-mono uppercase text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Validity Options */}
            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-1.5">
                Pass Validity
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "today", label: "Today (All Day)" },
                  { id: "4hours", label: "Next 4 Hours" },
                  { id: "tomorrow", label: "Until Tomorrow" },
                  { id: "custom", label: "Custom Date" },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setForm({ ...form, validityOption: v.id })}
                    className={`py-2 px-2.5 rounded-xl border text-[12px] font-semibold transition-colors cursor-pointer text-center ${
                      form.validityOption === v.id
                        ? "border-primary bg-primary text-on-primary shadow-xs"
                        : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {form.validityOption === "custom" && (
                <div className="mt-2">
                  <input
                    type="datetime-local"
                    value={form.validUntilDate}
                    onChange={(e) => setForm({ ...form, validUntilDate: e.target.value })}
                    required
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2 px-3 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={onClose}
                disabled={preApproveMutation.isPending}
                className="rounded-xl border border-outline-variant px-4 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={preApproveMutation.isPending || !hasAssignedHouses}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {preApproveMutation.isPending ? "hourglass_top" : "check_circle"}
                </span>
                <span>{preApproveMutation.isPending ? "Generating Pass..." : "Generate Pass"}</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: GENERATED PASSCARD & SHARE */}
        {step === 2 && createdPass && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Visual Digital Pass Card */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-surface-container-low to-surface-container-lowest p-6 shadow-md text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-label-sm font-bold text-primary uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Pre-Approved Entry Pass
              </div>

              <h4 className="text-title-lg font-extrabold text-on-surface">{createdPass.name}</h4>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                Destination: <strong>House {createdPass.unitId?.label || "Unit"}</strong> · {activeSociety?.name}
              </p>

              {/* Giant Passcode Box */}
              <div className="my-5 rounded-2xl border-2 border-dashed border-primary/40 bg-surface-container-lowest p-4 shadow-inner">
                <span className="text-[11px] uppercase font-bold text-outline tracking-wider">
                  Gatekeeper Entry PIN
                </span>
                <p className="mt-1 font-mono text-[36px] font-extrabold tracking-[0.25em] text-primary">
                  {createdPass.passcode}
                </p>
                <p className="mt-1 text-label-sm text-on-surface-variant">
                  Visitor can show this 6-digit PIN at the main security gate.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left text-body-sm bg-surface-container-low/70 p-3 rounded-2xl border border-outline-variant/30">
                <div>
                  <span className="text-outline text-[11px] uppercase font-semibold">Category:</span>
                  <p className="font-bold capitalize text-on-surface">{createdPass.visitorType}</p>
                </div>
                <div>
                  <span className="text-outline text-[11px] uppercase font-semibold">Valid Until:</span>
                  <p className="font-bold text-on-surface">
                    {new Date(createdPass.validUntil).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-title-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">share</span>
                <span>Share Pass on WhatsApp</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copied ? "check" : "content_copy"}
                  </span>
                  <span>{copied ? "Copied!" : "Copy Details"}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-inverse-surface px-5 py-2.5 text-label-md font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
