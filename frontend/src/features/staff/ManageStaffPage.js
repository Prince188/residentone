import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveSociety,
  selectActiveMembership,
} from "../../stores/society.store";
import {
  getStaffList,
  addStaffMember,
  updateStaffMember,
  removeStaffMember,
  lookupUserByPhone,
} from "../../lib/staff";
import { hasPermission } from "../../lib/permissions";
import api from "../../lib/api";

const STAFF_ROLE_OPTIONS = [
  { value: "security_guard", label: "Security Guard / Gatekeeper", icon: "shield", desc: "Has full access to the Gate Terminal (PIN entry & walk-in logging)" },
  { value: "technician", label: "Maintenance / Technician", icon: "handyman", desc: "Plumber, Electrician, Lift technician, Painter" },
  { value: "housekeeping", label: "Housekeeping & Cleaning", icon: "cleaning_services", desc: "Society cleaner, waste management staff" },
  { value: "gardener", label: "Gardener & Landscaping", icon: "yard", desc: "Society gardener and groundskeeper" },
  { value: "office", label: "Facility / Office Assistant", icon: "badge", desc: "Society office assistant or supervisor" },
  { value: "other", label: "General Staff", icon: "person", desc: "Other hired personnel" },
];

const SHIFT_OPTIONS = [
  "Day Shift (8:00 AM - 8:00 PM)",
  "Night Shift (8:00 PM - 8:00 AM)",
  "General Shift (9:00 AM - 6:00 PM)",
  "Morning Shift (6:00 AM - 2:00 PM)",
  "Evening Shift (2:00 PM - 10:00 PM)",
  "Full Time / 24x7",
];

const GATE_OPTIONS = [
  "Main Gate",
  "Tower Gate",
  "Back Gate / Service Gate",
  "Basement Parking Gate",
  "Clubhouse Entrance",
  "All Gates / Mobile",
];

export default function ManageStaffPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'security_guard' | 'technician' | 'housekeeping' | 'gardener'
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [successBanner, setSuccessBanner] = useState("");
  const [errorBanner, setErrorBanner] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    phone: "",
    staffType: "security_guard",
    shift: SHIFT_OPTIONS[0],
    gate: GATE_OPTIONS[0],
    notes: "",
  });

  // Database Phone Number Lookup
  useEffect(() => {
    const rawDigits = form.phone.replace(/\D/g, "");
    if (rawDigits.length >= 6) {
      setIsSearchingPhone(true);
      const timer = setTimeout(async () => {
        try {
          const res = await lookupUserByPhone(rawDigits);
          if (res.data.data) {
            const u = res.data.data;
            setFoundUser(u);
            setForm((prev) => ({
              ...prev,
              name: prev.name && prev.name !== u.name ? prev.name : u.name,
            }));
          } else {
            setFoundUser(null);
          }
        } catch (_) {
          setFoundUser(null);
        } finally {
          setIsSearchingPhone(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setFoundUser(null);
      setIsSearchingPhone(false);
    }
  }, [form.phone]);

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety?.id),
  });

  const canManageStaff =
    activeMembership &&
    (hasPermission(activeMembership.role, "manage_staff", permissionsQuery.data) ||
      ["super_admin", "society_admin", "manager"].includes(activeMembership.role));

  // Query Staff List
  const staffQuery = useQuery({
    queryKey: ["staff-list", activeSociety?.id],
    queryFn: async () => (await getStaffList()).data.data,
    enabled: Boolean(activeSociety?.id),
  });

  const staffData = staffQuery.data;
  const staffList = useMemo(() => staffData?.staff || [], [staffData]);
  const counts = staffData?.counts || { guards: 0, technicians: 0, housekeeping: 0, gardeners: 0, total: 0 };

  // Filter staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesTab = activeTab === "all" || s.staffType === activeTab;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.userId?.name?.toLowerCase().includes(q) ||
        s.userId?.phone?.includes(q) ||
        s.gate?.toLowerCase().includes(q) ||
        s.staffType?.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [staffList, activeTab, searchQuery]);

  // Mutation: Add Staff
  const addMutation = useMutation({
    mutationFn: async (payload) => (await addStaffMember(payload)).data.data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });
      setSuccessBanner(`Staff member ${data.userId?.name || form.name} added successfully!`);
      setIsAddModalOpen(false);
      setForm({
        name: "",
        phone: "",
        staffType: "security_guard",
        shift: SHIFT_OPTIONS[0],
        gate: GATE_OPTIONS[0],
        notes: "",
      });
      setTimeout(() => setSuccessBanner(""), 4000);
    },
    onError: (err) => {
      setErrorBanner(err?.response?.data?.error?.message || "Failed to add staff member");
      setTimeout(() => setErrorBanner(""), 4000);
    },
  });

  // Mutation: Update Staff
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => (await updateStaffMember(id, data)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });
      setSuccessBanner("Staff details updated!");
      setEditingStaff(null);
      setTimeout(() => setSuccessBanner(""), 3500);
    },
    onError: (err) => {
      setErrorBanner(err?.response?.data?.error?.message || "Failed to update staff member");
      setTimeout(() => setErrorBanner(""), 4000);
    },
  });

  // Mutation: Remove Staff
  const removeMutation = useMutation({
    mutationFn: async (id) => (await removeStaffMember(id)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });
      setSuccessBanner("Staff member removed from society.");
      setTimeout(() => setSuccessBanner(""), 3500);
    },
    onError: (err) => {
      setErrorBanner(err?.response?.data?.error?.message || "Failed to remove staff member");
      setTimeout(() => setErrorBanner(""), 4000);
    },
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorBanner("Staff name is required.");
      return;
    }
    if (!form.phone.trim()) {
      setErrorBanner("Staff phone number is required.");
      return;
    }
    setErrorBanner("");
    addMutation.mutate(form);
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    updateMutation.mutate({
      id: editingStaff._id || editingStaff.id,
      data: {
        staffType: editingStaff.staffType,
        shift: editingStaff.shift,
        gate: editingStaff.gate,
        notes: editingStaff.notes,
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary mb-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[28px]">shield_person</span>
            Staff & Security Guard Management
          </h1>
          <p className="page-subtitle">
            Assign security guards, technicians, and facility staff without needing a house assignment
          </p>
        </div>

        {canManageStaff && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-label-md font-bold text-on-primary hover:opacity-90 shadow-sm transition-opacity cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span>+ Add Staff / Guard</span>
          </button>
        )}
      </div>

      {/* Info Tip Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-body-sm text-on-surface shadow-xs">
        <span className="material-symbols-outlined text-[24px] text-primary shrink-0 mt-0.5">info</span>
        <div>
          <p className="font-bold text-on-surface">No House / Flat Required for Staff & Guards</p>
          <p className="text-on-surface-variant text-[13px] mt-0.5">
            Unlike committee members, staff personnel and security guards do not need to live or own a flat in the society.
            When you assign a <strong>Security Guard</strong>, their account automatically unlocks the <strong>Gatekeeper Terminal</strong> (`/guard` & `/visitors/terminal`).
          </p>
        </div>
      </div>

      {successBanner && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-body-md font-bold text-emerald-900 shadow-sm animate-in fade-in">
          <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
          <span>{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="flex items-center gap-2 rounded-2xl border border-error/30 bg-error/5 p-4 text-body-md font-bold text-error shadow-sm animate-in fade-in">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{errorBanner}</span>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-label-sm text-outline font-semibold">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">shield</span>
            Security Guards
          </span>
          <p className="mt-1 text-headline-sm font-extrabold text-emerald-600">{counts.guards}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Gatekeeper accounts</p>
        </div>

        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-label-sm text-outline font-semibold">
            <span className="material-symbols-outlined text-[18px] text-primary">handyman</span>
            Technicians
          </span>
          <p className="mt-1 text-headline-sm font-extrabold text-primary">{counts.technicians}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Electrician, Plumber, Lift</p>
        </div>

        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-label-sm text-outline font-semibold">
            <span className="material-symbols-outlined text-[18px] text-violet-600">cleaning_services</span>
            Housekeeping
          </span>
          <p className="mt-1 text-headline-sm font-extrabold text-violet-600">{counts.housekeeping}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Cleaners & Waste staff</p>
        </div>

        <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex items-center gap-1.5 text-label-sm text-outline font-semibold">
            <span className="material-symbols-outlined text-[18px] text-on-surface">groups</span>
            Total Staff
          </span>
          <p className="mt-1 text-headline-sm font-extrabold text-on-surface">{counts.total}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">Active personnel roster</p>
        </div>
      </div>

      {/* TABS & SEARCH BAR */}
      <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: `All Staff (${counts.total})`, icon: "groups" },
              { id: "security_guard", label: `Guards (${counts.guards})`, icon: "shield" },
              { id: "technician", label: `Technicians (${counts.technicians})`, icon: "handyman" },
              { id: "housekeeping", label: `Housekeeping (${counts.housekeeping})`, icon: "cleaning_services" },
              { id: "gardener", label: `Gardeners (${counts.gardeners})`, icon: "yard" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-label-md font-bold transition-all cursor-pointer ${
                  activeTab === t.id
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff, phone, gate..."
              className="rounded-xl border border-outline-variant bg-surface py-1.5 pl-9 pr-3 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary w-56 sm:w-64"
            />
          </div>
        </div>

        {/* STAFF CARDS GRID */}
        {staffQuery.isLoading ? (
          <div className="p-12 text-center text-on-surface-variant">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-3 text-body-sm font-medium">Loading staff roster...</p>
          </div>
        ) : filteredStaff.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map((s) => {
              const isGuard = s.staffType === "security_guard";
              const isTech = s.staffType === "technician";

              return (
                <div
                  key={s._id || s.id}
                  className="rounded-2xl border border-outline-variant/80 bg-surface-container-low p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Name & Role Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-xs ${
                            isGuard
                              ? "bg-emerald-600"
                              : isTech
                              ? "bg-primary"
                              : "bg-slate-700"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[24px]">
                            {isGuard ? "shield" : isTech ? "handyman" : "badge"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-body-md font-extrabold text-on-surface truncate">
                            {s.userId?.name || "Staff Member"}
                          </h4>
                          <p className="font-mono text-label-sm font-semibold text-primary">
                            {s.userId?.phone || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Role & Duty Badges */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                          isGuard
                            ? "bg-emerald-100 text-emerald-900"
                            : isTech
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-container-high text-on-surface"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isGuard ? "shield" : "badge"}
                        </span>
                        {s.staffType?.replace(/_/g, " ")}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">door_front</span>
                        {s.gate || "Main Gate"}
                      </span>
                    </div>

                    {/* Shift & Department Details */}
                    <div className="mt-3 space-y-1.5 border-t border-outline-variant/40 pt-2.5 text-body-sm">
                      <div className="flex justify-between">
                        <span className="text-outline text-[12px]">Duty Shift:</span>
                        <span className="font-bold text-on-surface text-[12px]">{s.shift}</span>
                      </div>
                      {s.notes && (
                        <div className="flex justify-between">
                          <span className="text-outline text-[12px]">Notes:</span>
                          <span className="text-on-surface-variant text-[12px] truncate max-w-[180px]">{s.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  {canManageStaff && (
                    <div className="border-t border-outline-variant/40 pt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingStaff(s)}
                        className="inline-flex items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-label-sm font-semibold text-on-surface hover:bg-surface-container-high cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span>Edit Shift / Gate</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to remove ${s.userId?.name || "this staff member"}?`)) {
                            removeMutation.mutate(s._id || s.id);
                          }
                        }}
                        disabled={removeMutation.isPending}
                        className="text-label-sm font-semibold text-error hover:underline cursor-pointer p-1"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-outline-variant p-12 text-center text-on-surface-variant space-y-2">
            <span className="material-symbols-outlined text-[44px] text-outline/50">
              shield_person
            </span>
            <h4 className="text-body-md font-bold text-on-surface">No Staff Members Found</h4>
            <p className="text-label-sm text-outline max-w-sm mx-auto">
              {activeTab === "security_guard"
                ? "No security guards assigned yet. Click '+ Add Staff / Guard' to create your first gatekeeper."
                : "No staff records match your search filter."}
            </p>
          </div>
        )}
      </div>

      {/* ADD STAFF MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => !addMutation.isPending && setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[24px]">person_add</span>
                </div>
                <div>
                  <h3 className="text-title-md font-bold text-on-surface">Add Staff Member / Guard</h3>
                  <p className="text-label-sm text-on-surface-variant">
                    Assign a security guard or maintenance personnel to this society
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Role Type Selector */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-2">
                  Staff Role / Duty Type *
                </label>
                <div className="space-y-2">
                  {STAFF_ROLE_OPTIONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        form.staffType === r.value
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-outline-variant bg-surface-container-low hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="staffType"
                        value={r.value}
                        checked={form.staffType === r.value}
                        onChange={(e) => setForm({ ...form, staffType: e.target.value })}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-bold text-body-sm text-on-surface">
                          <span className="material-symbols-outlined text-[18px] text-primary">{r.icon}</span>
                          <span>{r.label}</span>
                        </div>
                        <p className="text-[12px] text-on-surface-variant mt-0.5">{r.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Phone & Name with Live Database Lookup */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-label-md font-semibold text-on-surface">
                      Mobile Phone Number *
                    </label>
                    <span className="text-[11px] text-outline font-medium">
                      {isSearchingPhone ? "Searching DB..." : "Auto-searches registered users"}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                      placeholder="e.g. 9876543210"
                      className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 pl-3.5 pr-10 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isSearchingPhone ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : foundUser ? (
                        <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-[20px] text-outline">search</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Found User Card */}
                {foundUser && (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-3 text-emerald-950 animate-in fade-in">
                    <span className="material-symbols-outlined text-[22px] text-emerald-600 shrink-0">
                      verified_user
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-extrabold text-emerald-950 flex items-center gap-1.5 truncate">
                        <span>Found in database:</span>
                        <span className="text-emerald-700 font-bold">{foundUser.name}</span>
                      </p>
                      <p className="text-[11px] text-emerald-800 truncate">
                        {foundUser.email || foundUser.phone} · Name auto-filled from account
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white tracking-wider">
                      Auto-Linked
                    </span>
                  </div>
                )}

                {/* Staff Full Name */}
                <div>
                  <label className="block text-label-md font-semibold text-on-surface mb-1">
                    Staff Full Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="e.g. Ramesh Singh"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {!foundUser && form.phone.replace(/\D/g, "").length >= 10 && !isSearchingPhone && (
                    <p className="text-[11px] text-on-surface-variant mt-1">
                      ℹ️ New user: An account will be provisioned automatically for this name and number.
                    </p>
                  )}
                </div>
              </div>

              {/* Shift Timing */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Duty Shift
                </label>
                <select
                  value={form.shift}
                  onChange={(e) => setForm({ ...form, shift: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {SHIFT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gate / Post Assignment */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Assigned Gate / Location
                </label>
                <select
                  value={form.gate}
                  onChange={(e) => setForm({ ...form, gate: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {GATE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Notes / Agency Name (Optional)
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Eagle Eye Security Agency"
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2 px-3 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={addMutation.isPending}
                  className="rounded-xl border border-outline-variant px-4 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-label-md font-bold text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {addMutation.isPending ? "hourglass_top" : "check"}
                  </span>
                  <span>{addMutation.isPending ? "Saving..." : "Save Staff Member"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => !updateMutation.isPending && setEditingStaff(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="text-title-md font-bold text-on-surface">
                Edit Staff: {editingStaff.userId?.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Staff Role
                </label>
                <select
                  value={editingStaff.staffType}
                  onChange={(e) => setEditingStaff({ ...editingStaff, staffType: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {STAFF_ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Duty Shift
                </label>
                <select
                  value={editingStaff.shift}
                  onChange={(e) => setEditingStaff({ ...editingStaff, shift: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {SHIFT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-label-md font-semibold text-on-surface mb-1">
                  Assigned Gate / Post
                </label>
                <select
                  value={editingStaff.gate}
                  onChange={(e) => setEditingStaff({ ...editingStaff, gate: e.target.value })}
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {GATE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  disabled={updateMutation.isPending}
                  className="rounded-xl border border-outline-variant px-4 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-label-md font-bold text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <span>{updateMutation.isPending ? "Updating..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
