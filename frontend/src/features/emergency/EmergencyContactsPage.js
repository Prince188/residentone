import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import {
  SOS_TYPES,
  triggerSOS,
  getMyActiveSOS,
  getActiveSOSList,
  resolveSOS,
} from "../../lib/sos";

export default function EmergencyContactsPage() {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const patchSociety = useSocietyStore((state) => state.patchSociety);

  const societyId = activeSociety?.id || activeSociety?._id;
  const role = activeMembership?.role || "";
  const isGuardOrAdmin = [
    "super_admin",
    "society_admin",
    "manager",
    "wing_admin",
    "committee_member",
    "security_guard",
    "staff",
  ].includes(role);

  const canEdit = [
    "super_admin",
    "society_admin",
    "manager",
    "wing_admin",
    "committee_member",
  ].includes(role) || !role;

  // Helpline contacts query
  const { data: emergencyData } = useQuery({
    queryKey: ["emergency-contacts", societyId],
    queryFn: async () => {
      const res = await api.get("/societies/emergency-contacts");
      return res.data?.data;
    },
    enabled: Boolean(societyId),
    staleTime: 30000,
  });

  // SOS Active status queries
  const { data: myActiveSos } = useQuery({
    queryKey: ["my-active-sos", societyId],
    queryFn: () => getMyActiveSOS(),
    enabled: Boolean(societyId),
    refetchInterval: 6000,
  });

  const { data: societyIncidents = [] } = useQuery({
    queryKey: ["active-sos-list", societyId],
    queryFn: () => getActiveSOSList(),
    enabled: Boolean(societyId && isGuardOrAdmin),
    refetchInterval: 6000,
  });

  // States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState({
    securityPhone: "",
    managerPhone: "",
    liftHelpline: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // SOS Dispatch Modal state
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [selectedSosType, setSelectedSosType] = useState("medical");
  const [locationNote, setLocationNote] = useState("");
  const [dispatching, setDispatching] = useState(false);

  // SOS Resolution Modal state
  const [resolvingIncident, setResolvingIncident] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isFalseAlarm, setIsFalseAlarm] = useState(false);

  // 2-Minute (120s) Auto-Cancel Countdown
  const [sosCountdown, setSosCountdown] = useState(120);

  useEffect(() => {
    if (!myActiveSos) {
      setSosCountdown(120);
      return;
    }

    const triggeredTime = new Date(
      myActiveSos.triggeredAt || myActiveSos.createdAt || Date.now()
    ).getTime();

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - triggeredTime) / 1000);
      const remaining = Math.max(0, 120 - elapsed);
      setSosCountdown(remaining);

      if (remaining <= 0) {
        // Auto-cancel after 2 minutes of inactivity
        resolveSosMutation.mutate({
          id: myActiveSos._id || myActiveSos.id,
          note: "Alarm cancelled automatically after 2 minutes",
          falseAlarm: false,
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [myActiveSos]);

  // Mutations
  const updateContactsMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.patch("/societies/emergency-contacts", payload);
      return res.data?.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["emergency-contacts", societyId], updated);
      queryClient.invalidateQueries(["emergency-contacts"]);
      if (societyId && patchSociety) {
        patchSociety(societyId, {
          securityPhone: updated.securityPhone,
          phone: updated.managerPhone,
          liftHelpline: updated.liftHelpline,
          emergencyContacts: updated.custom,
        });
      }
      setIsEditOpen(false);
      setStatusMsg("Helpline contacts updated successfully");
      setTimeout(() => setStatusMsg(""), 3500);
    },
    onError: (err) => {
      setErrorMsg(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Failed to update emergency helpline numbers."
      );
    },
  });

  const triggerSosMutation = useMutation({
    mutationFn: (payload) => triggerSOS(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["my-active-sos"]);
      queryClient.invalidateQueries(["active-sos-list"]);
      setIsSosModalOpen(false);
      setLocationNote("");
      setStatusMsg("🚨 EMERGENCY SOS DISPATCHED: Security desk and guards notified!");
      setTimeout(() => setStatusMsg(""), 5000);
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || "Failed to trigger SOS alert.");
      setTimeout(() => setErrorMsg(""), 4000);
    },
  });

  const resolveSosMutation = useMutation({
    mutationFn: ({ id, note, falseAlarm }) =>
      resolveSOS(id, { resolutionNote: note, isFalseAlarm: falseAlarm }),
    onSuccess: () => {
      queryClient.invalidateQueries(["my-active-sos"]);
      queryClient.invalidateQueries(["active-sos-list"]);
      setResolvingIncident(null);
      setResolutionNote("");
      setStatusMsg("Emergency incident marked as resolved.");
      setTimeout(() => setStatusMsg(""), 3500);
    },
    onError: (err) => {
      setErrorMsg(err?.response?.data?.message || "Failed to resolve incident.");
      setTimeout(() => setErrorMsg(""), 4000);
    },
  });

  const openEditModal = () => {
    setErrorMsg("");
    setForm({
      securityPhone: emergencyData?.custom?.securityPhone || "",
      managerPhone: emergencyData?.custom?.managerPhone || "",
      liftHelpline: emergencyData?.custom?.liftHelpline || "",
    });
    setIsEditOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateContactsMutation.mutate({
      securityPhone: form.securityPhone.trim(),
      managerPhone: form.managerPhone.trim(),
      liftHelpline: form.liftHelpline.trim(),
    });
  };

  const handleDispatchSos = (e) => {
    e.preventDefault();
    setDispatching(true);
    triggerSosMutation.mutate(
      {
        emergencyType: selectedSosType,
        locationDescription: locationNote.trim(),
      },
      {
        onSettled: () => setDispatching(false),
      }
    );
  };

  const guardPhone =
    emergencyData?.securityPhone ||
    activeSociety?.securityPhone ||
    emergencyData?.autoDetected?.guard?.phone ||
    "020-27654321";

  const managerPhone =
    emergencyData?.managerPhone ||
    activeSociety?.phone ||
    activeSociety?.contactPhone ||
    emergencyData?.autoDetected?.manager?.phone ||
    "020-27654322";

  const liftPhone =
    emergencyData?.liftHelpline ||
    activeSociety?.liftHelpline ||
    emergencyData?.autoDetected?.lift?.phone ||
    "1800-209-5438";

  const societyContacts = [
    {
      id: "guard",
      title: "Security Guard",
      sub: emergencyData?.autoDetected?.guard?.name
        ? `Assigned: ${emergencyData.autoDetected.guard.name}`
        : "24/7 guard booth & boom barrier",
      number: guardPhone,
      tag: emergencyData?.custom?.securityPhone ? "CUSTOM" : (emergencyData?.autoDetected?.guard ? "AUTO-ASSIGNED" : "GATE"),
      tagBg: emergencyData?.custom?.securityPhone ? "bg-amber-100 text-amber-800" : (emergencyData?.autoDetected?.guard ? "bg-emerald-100 text-emerald-800" : "bg-surface-container-high text-on-surface-variant"),
      icon: "shield",
      color: "bg-emerald-600 text-white",
    },
    {
      id: "manager",
      title: "Society Manager",
      sub: emergencyData?.autoDetected?.manager?.name
        ? `Assigned: ${emergencyData.autoDetected.manager.name}`
        : "Facility & administration office",
      number: managerPhone,
      tag: emergencyData?.custom?.managerPhone ? "CUSTOM" : (emergencyData?.autoDetected?.manager ? "AUTO-ASSIGNED" : "OFFICE"),
      tagBg: emergencyData?.custom?.managerPhone ? "bg-amber-100 text-amber-800" : (emergencyData?.autoDetected?.manager ? "bg-sky-100 text-sky-800" : "bg-surface-container-high text-on-surface-variant"),
      icon: "corporate_fare",
      color: "bg-sky-600 text-white",
    },
    {
      id: "lift",
      title: "Lift Man / Helpline",
      sub: emergencyData?.autoDetected?.lift?.name
        ? `Assigned: ${emergencyData.autoDetected.lift.name}`
        : "24/7 lift breakdown & entrapment helpline",
      number: liftPhone,
      tag: emergencyData?.custom?.liftHelpline ? "CUSTOM" : (emergencyData?.autoDetected?.lift ? "AUTO-ASSIGNED" : "HELPLINE"),
      tagBg: emergencyData?.custom?.liftHelpline ? "bg-amber-100 text-amber-800" : "bg-orange-100 text-orange-800",
      icon: "elevator",
      color: "bg-amber-600 text-white",
    },
  ];

  const emergencyServices = [
    { name: "National Emergency Helpline", number: "112", icon: "emergency", color: "bg-red-500 text-white" },
    { name: "Police", number: "100", icon: "local_police", color: "bg-blue-600 text-white" },
    { name: "Ambulance", number: "102 / 108", icon: "ambulance", color: "bg-emerald-600 text-white" },
    { name: "Fire Station", number: "101", icon: "local_fire_department", color: "bg-amber-500 text-white" },
    { name: "Women Helpline", number: "1091", icon: "shield", color: "bg-purple-500 text-white" },
    { name: "Child Helpline", number: "1098", icon: "child_care", color: "bg-sky-500 text-white" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 space-y-6">
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

      {/* Header with SOS Trigger Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600 text-[28px]">e911_emergency</span>
            <h1 className="text-2xl font-bold text-on-surface">Emergency & SOS Helplines</h1>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Immediate dispatch alerts, on-duty guard desk assistance & essential emergency contacts.
          </p>
        </div>

        <button
          onClick={() => setIsSosModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:from-red-700 hover:to-rose-800 transition-all transform hover:scale-[1.02]"
        >
          <span className="material-symbols-outlined text-[20px] animate-pulse">sos</span>
          Trigger Emergency SOS
        </button>
      </div>

      {/* ACTIVE SOS NOTIFICATION BANNER (if user has active SOS or guard has incident) */}
      {myActiveSos && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-rose-700 to-red-800 p-5 text-white shadow-lg animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[36px]">warning</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-extrabold uppercase tracking-wide">
                    YOUR EMERGENCY SOS IS CURRENTLY ACTIVE ({myActiveSos.emergencyType?.toUpperCase()})
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-xs">
                    <span className="material-symbols-outlined text-[14px]">timer</span>
                    Auto-cancelling in {Math.floor(sosCountdown / 60)}:{(sosCountdown % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <p className="text-xs text-red-100 mt-0.5">
                  On-duty security guards and society manager have been alerted. Stand by for assistance.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  resolveSosMutation.mutate({
                    id: myActiveSos._id || myActiveSos.id,
                    note: "Emergency resolved safely (I Am Safe)",
                    falseAlarm: false,
                  })
                }
                disabled={resolveSosMutation.isPending}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                I AM SAFE
              </button>
              <button
                type="button"
                onClick={() =>
                  resolveSosMutation.mutate({
                    id: myActiveSos._id || myActiveSos.id,
                    note: "Marked as false alarm by resident",
                    falseAlarm: true,
                  })
                }
                disabled={resolveSosMutation.isPending}
                className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                FALSE ALARM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GUARD/ADMIN ACTIVE SOCIETY INCIDENTS */}
      {isGuardOrAdmin && societyIncidents.length > 0 && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
              <span className="material-symbols-outlined text-red-600">notifications_active</span>
              Active Emergency SOS Incidents in Society ({societyIncidents.length})
            </div>
          </div>
          <div className="space-y-2">
            {societyIncidents.map((inc) => (
              <div key={inc._id || inc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white rounded-xl p-3 border border-red-200 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-700 uppercase text-xs tracking-wider">
                      {inc.emergencyType} Alert
                    </span>
                    <span className="text-xs text-on-surface-variant">· Flat {inc.unit?.unitNumber || "Resident"}</span>
                  </div>
                  <p className="text-xs text-on-surface mt-0.5">
                    <strong>Resident:</strong> {inc.triggeredByName || "Resident"} ({inc.triggeredByPhone || "—"})
                    {inc.locationDescription ? ` · Note: ${inc.locationDescription}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => setResolvingIncident(inc)}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Mark Resolved
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. Society Assigned Helplines (Guard, Manager, Lift) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Society Dedicated Helplines</h2>
            <p className="text-xs text-on-surface-variant">
              Quick access contacts for your building security gate, management office, and lift breakdowns.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface-container transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Edit 3 Helplines
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {societyContacts.map((c) => (
            <div
              key={c.id}
              className="relative flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.color} shadow-sm`}>
                    <span className="material-symbols-outlined text-[22px]">{c.icon}</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${c.tagBg}`}>
                    {c.tag}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-bold text-on-surface">{c.title}</h3>
                <p className="mt-0.5 text-xs text-on-surface-variant line-clamp-1">{c.sub}</p>
                <p className="mt-2 text-xl font-extrabold text-primary tracking-tight">{c.number}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-medium">Direct Dial</span>
                <a
                  href={`tel:${c.number.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  Call Now
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Medical & Essential Help Callout */}
      <section className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-surface-container-lowest p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm">
              <span className="material-symbols-outlined text-[26px]">medical_services</span>
            </span>
            <div>
              <h2 className="text-base font-bold text-on-surface">Need Medical Help in Society?</h2>
              <p className="mt-1 text-xs text-on-surface-variant max-w-xl">
                Find resident doctors, healthcare specialists, or electricians living right in your society who can provide immediate assistance during an emergency.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
            <Link
              to="/directory?search=doctor"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition"
            >
              <span className="material-symbols-outlined text-[16px]">stethoscope</span>
              Find Society Doctors
            </Link>
            <Link
              to="/directory?search=electrician"
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition"
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              Find Electricians
            </Link>
          </div>
        </div>
      </section>

      {/* 3. National Public Emergency Numbers */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-on-surface">National Public Emergency Numbers</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {emergencyServices.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${service.color}`}>
                  <span className="material-symbols-outlined text-[20px]">{service.icon}</span>
                </span>
                <div>
                  <p className="text-xs font-medium text-on-surface">{service.name}</p>
                  <p className="text-base font-extrabold text-primary">{service.number}</p>
                </div>
              </div>
              <a
                href={`tel:${service.number.split(" ")[0]}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-primary hover:bg-primary hover:text-on-primary transition"
                title={`Call ${service.name}`}
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Trigger SOS Modal */}
      {isSosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <span className="material-symbols-outlined">warning</span>
                Dispatch Emergency SOS
              </div>
              <button
                onClick={() => setIsSosModalOpen(false)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleDispatchSos} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-2">
                  Select Emergency Category *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {SOS_TYPES.map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setSelectedSosType(t.type)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        selectedSosType === t.type
                          ? `${t.bg} border-2 border-primary shadow-sm`
                          : "border-outline-variant bg-surface hover:bg-surface-container"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[24px] ${t.color}`}>{t.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-on-surface">{t.label}</div>
                        <div className="text-[11px] text-on-surface-variant">{t.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Location / Specific Details (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Lift B lobby, 4th floor, Flat 402"
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSosModalOpen(false)}
                  className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {dispatching ? "Dispatching..." : "Confirm & Send SOS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit 3 Helplines Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h2 className="text-lg font-bold text-on-surface">Edit Society Helplines</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Security Guard Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210 or 020-27654321"
                  value={form.securityPhone}
                  onChange={(e) => setForm({ ...form, securityPhone: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Society Manager Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543211 or 020-27654322"
                  value={form.managerPhone}
                  onChange={(e) => setForm({ ...form, managerPhone: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Lift Man / Breakdown Helpline
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1800-209-5438"
                  value={form.liftHelpline}
                  onChange={(e) => setForm({ ...form, liftHelpline: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateContactsMutation.isPending}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {updateContactsMutation.isPending ? "Saving..." : "Save Helplines"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Incident Modal */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-on-surface">Resolve Emergency Incident</h3>
            <p className="text-xs text-on-surface-variant">
              Confirm that the situation has been investigated and resolved by the security desk.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">
                  Resolution Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Guard responded, resident attended by medical team"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingIncident(null)}
                  className="w-full sm:w-auto rounded-xl border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Cancel / Keep Active
                </button>
                <button
                  type="button"
                  onClick={() =>
                    resolveSosMutation.mutate({
                      id: resolvingIncident._id || resolvingIncident.id,
                      note: resolutionNote || "Marked as false alarm by resident",
                      falseAlarm: true,
                    })
                  }
                  disabled={resolveSosMutation.isPending}
                  className="w-full sm:w-auto rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 cursor-pointer"
                >
                  {resolveSosMutation.isPending ? "Updating..." : "FALSE ALARM"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    resolveSosMutation.mutate({
                      id: resolvingIncident._id || resolvingIncident.id,
                      note: resolutionNote || "Emergency resolved safely (I Am Safe)",
                      falseAlarm: false,
                    })
                  }
                  disabled={resolveSosMutation.isPending}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {resolveSosMutation.isPending ? "Resolving..." : "I AM SAFE"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
