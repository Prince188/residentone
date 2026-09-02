import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveSociety,
  selectActiveMembership,
} from "../../stores/society.store";
import {
  getVisitors,
  getVisitorStats,
  verifyPasscode,
  checkInVisitor,
  checkOutVisitor,
  logWalkInVisitor,
  extractApiError,
} from "../../lib/visitors";
import { getHouseCards } from "../../lib/houses";
import { getSocket } from "../../lib/socket";
import { hasPermission } from "../../lib/permissions";
import api from "../../lib/api";

const CATEGORIES = [
  { id: "guest", label: "Guest", icon: "group" },
  { id: "delivery", label: "Delivery", icon: "local_shipping" },
  { id: "cab", label: "Cab / Taxi", icon: "local_taxi" },
  { id: "service", label: "Service", icon: "handyman" },
  { id: "other", label: "Other", icon: "badge" },
];

export default function GateTerminalPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety?.id),
  });

  const canManageVisitors =
    activeMembership &&
    (hasPermission(activeMembership.role, "manage_visitors", permissionsQuery.data) ||
      ["super_admin", "society_admin", "security_guard", "manager"].includes(
        activeMembership.role
      ));

  const [activeTab, setActiveTab] = useState("passcode"); // 'passcode' | 'walkin' | 'inside'
  const [passcodeInput, setPasscodeInput] = useState("");
  const [verifiedPass, setVerifiedPass] = useState(null);
  const [verifyError, setVerifyError] = useState("");
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");

  // Walk-In Form State
  const [walkInForm, setWalkInForm] = useState({
    unitId: "",
    name: "",
    phone: "",
    visitorType: "delivery",
    company: "",
    vehicleNumber: "",
    isParcel: false,
    notes: "",
  });
  const [pendingWalkIn, setPendingWalkIn] = useState(null);
  const [walkInStatus, setWalkInStatus] = useState(null); // 'waiting' | 'approved' | 'rejected' | 'left_at_gate'

  // Query Houses for flat selector
  const housesQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety?.id),
  });
  const houses = housesQuery.data || [];

  // Query Visitors Inside
  const insideQuery = useQuery({
    queryKey: ["visitors", activeSociety?.id, "inside"],
    queryFn: async () => (await getVisitors({ status: "inside", limit: 50 })).data.data,
    enabled: Boolean(activeSociety?.id),
    refetchInterval: 10000,
  });
  const insideVisitors = insideQuery.data || [];

  // Query Stats
  const statsQuery = useQuery({
    queryKey: ["visitor-stats", activeSociety?.id],
    queryFn: async () => (await getVisitorStats()).data.data,
    enabled: Boolean(activeSociety?.id),
    refetchInterval: 15000,
  });
  const stats = statsQuery.data || { inside: 0, expected: 0, pending: 0, todayTotal: 0 };

  // Real-time socket listener for gate terminal
  useEffect(() => {
    if (!activeSociety?.id) return;
    const socket = getSocket(activeSociety.id);
    if (!socket) return;

    const handleApprovalResponse = (updatedVisitor) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });

      if (
        pendingWalkIn &&
        String(pendingWalkIn._id || pendingWalkIn.id) ===
          String(updatedVisitor._id || updatedVisitor.id)
      ) {
        setWalkInStatus(updatedVisitor.status);
        setPendingWalkIn(updatedVisitor);
      }
    };

    const handleNewPreApproved = () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    };

    socket.on("visitor:approval_response", handleApprovalResponse);
    socket.on("visitor:pre_approved", handleNewPreApproved);
    socket.on("visitor:change", handleApprovalResponse);

    return () => {
      socket.off("visitor:approval_response", handleApprovalResponse);
      socket.off("visitor:pre_approved", handleNewPreApproved);
      socket.off("visitor:change", handleApprovalResponse);
    };
  }, [activeSociety?.id, pendingWalkIn, queryClient]);

  // Mutation: Verify Passcode
  const verifyMutation = useMutation({
    mutationFn: async (code) => {
      const res = await verifyPasscode(code);
      return res.data.data;
    },
    onSuccess: (data) => {
      setVerifiedPass(data.visitor);
      setVerifyError("");
    },
    onError: (err) => {
      setVerifiedPass(null);
      setVerifyError(extractApiError(err, "Invalid or expired passcode"));
    },
  });

  // Mutation: Check In
  const checkInMutation = useMutation({
    mutationFn: async (visitorId) => {
      const res = await checkInVisitor(visitorId);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      setSuccessBanner(`Checked IN: ${data.name} for House ${data.unitId?.label || ""}`);
      setVerifiedPass(null);
      setPasscodeInput("");
      setPendingWalkIn(null);
      setWalkInStatus(null);
      setTimeout(() => setSuccessBanner(""), 4000);
    },
    onError: (err) => {
      setErrorBanner(extractApiError(err, "Failed to check in visitor"));
    },
  });

  // Mutation: Check Out
  const checkOutMutation = useMutation({
    mutationFn: async (visitorId) => {
      const res = await checkOutVisitor(visitorId);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      setSuccessBanner(`Checked OUT: ${data.name} departed`);
      setTimeout(() => setSuccessBanner(""), 3500);
    },
    onError: (err) => {
      setErrorBanner(extractApiError(err, "Failed to check out visitor"));
    },
  });

  // Mutation: Log Walk-In
  const walkInMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await logWalkInVisitor(payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      setPendingWalkIn(data);
      setWalkInStatus("waiting");
      setWalkInForm({
        unitId: "",
        name: "",
        phone: "",
        visitorType: "delivery",
        company: "",
        vehicleNumber: "",
        isParcel: false,
        notes: "",
      });
    },
    onError: (err) => {
      setErrorBanner(extractApiError(err, "Failed to send approval request"));
    },
  });

  const handleNumpadPress = (char) => {
    if (char === "clear") {
      setPasscodeInput("");
      setVerifiedPass(null);
      setVerifyError("");
      return;
    }
    if (char === "back") {
      setPasscodeInput((p) => p.slice(0, -1));
      return;
    }
    if (passcodeInput.length < 6) {
      const next = passcodeInput + char;
      setPasscodeInput(next);
      if (next.length === 6) {
        verifyMutation.mutate(next);
      }
    }
  };

  const handleWalkInSubmit = (e) => {
    e.preventDefault();
    if (!walkInForm.unitId) {
      setErrorBanner("Please select destination house.");
      return;
    }
    if (!walkInForm.name.trim()) {
      setErrorBanner("Visitor name is required.");
      return;
    }
    if (!walkInForm.phone.trim()) {
      setErrorBanner("Visitor phone number is required.");
      return;
    }
    setErrorBanner("");
    walkInMutation.mutate(walkInForm);
  };

  if (!canManageVisitors) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-sm space-y-4 my-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <span className="material-symbols-outlined text-[36px]">shield_lock</span>
        </div>
        <h2 className="text-title-lg font-bold text-on-surface">Security Guard Gate Terminal</h2>
        <p className="text-body-sm text-on-surface-variant">
          This terminal is restricted to on-duty Security Guards and Society Administrators.
        </p>
        <Link
          to="/visitors"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-label-md font-bold text-on-primary no-underline"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Go to Resident Visitor Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
        <div>
          <Link
            to="/visitors"
            className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary mb-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Resident Hub
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[24px]">shield</span>
            </div>
            <div>
              <h1 className="text-title-lg sm:text-headline-sm font-extrabold text-on-surface tracking-tight">
                Gatekeeper Security Terminal
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                {activeSociety?.name || "Society Gate"} · Fast PIN Verification & Walk-In Approval
              </p>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-2 text-center">
            <span className="text-[11px] font-bold uppercase text-outline">Inside Now</span>
            <p className="text-title-md font-extrabold text-emerald-600">{stats.inside}</p>
          </div>
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-2 text-center">
            <span className="text-[11px] font-bold uppercase text-outline">Expected Today</span>
            <p className="text-title-md font-extrabold text-primary">{stats.expected}</p>
          </div>
        </div>
      </div>

      {/* Notifications / Banners */}
      {successBanner && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-body-md font-bold text-emerald-900 shadow-sm animate-in fade-in">
          <span className="material-symbols-outlined text-[24px] text-emerald-600">check_circle</span>
          <span>{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="flex items-center gap-2 rounded-2xl border border-error/30 bg-error/5 p-4 text-body-md font-bold text-error shadow-sm animate-in fade-in">
          <span className="material-symbols-outlined text-[24px]">error</span>
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Mode Navigation Tabs */}
      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-surface-container-high p-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => {
            setActiveTab("passcode");
            setVerifiedPass(null);
            setVerifyError("");
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-label-md font-bold transition-all cursor-pointer ${
            activeTab === "passcode"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/40"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">pin</span>
          <span>6-Digit PIN Check-In</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("walkin")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-label-md font-bold transition-all cursor-pointer ${
            activeTab === "walkin"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/40"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>Walk-In Visitor Entry</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("inside")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-label-md font-bold transition-all cursor-pointer ${
            activeTab === "inside"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/40"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">sensor_door</span>
          <span>Inside Society ({stats.inside})</span>
        </button>
      </div>

      {/* MODE 1: 6-DIGIT PASSCODE KEYPAD & VERIFICATION */}
      {activeTab === "passcode" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Keypad */}
          <div className="lg:col-span-6 rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
            <h3 className="text-title-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">dialpad</span>
              Enter Visitor Passcode
            </h3>

            {/* Display Input */}
            <div className="relative">
              <input
                type="text"
                value={passcodeInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setPasscodeInput(val);
                  if (val.length === 6) verifyMutation.mutate(val);
                }}
                maxLength={6}
                placeholder="• • • • • •"
                className="w-full rounded-2xl border-2 border-outline-variant bg-surface py-4 text-center font-mono text-[32px] font-black tracking-[0.3em] text-primary focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 shadow-inner"
              />
              {passcodeInput && (
                <button
                  type="button"
                  onClick={() => handleNumpadPress("clear")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-error cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[24px]">cancel</span>
                </button>
              )}
            </div>

            {verifyError && (
              <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-center text-body-sm font-bold text-error">
                {verifyError}
              </div>
            )}

            {/* Touch Numpad Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpadPress(k)}
                  className={`h-14 rounded-2xl font-mono text-title-md font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                    k === "clear"
                      ? "border border-error/30 bg-error/10 text-error hover:bg-error/20"
                      : k === "back"
                      ? "border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                      : "border border-outline-variant/60 bg-surface-container-low text-on-surface text-[22px] hover:bg-primary/10 hover:border-primary"
                  }`}
                >
                  {k === "clear" ? "CLEAR" : k === "back" ? "⌫" : k}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Pass Result Card */}
          <div className="lg:col-span-6 space-y-4">
            {verifiedPass ? (
              <div className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-surface-container-lowest to-surface-container-low p-6 shadow-lg space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-label-sm font-bold text-white uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    Passcode Verified
                  </span>
                  <span className="font-mono text-title-md font-extrabold text-primary">
                    #{verifiedPass.passcode}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase text-outline">Visitor Details</span>
                  <h3 className="text-title-lg font-extrabold text-on-surface">{verifiedPass.name}</h3>
                  <p className="text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-primary capitalize">{verifiedPass.visitorType}</span>
                    {verifiedPass.company && <span>· {verifiedPass.company}</span>}
                    <span>· {verifiedPass.phone}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 border border-emerald-100 shadow-sm text-body-sm">
                  <div>
                    <span className="text-outline text-[11px] uppercase font-semibold">Destination:</span>
                    <p className="font-extrabold text-on-surface text-title-sm">
                      House {verifiedPass.unitId?.label || "—"}
                    </p>
                    {verifiedPass.unitId?.block && (
                      <p className="text-label-sm text-on-surface-variant">Block {verifiedPass.unitId.block}</p>
                    )}
                  </div>

                  <div>
                    <span className="text-outline text-[11px] uppercase font-semibold">Resident Host:</span>
                    <p className="font-bold text-on-surface truncate">{verifiedPass.hostUserId?.name || "Resident"}</p>
                    <p className="text-label-sm text-on-surface-variant">{verifiedPass.hostUserId?.phone || ""}</p>
                  </div>

                  <div>
                    <span className="text-outline text-[11px] uppercase font-semibold">Vehicle:</span>
                    <p className="font-mono font-bold text-on-surface">
                      {verifiedPass.vehicleNumber || "None"}
                    </p>
                  </div>

                  <div>
                    <span className="text-outline text-[11px] uppercase font-semibold">Valid Until:</span>
                    <p className="font-bold text-on-surface">
                      {new Date(verifiedPass.validUntil).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>

                {/* Big Allow Entry Button */}
                <button
                  type="button"
                  onClick={() => checkInMutation.mutate(verifiedPass._id || verifiedPass.id)}
                  disabled={checkInMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-title-md font-extrabold text-white shadow-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[24px]">door_open</span>
                  <span>{checkInMutation.isPending ? "Logging Entry..." : "ALLOW ENTRY & CHECK IN"}</span>
                </button>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-outline-variant/60 bg-surface-container-lowest p-10 text-center text-on-surface-variant space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-high text-outline">
                  <span className="material-symbols-outlined text-[32px]">dialpad</span>
                </div>
                <h4 className="text-title-md font-bold text-on-surface">Awaiting Passcode</h4>
                <p className="text-body-sm text-outline max-w-xs mx-auto">
                  Type the 6-digit visitor entry PIN on the keypad to view verification card and allow entry.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: WALK-IN VISITOR ENTRY */}
      {activeTab === "walkin" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Walk-In Form */}
          <div className="lg:col-span-7 rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-5">
            <h3 className="text-title-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person_add</span>
              Log Walk-In Visitor
            </h3>

            <form onSubmit={handleWalkInSubmit} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-2">
                  Visitor Type *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setWalkInForm({ ...walkInForm, visitorType: cat.id })}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        walkInForm.visitorType === cat.id
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-[1.02]"
                          : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-primary/50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px] mb-1">{cat.icon}</span>
                      <span className="text-[12px] truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Flat Selector */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Destination Flat / House *
                </label>
                <select
                  value={walkInForm.unitId}
                  onChange={(e) => setWalkInForm({ ...walkInForm, unitId: e.target.value })}
                  required
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">-- Select House --</option>
                  {houses.map((h) => (
                    <option key={h.id} value={h.id}>
                      House {h.label} {h.block ? `(Block ${h.block})` : ""} {h.owner ? `· ${h.owner.name}` : h.tenant ? `· ${h.tenant.name}` : "(Vacant)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-1">
                    Visitor Name *
                  </label>
                  <input
                    type="text"
                    value={walkInForm.name}
                    onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })}
                    required
                    placeholder="e.g. Suresh Kumar"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-1">
                    Visitor Phone *
                  </label>
                  <input
                    type="tel"
                    value={walkInForm.phone}
                    onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })}
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
                    Company / Service (Optional)
                  </label>
                  <input
                    type="text"
                    value={walkInForm.company}
                    onChange={(e) => setWalkInForm({ ...walkInForm, company: e.target.value })}
                    placeholder="e.g. Swiggy, Zomato, Uber, Amazon"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-1">
                    Vehicle Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={walkInForm.vehicleNumber}
                    onChange={(e) => setWalkInForm({ ...walkInForm, vehicleNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. MH02AB1234"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm font-mono uppercase text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Action */}
              <button
                type="submit"
                disabled={walkInMutation.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-title-sm font-bold text-on-primary shadow-md hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
                <span>{walkInMutation.isPending ? "Sending Request..." : "Send Real-Time Approval Request"}</span>
              </button>
            </form>
          </div>

          {/* Walk-In Live Status Card */}
          <div className="lg:col-span-5 space-y-4">
            {pendingWalkIn ? (
              <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-md space-y-5">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
                  <h4 className="text-title-md font-bold text-on-surface">Resident Approval Status</h4>
                  <span className="font-mono text-label-sm font-bold text-primary">#{pendingWalkIn.passcode}</span>
                </div>

                <div className="text-center py-4">
                  {walkInStatus === "waiting" && (
                    <div className="space-y-3">
                      <div className="inline-block h-14 w-14 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                      <h4 className="text-title-md font-bold text-amber-600">Awaiting Resident Decision</h4>
                      <p className="text-body-sm text-on-surface-variant">
                        Notification sent to resident of House <strong>{pendingWalkIn.unitId?.label}</strong>.
                      </p>
                    </div>
                  )}

                  {walkInStatus === "approved" && (
                    <div className="space-y-4 animate-in fade-in zoom-in-95">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                        <span className="material-symbols-outlined text-[36px]">check_circle</span>
                      </div>
                      <div>
                        <h4 className="text-title-lg font-extrabold text-emerald-700">Entry Approved!</h4>
                        <p className="text-body-sm text-on-surface-variant mt-0.5">
                          Resident approved entry for {pendingWalkIn.name}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => checkInMutation.mutate(pendingWalkIn._id || pendingWalkIn.id)}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-title-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">door_open</span>
                        <span>CHECK IN & OPEN GATE</span>
                      </button>
                    </div>
                  )}

                  {walkInStatus === "rejected" && (
                    <div className="space-y-3 animate-in fade-in zoom-in-95">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10 text-error">
                        <span className="material-symbols-outlined text-[36px]">block</span>
                      </div>
                      <h4 className="text-title-lg font-extrabold text-error">Entry Rejected</h4>
                      <p className="text-body-sm text-on-surface-variant">
                        Resident declined entry for this visitor. Please inform visitor.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingWalkIn(null);
                          setWalkInStatus(null);
                        }}
                        className="rounded-xl border border-outline-variant px-4 py-2 text-label-md font-bold text-on-surface hover:bg-surface-container-low cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {walkInStatus === "left_at_gate" && (
                    <div className="space-y-3 animate-in fade-in zoom-in-95">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                        <span className="material-symbols-outlined text-[36px]">package_2</span>
                      </div>
                      <h4 className="text-title-lg font-extrabold text-purple-700">Leave at Gate</h4>
                      <p className="text-body-sm text-on-surface-variant">
                        Resident requested parcel/package to be left with security desk.
                      </p>
                      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3 text-body-sm text-purple-900 font-mono font-bold">
                        Parcel Pickup Code: {pendingWalkIn.parcelDetails?.parcelCode || "LOGGED"}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingWalkIn(null);
                          setWalkInStatus(null);
                        }}
                        className="rounded-xl bg-inverse-surface px-5 py-2 text-label-md font-bold text-white cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-outline-variant/60 bg-surface-container-lowest p-10 text-center text-on-surface-variant space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container-high text-outline">
                  <span className="material-symbols-outlined text-[28px]">notifications_active</span>
                </div>
                <h4 className="text-title-md font-bold text-on-surface">No Active Walk-In Request</h4>
                <p className="text-body-sm text-outline max-w-xs mx-auto">
                  Fill the walk-in form on the left to send an instant approval alert to the resident.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: VISITORS CURRENTLY INSIDE */}
      {activeTab === "inside" && (
        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
            <div>
              <h3 className="text-title-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">sensor_door</span>
                Visitors Currently Inside Society ({insideVisitors.length})
              </h3>
              <p className="text-label-sm text-on-surface-variant">
                Live list of visitors on premises with check-in timestamp and 1-click checkout
              </p>
            </div>
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["visitors"] })}
              className="inline-flex items-center gap-1 text-label-sm font-semibold text-primary hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Refresh List
            </button>
          </div>

          {insideVisitors.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {insideVisitors.map((v) => (
                <div
                  key={v._id || v.id}
                  className="rounded-2xl border border-outline-variant/70 bg-surface-container-low p-4 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase text-emerald-800">
                          {v.visitorType}
                        </span>
                        {v.company && (
                          <span className="text-label-sm font-semibold text-primary truncate">
                            {v.company}
                          </span>
                        )}
                      </div>
                      <h4 className="text-body-md font-extrabold text-on-surface mt-1 truncate">
                        {v.name}
                      </h4>
                      <p className="text-label-sm text-outline">{v.phone}</p>
                    </div>

                    <span className="shrink-0 font-mono text-[12px] font-bold text-primary">
                      #{v.passcode}
                    </span>
                  </div>

                  <div className="border-t border-outline-variant/40 pt-2.5 text-body-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant text-[12px]">Destination:</span>
                      <span className="font-bold text-on-surface">House {v.unitId?.label || "—"}</span>
                    </div>
                    {v.vehicleNumber && (
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant text-[12px]">Vehicle:</span>
                        <span className="font-mono font-bold text-on-surface">{v.vehicleNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant text-[12px]">Checked In:</span>
                      <span className="text-on-surface font-semibold text-[12px]">
                        {v.checkInTime
                          ? new Date(v.checkInTime).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => checkOutMutation.mutate(v._id || v.id)}
                    disabled={checkOutMutation.isPending}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest py-2 text-label-md font-bold text-error hover:bg-error/5 hover:border-error transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Check Out Visitor</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px] text-outline/60 mb-1">
                sensor_door
              </span>
              <p className="text-body-md font-bold text-on-surface">No Visitors Currently Inside</p>
              <p className="text-label-sm text-outline mt-0.5">
                All visitor entries will appear here until they are checked out.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
