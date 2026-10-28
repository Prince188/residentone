import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";

export default function EmergencyContactsPage() {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const patchSociety = useSocietyStore((state) => state.patchSociety);

  const role = activeMembership?.role || "";
  const canEdit = [
    "super_admin",
    "society_admin",
    "manager",
    "wing_admin",
    "committee_member",
  ].includes(role) || !role;

  const { data: emergencyData, isLoading } = useQuery({
    queryKey: ["emergency-contacts", activeSociety?.id],
    queryFn: async () => {
      const res = await api.get("/societies/emergency-contacts");
      return res.data?.data;
    },
    enabled: Boolean(activeSociety?.id),
    staleTime: 30000,
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState({
    securityPhone: "",
    managerPhone: "",
    liftHelpline: "",
  });
  const [errorMsg, setErrorMsg] = useState("");

  const updateContactsMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.patch("/societies/emergency-contacts", payload);
      return res.data?.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["emergency-contacts", activeSociety?.id], updated);
      queryClient.invalidateQueries(["emergency-contacts"]);
      if (activeSociety?.id && patchSociety) {
        patchSociety(activeSociety.id, {
          securityPhone: updated.securityPhone,
          phone: updated.managerPhone,
          liftHelpline: updated.liftHelpline,
          emergencyContacts: updated.custom,
        });
      }
      setIsEditOpen(false);
    },
    onError: (err) => {
      setErrorMsg(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Failed to update emergency helpline numbers."
      );
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
      ringColor: "ring-emerald-200 dark:ring-emerald-900/60",
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
      ringColor: "ring-sky-200 dark:ring-sky-900/60",
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
      ringColor: "ring-amber-200 dark:ring-amber-900/60",
    },
  ];

  const emergencyServices = [
    { name: "National Emergency Helpline", number: "112", icon: "emergency", color: "bg-red-500 text-white" },
    { name: "Police", number: "100", icon: "local_police", color: "bg-blue-600 text-white" },
    { name: "Ambulance", number: "102 / 108", icon: "ambulance", color: "bg-emerald-600 text-white" },
    { name: "Fire Department", number: "101", icon: "fire_truck", color: "bg-orange-600 text-white" },
    { name: "Women Helpline", number: "1091", icon: "shield", color: "bg-purple-600 text-white" },
    { name: "Disaster Management", number: "1077", icon: "warning", color: "bg-amber-600 text-white" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Dashboard
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Emergency Contacts</h1>
          <p className="page-subtitle">
            Essential emergency contacts, auto-synced society helpline numbers, and local medical assistance.
          </p>
        </div>
      </div>

      {/* 1. SOCIETY EMERGENCY & HELPDESK CONTACTS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2">
              <span>Society Helpdesk & Security</span>
              {isLoading && (
                <span className="text-body-xs text-on-surface-variant font-normal">
                  (Syncing numbers...)
                </span>
              )}
            </h2>
            <p className="text-body-xs text-on-surface-variant">
              Auto-synced with assigned security guards and society managers.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-label-sm font-semibold text-primary transition hover:bg-surface-container-high shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Edit Numbers
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {societyContacts.map((c) => (
            <div
              key={c.id}
              className="relative flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition hover:shadow-md ring-1 ring-inset ring-transparent hover:ring-opacity-50"
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
                <h3 className="mt-3 text-title-sm font-bold text-on-surface">{c.title}</h3>
                <p className="mt-0.5 text-body-xs text-on-surface-variant line-clamp-1">{c.sub}</p>
                <p className="mt-2 text-title-md font-extrabold text-primary tracking-tight">{c.number}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/60 flex items-center justify-between">
                <span className="text-body-xs text-on-surface-variant font-medium">Direct Dial</span>
                <a
                  href={`tel:${c.number.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-label-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  title={`Call ${c.title}`}
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  Call Now
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Medical Help Callout */}
      <section className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-rose-50/70 to-surface-container-lowest p-5 sm:p-6 shadow-sm dark:border-rose-900/60 dark:from-rose-950/40 dark:via-surface-container-lowest">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm">
              <span className="material-symbols-outlined text-[26px]">medical_services</span>
            </span>
            <div>
              <h2 className="text-title-sm font-semibold text-on-surface">
                Need Medical Help in Society?
              </h2>
              <p className="mt-1 text-body-sm text-on-surface-variant max-w-xl">
                Find resident doctors, nurses, healthcare specialists, or electricians living right in your society who can provide immediate assistance during an emergency.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
            <Link
              to="/directory?search=doctor"
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-label-md font-semibold text-white shadow-sm transition hover:bg-rose-700"
            >
              <span className="material-symbols-outlined text-[18px]">stethoscope</span>
              Find Society Doctors
            </Link>
            <Link
              to="/directory?search=electrician"
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-label-md font-semibold text-on-surface transition hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              Find Electricians
            </Link>
          </div>
        </div>
      </section>

      {/* 3. General Public Emergency Numbers */}
      <section className="space-y-3">
        <h2 className="text-title-sm font-semibold text-on-surface">
          Public Emergency Numbers
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {emergencyServices.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${service.color}`}>
                  <span className="material-symbols-outlined text-[20px]">{service.icon}</span>
                </span>
                <div>
                  <p className="text-body-sm font-semibold text-on-surface">{service.name}</p>
                  <p className="text-title-sm font-bold text-primary">{service.number}</p>
                </div>
              </div>
              <a
                href={`tel:${service.number.split(" ")[0]}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-primary hover:bg-primary hover:text-on-primary transition"
                title={`Call ${service.name}`}
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* EDIT MODAL FOR ONLY THE 3 SOCIETY NUMBERS */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-2xl border border-outline-variant animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/60">
              <div>
                <h3 className="text-title-md font-bold text-on-surface">Edit Society Emergency Numbers</h3>
                <p className="text-body-xs text-on-surface-variant mt-0.5">
                  Customize the 3 helplines or leave blank to auto-sync with assigned staff.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high transition"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-body-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* Security Guard */}
              <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low/40 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">shield</span>
                    Security Guard Number
                  </label>
                  {emergencyData?.autoDetected?.guard && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, securityPhone: "" })}
                      className="text-body-xs text-emerald-700 font-semibold hover:underline"
                    >
                      Use Auto-Assigned
                    </button>
                  )}
                </div>
                <p className="text-body-xs text-on-surface-variant">
                  {emergencyData?.autoDetected?.guard
                    ? `Assigned Guard: ${emergencyData.autoDetected.guard.name} (${emergencyData.autoDetected.guard.phone})`
                    : "Auto-fetches from active guards registered in Staff"}
                </p>
                <input
                  type="tel"
                  value={form.securityPhone}
                  onChange={(e) => setForm({ ...form, securityPhone: e.target.value })}
                  placeholder={emergencyData?.autoDetected?.guard?.phone || "Enter custom guard phone"}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              {/* Society Manager */}
              <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low/40 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-sky-600">corporate_fare</span>
                    Society Manager Number
                  </label>
                  {emergencyData?.autoDetected?.manager && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, managerPhone: "" })}
                      className="text-body-xs text-sky-700 font-semibold hover:underline"
                    >
                      Use Auto-Assigned
                    </button>
                  )}
                </div>
                <p className="text-body-xs text-on-surface-variant">
                  {emergencyData?.autoDetected?.manager
                    ? `Assigned Manager: ${emergencyData.autoDetected.manager.name} (${emergencyData.autoDetected.manager.phone})`
                    : "Auto-fetches from assigned society manager or admin"}
                </p>
                <input
                  type="tel"
                  value={form.managerPhone}
                  onChange={(e) => setForm({ ...form, managerPhone: e.target.value })}
                  placeholder={emergencyData?.autoDetected?.manager?.phone || activeSociety?.contactPhone || "Enter custom manager phone"}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              {/* Lift Man */}
              <div className="rounded-xl border border-outline-variant/70 bg-surface-container-low/40 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-amber-600">elevator</span>
                    Lift Man / Helpline Number
                  </label>
                  {emergencyData?.autoDetected?.lift && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, liftHelpline: "" })}
                      className="text-body-xs text-amber-700 font-semibold hover:underline"
                    >
                      Use Auto-Assigned
                    </button>
                  )}
                </div>
                <p className="text-body-xs text-on-surface-variant">
                  {emergencyData?.autoDetected?.lift
                    ? `Assigned Technician: ${emergencyData.autoDetected.lift.name} (${emergencyData.autoDetected.lift.phone})`
                    : "24/7 lift breakdown & entrapment helpline"}
                </p>
                <input
                  type="tel"
                  value={form.liftHelpline}
                  onChange={(e) => setForm({ ...form, liftHelpline: e.target.value })}
                  placeholder={emergencyData?.autoDetected?.lift?.phone || "Enter lift helpline phone"}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={updateContactsMutation.isPending}
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md font-medium text-on-surface hover:bg-surface-container-high transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateContactsMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-label-md font-semibold text-on-primary shadow-sm hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {updateContactsMutation.isPending ? "Saving..." : "Save Helpline Numbers"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
