import { useState, useEffect, useMemo, useRef } from "react";
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
  getGateParcels,
  logGateParcel,
  verifyParcelPickupCode,
  collectGateParcel,
  extractApiError,
} from "../../lib/visitors";
import { getHouseCards } from "../../lib/houses";
import { getSocket } from "../../lib/socket";
import { hasPermission } from "../../lib/permissions";
import api from "../../lib/api";
import toast from "../../lib/toast";

const CATEGORIES = [
  { id: "guest", label: "Guest", icon: "group" },
  { id: "delivery", label: "Delivery", icon: "local_shipping" },
  { id: "cab", label: "Cab / Taxi", icon: "local_taxi" },
  { id: "service", label: "Service", icon: "handyman" },
  { id: "other", label: "Other", icon: "badge" },
];

const COURIER_PRESETS = [
  { id: "Amazon", label: "Amazon", color: "bg-amber-500/10 text-amber-700 border-amber-300" },
  { id: "Flipkart", label: "Flipkart", color: "bg-blue-500/10 text-blue-700 border-blue-300" },
  { id: "Swiggy", label: "Swiggy / Instamart", color: "bg-orange-500/10 text-orange-700 border-orange-300" },
  { id: "Zomato", label: "Zomato / Blinkit", color: "bg-rose-500/10 text-rose-700 border-rose-300" },
  { id: "Zepto", label: "Zepto", color: "bg-purple-500/10 text-purple-700 border-purple-300" },
  { id: "BlueDart", label: "BlueDart / DHL", color: "bg-cyan-500/10 text-cyan-700 border-cyan-300" },
  { id: "DTDC", label: "DTDC", color: "bg-emerald-500/10 text-emerald-700 border-emerald-300" },
  { id: "Other", label: "Other", color: "bg-surface-container-high text-on-surface border-outline-variant" },
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

  const [activeTab, setActiveTab] = useState("passcode"); // 'passcode' | 'walkin' | 'parcels' | 'inside'
  const [passcodeInput, setPasscodeInput] = useState("");
  const [verifiedPass, setVerifiedPass] = useState(null);
  const [verifyError, setVerifyError] = useState("");

  // Walk-In Form State (Defaults to 'guest')
  const [walkInForm, setWalkInForm] = useState({
    unitId: "",
    name: "",
    phone: "",
    visitorType: "guest",
    company: "",
    vehicleNumber: "",
    isParcel: false,
    notes: "",
  });
  const [pendingWalkIn, setPendingWalkIn] = useState(null);
  const [walkInStatus, setWalkInStatus] = useState(null); // 'waiting' | 'approved' | 'rejected' | 'left_at_gate'

  // House Autocomplete Search State
  const [houseSearchQuery, setHouseSearchQuery] = useState("");
  const [isHouseDropdownOpen, setIsHouseDropdownOpen] = useState(false);
  const houseDropdownRef = useRef(null);

  // Parcel Hub State
  const [isLogParcelModalOpen, setIsLogParcelModalOpen] = useState(false);
  const [parcelForm, setParcelForm] = useState({
    unitId: "",
    company: "Amazon",
    name: "Amazon Delivery",
    phone: "",
    packageCount: 1,
    notes: "",
  });
  const [parcelHouseSearch, setParcelHouseSearch] = useState("");
  const [isParcelHouseDropdownOpen, setIsParcelHouseDropdownOpen] = useState(false);
  const parcelHouseDropdownRef = useRef(null);

  const [parcelPickupInput, setParcelPickupInput] = useState("");
  const [verifiedParcel, setVerifiedParcel] = useState(null);
  const [parcelVerifyError, setParcelVerifyError] = useState("");
  const [parcelListSearch, setParcelListSearch] = useState("");

  // Close suggestion dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (houseDropdownRef.current && !houseDropdownRef.current.contains(e.target)) {
        setIsHouseDropdownOpen(false);
      }
      if (parcelHouseDropdownRef.current && !parcelHouseDropdownRef.current.contains(e.target)) {
        setIsParcelHouseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Query Houses for flat selector
  const housesQuery = useQuery({
    queryKey: ["house-cards", activeSociety?.id],
    queryFn: async () => (await getHouseCards()).data.data,
    enabled: Boolean(activeSociety?.id),
  });
  const houses = useMemo(() => housesQuery.data || [], [housesQuery.data]);

  // Filter houses by house number, block, doorNo, owner name/phone, tenant name/phone
  const filteredHouses = useMemo(() => {
    if (!houseSearchQuery.trim()) return houses.slice(0, 15);
    const q = houseSearchQuery.toLowerCase().trim();
    return houses.filter((h) => {
      const labelMatch = String(h.label || "").toLowerCase().includes(q);
      const doorMatch = String(h.doorNo || "").toLowerCase().includes(q);
      const blockMatch = String(h.block || "").toLowerCase().includes(q);
      const ownerNameMatch = String(h.owner?.name || "").toLowerCase().includes(q);
      const ownerPhoneMatch = String(h.owner?.phone || "").toLowerCase().includes(q);
      const tenantNameMatch = String(h.tenant?.name || "").toLowerCase().includes(q);
      const tenantPhoneMatch = String(h.tenant?.phone || "").toLowerCase().includes(q);
      return (
        labelMatch ||
        doorMatch ||
        blockMatch ||
        ownerNameMatch ||
        ownerPhoneMatch ||
        tenantNameMatch ||
        tenantPhoneMatch
      );
    });
  }, [houses, houseSearchQuery]);

  // Filter houses for parcel modal
  const filteredParcelHouses = useMemo(() => {
    if (!parcelHouseSearch.trim()) return houses.slice(0, 15);
    const q = parcelHouseSearch.toLowerCase().trim();
    return houses.filter((h) => {
      const labelMatch = String(h.label || "").toLowerCase().includes(q);
      const doorMatch = String(h.doorNo || "").toLowerCase().includes(q);
      const blockMatch = String(h.block || "").toLowerCase().includes(q);
      const ownerNameMatch = String(h.owner?.name || "").toLowerCase().includes(q);
      const ownerPhoneMatch = String(h.owner?.phone || "").toLowerCase().includes(q);
      const tenantNameMatch = String(h.tenant?.name || "").toLowerCase().includes(q);
      const tenantPhoneMatch = String(h.tenant?.phone || "").toLowerCase().includes(q);
      return (
        labelMatch ||
        doorMatch ||
        blockMatch ||
        ownerNameMatch ||
        ownerPhoneMatch ||
        tenantNameMatch ||
        tenantPhoneMatch
      );
    });
  }, [houses, parcelHouseSearch]);

  // Selected house details for walk-in
  const selectedHouse = useMemo(() => {
    if (!walkInForm.unitId) return null;
    return houses.find((h) => String(h.id || h._id) === String(walkInForm.unitId));
  }, [houses, walkInForm.unitId]);

  // Selected house details for parcel
  const selectedParcelHouse = useMemo(() => {
    if (!parcelForm.unitId) return null;
    return houses.find((h) => String(h.id || h._id) === String(parcelForm.unitId));
  }, [houses, parcelForm.unitId]);

  // Query Visitors Inside
  const insideQuery = useQuery({
    queryKey: ["visitors", activeSociety?.id, "inside"],
    queryFn: async () => (await getVisitors({ status: "inside", limit: 50 })).data.data,
    enabled: Boolean(activeSociety?.id),
    refetchInterval: 10000,
  });
  const insideVisitors = insideQuery.data || [];

  // Query Gate Parcels (Uncollected at Gate)
  const parcelsQuery = useQuery({
    queryKey: ["gate-parcels", activeSociety?.id],
    queryFn: async () => (await getGateParcels({ status: "left_at_gate" })).data.data,
    enabled: Boolean(activeSociety?.id),
    refetchInterval: 8000,
  });
  const gateParcels = useMemo(() => parcelsQuery.data || [], [parcelsQuery.data]);

  // Filtered parcels for list search
  const filteredParcels = useMemo(() => {
    if (!parcelListSearch.trim()) return gateParcels;
    const q = parcelListSearch.toLowerCase().trim();
    return gateParcels.filter((p) => {
      const houseMatch = String(p.unitId?.label || "").toLowerCase().includes(q);
      const blockMatch = String(p.unitId?.block || "").toLowerCase().includes(q);
      const companyMatch = String(p.company || "").toLowerCase().includes(q);
      const hostNameMatch = String(p.hostUserId?.name || "").toLowerCase().includes(q);
      const pinMatch = String(p.parcelDetails?.parcelCode || p.passcode || "").includes(q);
      return houseMatch || blockMatch || companyMatch || hostNameMatch || pinMatch;
    });
  }, [gateParcels, parcelListSearch]);

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
      queryClient.invalidateQueries({ queryKey: ["gate-parcels"] });

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

    const handleParcelChange = () => {
      queryClient.invalidateQueries({ queryKey: ["gate-parcels"] });
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    };

    socket.on("visitor:approval_response", handleApprovalResponse);
    socket.on("visitor:pre_approved", handleNewPreApproved);
    socket.on("visitor:change", handleApprovalResponse);
    socket.on("parcel:new", handleParcelChange);
    socket.on("parcel:collected", handleParcelChange);
    socket.on("parcel:change", handleParcelChange);

    return () => {
      socket.off("visitor:approval_response", handleApprovalResponse);
      socket.off("visitor:pre_approved", handleNewPreApproved);
      socket.off("visitor:change", handleApprovalResponse);
      socket.off("parcel:new", handleParcelChange);
      socket.off("parcel:collected", handleParcelChange);
      socket.off("parcel:change", handleParcelChange);
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
      toast.success(`Checked IN: ${data.name}`, `Heading to House ${data.unitId?.label || ""}`);
      setVerifiedPass(null);
      setPasscodeInput("");
      setPendingWalkIn(null);
      setWalkInStatus(null);
    },
    onError: (err) => {
      toast.error(extractApiError(err, "Failed to check in visitor"));
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
      toast.success(`Checked OUT: ${data.name}`, "Visitor departure logged");
      setVerifiedPass(null);
      setPasscodeInput("");
    },
    onError: (err) => {
      toast.error(extractApiError(err, "Failed to check out visitor"));
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
      toast.info(`Approval Sent for ${data.name}`, "Waiting for host resident approval");
      setPendingWalkIn(data);
      setWalkInStatus("waiting");
      setHouseSearchQuery("");
      setIsHouseDropdownOpen(false);
      setWalkInForm({
        unitId: "",
        name: "",
        phone: "",
        visitorType: "guest",
        company: "",
        vehicleNumber: "",
        isParcel: false,
        notes: "",
      });
    },
    onError: (err) => {
      toast.error(extractApiError(err, "Failed to send approval request"));
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

  // Mutation: Log Parcel
  const logParcelMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await logGateParcel(payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["gate-parcels"] });
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-stats"] });
      toast.success(
        `📦 Package Logged: ${data.company || "Delivery"}`,
        `Pickup PIN: ${data.parcelDetails?.parcelCode || data.passcode} · House ${data.unitId?.label || ""}`
      );
      setIsLogParcelModalOpen(false);
      setParcelForm({
        unitId: "",
        company: "Amazon",
        name: "Amazon Delivery",
        phone: "",
        packageCount: 1,
        notes: "",
      });
      setParcelHouseSearch("");
    },
    onError: (err) => {
      toast.error(extractApiError(err, "Failed to log parcel delivery"));
    },
  });

  // Mutation: Verify Parcel Pickup PIN
  const verifyParcelPickupMutation = useMutation({
    mutationFn: async (code) => {
      const res = await verifyParcelPickupCode(code);
      return res.data.data;
    },
    onSuccess: (data) => {
      setVerifiedParcel(data);
      setParcelVerifyError("");
      toast.info(`Parcel Found: House ${data.unitId?.label}`, "Ready for handover");
    },
    onError: (err) => {
      setVerifiedParcel(null);
      setParcelVerifyError(extractApiError(err, "Invalid 4-digit pickup PIN"));
    },
  });

  // Mutation: Collect / Hand Over Parcel
  const collectParcelMutation = useMutation({
    mutationFn: async (parcelId) => {
      const res = await collectGateParcel(parcelId);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["gate-parcels"] });
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      toast.success(`Handed Over: ${data.company || "Parcel"}`, `Collected for House ${data.unitId?.label}`);
      setVerifiedParcel(null);
      setParcelPickupInput("");
    },
    onError: (err) => {
      toast.error(extractApiError(err, "Failed to hand over parcel"));
    },
  });

  const handleParcelNumpadPress = (char) => {
    if (char === "clear") {
      setParcelPickupInput("");
      setVerifiedParcel(null);
      setParcelVerifyError("");
      return;
    }
    if (char === "back") {
      setParcelPickupInput((p) => p.slice(0, -1));
      return;
    }
    if (parcelPickupInput.length < 4) {
      const next = parcelPickupInput + char;
      setParcelPickupInput(next);
      if (next.length === 4) {
        verifyParcelPickupMutation.mutate(next);
      }
    }
  };

  const handleLogParcelSubmit = (e) => {
    e.preventDefault();
    if (!parcelForm.unitId) {
      toast.error("Please select destination house for the package.");
      return;
    }
    logParcelMutation.mutate(parcelForm);
  };

  const handleWalkInSubmit = (e) => {
    e.preventDefault();
    if (!walkInForm.unitId) {
      toast.error("Please select destination house.");
      return;
    }
    if (!walkInForm.name.trim()) {
      toast.error("Visitor name is required.");
      return;
    }
    if (!walkInForm.phone.trim()) {
      toast.error("Visitor phone number is required.");
      return;
    }
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

      {/* Mode Navigation Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 rounded-2xl bg-surface-container-high p-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => {
            setActiveTab("passcode");
            setVerifiedPass(null);
            setVerifyError("");
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 text-label-md font-bold transition-all cursor-pointer ${
            activeTab === "passcode"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/40"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">pin</span>
          <span className="truncate">6-Digit PIN</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("walkin")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 text-label-md font-bold transition-all cursor-pointer ${
            activeTab === "walkin"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/40"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span className="truncate">Walk-In Entry</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("parcels");
            setVerifiedParcel(null);
            setParcelVerifyError("");
          }}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 text-label-md font-bold transition-all cursor-pointer relative ${
            activeTab === "parcels"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/40"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">package_2</span>
          <span className="truncate">Gate Parcels ({gateParcels.length})</span>
          {gateParcels.length > 0 && activeTab !== "parcels" && (
            <span className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-surface animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("inside")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-2 text-label-md font-bold transition-all cursor-pointer ${
            activeTab === "inside"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/40"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">sensor_door</span>
          <span className="truncate">Inside ({stats.inside})</span>
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
            {verifiedPass ? (() => {
              const isInside = verifiedPass.status === "inside";
              const isApproved = verifiedPass.status === "approved";
              const isCheckedOut = verifiedPass.status === "checked_out";
              const isPending = verifiedPass.status === "pending_approval";

              return (
                <div
                  className={`rounded-3xl border-2 p-6 shadow-lg space-y-5 animate-in fade-in zoom-in-95 duration-200 ${
                    isInside
                      ? "border-sky-500 bg-gradient-to-br from-sky-50 via-surface-container-lowest to-surface-container-low"
                      : isApproved
                      ? "border-emerald-500 bg-gradient-to-br from-emerald-50 via-surface-container-lowest to-surface-container-low"
                      : isCheckedOut
                      ? "border-outline-variant bg-surface-container-low"
                      : isPending
                      ? "border-amber-400 bg-amber-50/50"
                      : "border-error/40 bg-error/5"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm font-bold uppercase tracking-wider ${
                        isInside
                          ? "bg-sky-600 text-white"
                          : isApproved
                          ? "bg-emerald-600 text-white"
                          : isCheckedOut
                          ? "bg-slate-700 text-white"
                          : isPending
                          ? "bg-amber-500 text-white"
                          : "bg-error text-white"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isInside
                          ? "sensor_door"
                          : isApproved
                          ? "verified"
                          : isCheckedOut
                          ? "logout"
                          : isPending
                          ? "pending"
                          : "cancel"}
                      </span>
                      <span>
                        {isInside
                          ? "Already Inside Society"
                          : isApproved
                          ? "Pass Verified · Ready"
                          : isCheckedOut
                          ? "Already Checked Out"
                          : isPending
                          ? "Awaiting Resident Approval"
                          : "Entry Denied"}
                      </span>
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

                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 border border-outline-variant/50 shadow-sm text-body-sm">
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
                      <span className="text-outline text-[11px] uppercase font-semibold">
                        {isInside ? "Checked In At:" : isCheckedOut ? "Checked Out At:" : "Valid Until:"}
                      </span>
                      <p className="font-bold text-on-surface">
                        {isInside && verifiedPass.checkInTime
                          ? new Date(verifiedPass.checkInTime).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : isCheckedOut && verifiedPass.checkOutTime
                          ? new Date(verifiedPass.checkOutTime).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : new Date(verifiedPass.validUntil).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                      </p>
                    </div>
                  </div>

                  {/* Contextual Action Buttons */}
                  {isInside ? (
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-sky-300 bg-sky-100/60 p-3 text-body-sm text-sky-950 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sky-700 text-[20px]">info</span>
                        <span>This visitor is already inside the premises. Tap below to log departure.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => checkOutMutation.mutate(verifiedPass._id || verifiedPass.id)}
                        disabled={checkOutMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-sky-700 px-6 py-4 text-title-md font-extrabold text-white shadow-lg hover:bg-sky-800 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[24px]">logout</span>
                        <span>{checkOutMutation.isPending ? "Logging Exit..." : "CHECK OUT VISITOR (LOG EXIT)"}</span>
                      </button>
                    </div>
                  ) : isApproved ? (
                    <button
                      type="button"
                      onClick={() => checkInMutation.mutate(verifiedPass._id || verifiedPass.id)}
                      disabled={checkInMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-title-md font-extrabold text-white shadow-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[24px]">door_open</span>
                      <span>{checkInMutation.isPending ? "Logging Entry..." : "ALLOW ENTRY & CHECK IN"}</span>
                    </button>
                  ) : isCheckedOut ? (
                    <div className="rounded-2xl border border-outline-variant bg-surface-container-high p-4 text-center text-body-sm text-on-surface-variant">
                      <p className="font-bold text-on-surface">Pass Expired / Completed</p>
                      <p className="text-[12px] text-outline mt-0.5">This pass has already been used and checked out.</p>
                    </div>
                  ) : isPending ? (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center text-body-sm text-amber-900">
                      <p className="font-bold">Pending Host Approval</p>
                      <p className="text-[12px] text-amber-800 mt-0.5">The resident has not yet confirmed entry for this walk-in.</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-error/30 bg-error/5 p-4 text-center text-body-sm text-error">
                      <p className="font-bold">Entry Denied</p>
                      <p className="text-[12px] mt-0.5">This visitor was rejected by the resident host.</p>
                    </div>
                  )}
                </div>
              );
            })() : (
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

              {/* Destination Flat Autocomplete Search */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-label-md font-semibold text-on-surface">
                    Destination Flat / House *
                  </label>
                  {walkInForm.unitId && (
                    <span className="text-[11px] font-extrabold text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      House Selected
                    </span>
                  )}
                </div>

                {selectedHouse ? (
                  /* Selected House Card */
                  <div className="flex items-center justify-between p-3 rounded-2xl border-2 border-primary/50 bg-primary/5 shadow-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary font-black text-title-sm shadow-xs">
                        {selectedHouse.label}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-on-surface text-body-md">
                            House {selectedHouse.label}
                          </span>
                          {selectedHouse.block && (
                            <span className="text-[10px] font-bold text-outline bg-surface-container-high px-1.5 py-0.5 rounded">
                              Block {selectedHouse.block}
                            </span>
                          )}
                        </div>
                        <p className="text-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5 truncate">
                          <span className="material-symbols-outlined text-[14px] text-primary">person</span>
                          <span>
                            {selectedHouse.owner?.name ? (
                              <><strong>{selectedHouse.owner.name}</strong> (Owner)</>
                            ) : selectedHouse.tenant?.name ? (
                              <><strong>{selectedHouse.tenant.name}</strong> (Tenant)</>
                            ) : (
                              <span className="text-outline italic">Vacant</span>
                            )}
                          </span>
                          {(selectedHouse.owner?.phone || selectedHouse.tenant?.phone) && (
                            <span className="text-outline font-mono text-[11px]">
                              · {selectedHouse.owner?.phone || selectedHouse.tenant?.phone}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setWalkInForm({ ...walkInForm, unitId: "" });
                        setHouseSearchQuery("");
                        setIsHouseDropdownOpen(true);
                      }}
                      className="shrink-0 px-3 py-1.5 text-label-sm font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer flex items-center gap-1 border border-primary/20"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      <span>Change</span>
                    </button>
                  </div>
                ) : (
                  /* Search Input & Dropdown Suggestions */
                  <div className="relative" ref={houseDropdownRef}>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-outline pointer-events-none">
                        search
                      </span>
                      <input
                        type="text"
                        value={houseSearchQuery}
                        onChange={(e) => {
                          setHouseSearchQuery(e.target.value);
                          setIsHouseDropdownOpen(true);
                        }}
                        onFocus={() => setIsHouseDropdownOpen(true)}
                        placeholder="Type house number (e.g. 101, A-202) or resident name..."
                        className="w-full rounded-2xl border border-outline-variant bg-surface py-2.5 pl-10 pr-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                      />
                      {houseSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setHouseSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-outline hover:text-on-surface rounded-full cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>

                    {isHouseDropdownOpen && (
                      <div className="absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl divide-y divide-outline-variant/40 animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-2.5 bg-surface-container-low text-[11px] font-bold text-outline uppercase tracking-wider flex items-center justify-between">
                          <span>Select House / Resident ({filteredHouses.length} matches)</span>
                          <span className="text-[10px] text-primary">Tap to select</span>
                        </div>

                        {filteredHouses.length === 0 ? (
                          <div className="p-5 text-center text-on-surface-variant text-body-sm">
                            <span className="material-symbols-outlined text-[28px] text-outline/60 mb-1 block">
                              search_off
                            </span>
                            No house or resident matching "{houseSearchQuery}"
                          </div>
                        ) : (
                          filteredHouses.map((h) => {
                            const residentName = h.owner?.name || h.tenant?.name || "Vacant House";
                            const residentRole = h.owner?.name ? "Owner" : h.tenant?.name ? "Tenant" : "";
                            const residentPhone = h.owner?.phone || h.tenant?.phone || "";

                            return (
                              <button
                                key={h.id || h._id}
                                type="button"
                                onClick={() => {
                                  setWalkInForm({ ...walkInForm, unitId: h.id || h._id });
                                  setIsHouseDropdownOpen(false);
                                  setHouseSearchQuery("");
                                }}
                                className="w-full text-left p-3 hover:bg-primary/5 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-body-sm group-hover:bg-primary group-hover:text-on-primary transition-colors shadow-xs">
                                    {h.label}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-on-surface text-body-sm block truncate">
                                        House {h.label}
                                      </span>
                                      {h.block && (
                                        <span className="text-[10px] font-bold text-outline bg-surface-container-high px-1 rounded">
                                          Block {h.block}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[12px] text-on-surface-variant block truncate mt-0.5">
                                      👤 {residentName} {residentRole ? `· ${residentRole}` : ""} {residentPhone ? `· ${residentPhone}` : ""}
                                    </span>
                                  </div>
                                </div>
                                <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary transition-colors shrink-0">
                                  check
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
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

      {/* MODE 4: GATE PARCEL & COURIER HUB */}
      {activeTab === "parcels" && (
        <div className="space-y-6">
          {/* Action & Stats Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-surface-container-lowest to-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-[28px]">package_2</span>
              </div>
              <div>
                <h3 className="text-title-lg font-extrabold text-on-surface">
                  Gate Delivery & Parcel Hub
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  {gateParcels.length} package(s) currently held at the main gate security desk
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsLogParcelModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-label-md font-bold text-on-primary shadow-md hover:bg-primary/90 transition-all cursor-pointer scale-100 hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined text-[20px]">add_box</span>
              <span>Log Dropped Package</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            {/* Left Column: 4-Digit Pickup PIN Verification Keypad */}
            <div className="lg:col-span-5 rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-title-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">dialpad</span>
                  Handover Parcel by PIN
                </h3>
                <span className="text-[11px] font-bold text-outline uppercase bg-surface-container-high px-2 py-0.5 rounded-full">
                  4-Digit Code
                </span>
              </div>
              <p className="text-body-xs text-on-surface-variant">
                Enter the 4-digit pickup code shown on resident's screen to release package.
              </p>

              {/* PIN Display */}
              <div className="relative">
                <input
                  type="text"
                  value={parcelPickupInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setParcelPickupInput(val);
                    if (val.length === 4) verifyParcelPickupMutation.mutate(val);
                  }}
                  maxLength={4}
                  placeholder="• • • •"
                  className="w-full rounded-2xl border-2 border-outline-variant bg-surface py-3.5 text-center font-mono text-[28px] font-black tracking-[0.4em] text-primary focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 shadow-inner"
                />
                {parcelPickupInput && (
                  <button
                    type="button"
                    onClick={() => handleParcelNumpadPress("clear")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-error cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[22px]">cancel</span>
                  </button>
                )}
              </div>

              {parcelVerifyError && (
                <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-center text-body-sm font-bold text-error">
                  {parcelVerifyError}
                </div>
              )}

              {/* Touch Numpad Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleParcelNumpadPress(k)}
                    className={`flex h-12 items-center justify-center rounded-xl text-title-sm font-bold transition-all active:scale-95 cursor-pointer ${
                      k === "clear"
                        ? "bg-surface-container-highest text-error font-semibold text-label-md"
                        : k === "back"
                        ? "bg-surface-container-highest text-on-surface"
                        : "bg-surface-container-low text-on-surface hover:bg-surface-container-high border border-outline-variant/50"
                    }`}
                  >
                    {k === "back" ? (
                      <span className="material-symbols-outlined text-[20px]">backspace</span>
                    ) : k === "clear" ? (
                      "Clear"
                    ) : (
                      k
                    )}
                  </button>
                ))}
              </div>

              {/* Verified Parcel Handover Card */}
              {verifiedParcel && (
                <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-500/5 p-4 shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-150 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Code Verified
                    </span>
                    <span className="font-mono text-title-sm font-black text-primary">
                      PIN: {verifiedParcel.parcelDetails?.parcelCode || verifiedParcel.passcode}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary font-black text-title-md shadow-xs">
                      {verifiedParcel.unitId?.label}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-on-surface text-body-md">
                        House {verifiedParcel.unitId?.label} {verifiedParcel.unitId?.block ? `(Block ${verifiedParcel.unitId.block})` : ""}
                      </h4>
                      <p className="text-label-sm text-on-surface-variant truncate">
                        Resident: <strong>{verifiedParcel.hostUserId?.name || "Resident"}</strong>
                      </p>
                      <p className="text-label-xs text-outline mt-0.5">
                        Courier: <strong>{verifiedParcel.company || "Delivery"}</strong> · {verifiedParcel.notes || "1 package"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => collectParcelMutation.mutate(verifiedParcel._id || verifiedParcel.id)}
                    disabled={collectParcelMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-label-md font-extrabold text-white shadow-md hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                    <span>{collectParcelMutation.isPending ? "HANDING OVER..." : "HAND OVER PARCEL (CONFIRM)"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Live Parcels Waiting at Gate List */}
            <div className="lg:col-span-7 rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
                <div>
                  <h3 className="text-title-md font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">inventory_2</span>
                    Packages Waiting at Gate ({gateParcels.length})
                  </h3>
                  <p className="text-label-sm text-on-surface-variant">
                    Packages ready for resident pickup
                  </p>
                </div>

                {/* Quick Search */}
                <div className="relative w-full sm:w-56">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={parcelListSearch}
                    onChange={(e) => setParcelListSearch(e.target.value)}
                    placeholder="Search flat, courier, PIN..."
                    className="w-full rounded-xl border border-outline-variant bg-surface py-1.5 pl-8 pr-2.5 text-[12px] text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {filteredParcels.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {filteredParcels.map((p) => {
                    const pin = p.parcelDetails?.parcelCode || p.passcode || "—";
                    return (
                      <div
                        key={p._id || p.id}
                        className="rounded-2xl border border-outline-variant/80 bg-surface-container-low p-4 shadow-xs space-y-3 flex flex-col justify-between hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary font-black text-body-md shadow-xs">
                              {p.unitId?.label}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-on-surface text-body-md truncate">
                                House {p.unitId?.label}
                              </h4>
                              <p className="text-label-xs text-on-surface-variant truncate">
                                👤 {p.hostUserId?.name || "Resident"}
                              </p>
                            </div>
                          </div>

                          <span className="rounded-lg bg-surface-container-highest px-2 py-1 font-mono text-[11px] font-black text-primary border border-primary/20 shrink-0">
                            PIN: {pin}
                          </span>
                        </div>

                        <div className="rounded-xl bg-surface-container-lowest p-2.5 text-[12px] space-y-1 border border-outline-variant/40">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-on-surface flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px] text-primary">local_shipping</span>
                              {p.company || "Delivery"}
                            </span>
                            <span className="text-outline text-[11px]">
                              {p.createdAt
                                ? new Date(p.createdAt).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })
                                : "—"}
                            </span>
                          </div>
                          {p.notes && (
                            <p className="text-on-surface-variant text-[11px] truncate italic">
                              {p.notes}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => collectParcelMutation.mutate(p._id || p.id)}
                          disabled={collectParcelMutation.isPending}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 py-2 text-label-sm font-bold text-primary hover:bg-primary hover:text-on-primary transition-all cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                          <span>Hand Over (Release)</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-outline-variant p-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px] text-outline/60 mb-1 block">
                    inventory_2
                  </span>
                  <p className="text-body-md font-bold text-on-surface">No Waiting Packages</p>
                  <p className="text-label-sm text-outline mt-0.5">
                    When delivery packages are left at the gate, they will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG DROPPED PARCEL */}
      {isLogParcelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[22px]">add_box</span>
                </div>
                <div>
                  <h3 className="text-title-md font-bold text-on-surface">Log Dropped Package</h3>
                  <p className="text-label-sm text-on-surface-variant">
                    Security Gate Desk Parcel Intake
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogParcelModalOpen(false)}
                className="p-1 rounded-full text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleLogParcelSubmit} className="space-y-4">
              {/* Destination House Search */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Destination Flat / House *
                </label>
                {selectedParcelHouse ? (
                  <div className="flex items-center justify-between p-3 rounded-2xl border-2 border-primary/50 bg-primary/5 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary font-black text-body-md shadow-xs">
                        {selectedParcelHouse.label}
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold text-on-surface text-body-sm block truncate">
                          House {selectedParcelHouse.label} {selectedParcelHouse.block ? `(Block ${selectedParcelHouse.block})` : ""}
                        </span>
                        <span className="text-[12px] text-on-surface-variant block truncate">
                          👤 {selectedParcelHouse.owner?.name || selectedParcelHouse.tenant?.name || "Resident"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setParcelForm({ ...parcelForm, unitId: "" });
                        setParcelHouseSearch("");
                        setIsParcelHouseDropdownOpen(true);
                      }}
                      className="px-2.5 py-1 text-label-xs font-bold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative" ref={parcelHouseDropdownRef}>
                    <input
                      type="text"
                      value={parcelHouseSearch}
                      onChange={(e) => {
                        setParcelHouseSearch(e.target.value);
                        setIsParcelHouseDropdownOpen(true);
                      }}
                      onFocus={() => setIsParcelHouseDropdownOpen(true)}
                      placeholder="Type house number (e.g. 101, A-204) or resident name..."
                      className="w-full rounded-2xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />

                    {isParcelHouseDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl divide-y divide-outline-variant/40">
                        {filteredParcelHouses.map((h) => (
                          <button
                            key={h.id || h._id}
                            type="button"
                            onClick={() => {
                              setParcelForm({ ...parcelForm, unitId: h.id || h._id });
                              setIsParcelHouseDropdownOpen(false);
                              setParcelHouseSearch("");
                            }}
                            className="w-full text-left p-2.5 hover:bg-primary/5 flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-bold text-on-surface text-body-sm">
                              House {h.label} {h.block ? `(${h.block})` : ""} · {h.owner?.name || h.tenant?.name || "Resident"}
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-outline">check</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Courier Company Preset Badges */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1.5">
                  Courier / Delivery Service *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COURIER_PRESETS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setParcelForm({ ...parcelForm, company: c.id, name: `${c.label} Delivery` })}
                      className={`p-2 rounded-xl border text-center text-[12px] font-bold transition-all cursor-pointer ${
                        parcelForm.company === c.id
                          ? "border-primary bg-primary text-on-primary shadow-xs"
                          : "border-outline-variant bg-surface-container-low text-on-surface hover:border-primary/50"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Package Count & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-1">
                    Number of Packages
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParcelForm({ ...parcelForm, packageCount: Math.max(1, (parcelForm.packageCount || 1) - 1) })}
                      className="h-10 w-10 rounded-xl border border-outline-variant bg-surface-container-low font-bold text-title-sm hover:bg-surface-container-high cursor-pointer"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-title-sm text-on-surface">
                      {parcelForm.packageCount || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setParcelForm({ ...parcelForm, packageCount: (parcelForm.packageCount || 1) + 1 })}
                      className="h-10 w-10 rounded-xl border border-outline-variant bg-surface-container-low font-bold text-title-sm hover:bg-surface-container-high cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-1">
                    Storage Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={parcelForm.notes}
                    onChange={(e) => setParcelForm({ ...parcelForm, notes: e.target.value })}
                    placeholder="e.g. Box on Shelf A"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2 px-3 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogParcelModalOpen(false)}
                  className="px-4 py-2 text-label-md font-bold text-on-surface-variant hover:bg-surface-container-low rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logParcelMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-label-md font-bold text-on-primary shadow-sm hover:bg-primary/90 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_task</span>
                  <span>{logParcelMutation.isPending ? "Logging..." : "Log & Generate PIN"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
