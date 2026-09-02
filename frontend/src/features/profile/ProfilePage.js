import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, { selectActiveSociety } from "../../stores/society.store";
import api from "../../lib/api";

export default function ProfilePage() {
  const authUser = useAuthStore((s) => s.user);
  const activeSociety = useSocietyStore(selectActiveSociety);
  const queryClient = useQueryClient();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    occupation: "",
    familyMembers: "",
    vehicles: [],
    newVehicleInput: "",
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await api.get("/users/profile")).data.data,
    initialData: authUser,
  });

  const membershipsQuery = useQuery({
    queryKey: ["my-societies"],
    queryFn: async () => (await api.get("/memberships/my-societies")).data.data,
  });

  const user = profileQuery.data || authUser;
  const memberships = membershipsQuery.data || [];

  const updateProfileMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.patch("/users/profile", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      useAuthStore.setState({ user: data });
      setIsEditModalOpen(false);
      setSuccessMsg("Your profile has been updated successfully!");
      setErrorMsg("");
      setTimeout(() => setSuccessMsg(""), 3500);
    },
    onError: (err) => {
      setErrorMsg(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Failed to update profile. Please try again."
      );
    },
  });

  const handleOpenEdit = () => {
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      occupation: user.occupation || "",
      familyMembers: user.familyMembers ?? "",
      vehicles: Array.isArray(user.vehicles) ? [...user.vehicles] : [],
      newVehicleInput: "",
    });
    setErrorMsg("");
    setIsEditModalOpen(true);
  };

  const handleAddVehicle = (e) => {
    e.preventDefault();
    const val = form.newVehicleInput.trim().toUpperCase();
    if (!val) return;
    if (form.vehicles.includes(val)) {
      setErrorMsg("Vehicle plate is already in your list.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      vehicles: [...prev.vehicles, val],
      newVehicleInput: "",
    }));
    setErrorMsg("");
  };

  const handleRemoveVehicle = (indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg("Name cannot be empty.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      occupation: form.occupation.trim(),
      familyMembers: form.familyMembers === "" ? null : Number(form.familyMembers),
      vehicles: form.vehicles.map((v) => v.trim().toUpperCase()).filter(Boolean),
    };
    updateProfileMutation.mutate(payload);
  };

  if (profileQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-12 text-center text-on-surface-variant">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-body-md font-medium">Loading profile...</p>
      </div>
    );
  }

  const roleLabel = Array.isArray(user.role)
    ? user.role.join(", ").replace(/_/g, " ")
    : user.role?.replace(/_/g, " ") || "Resident";

  const totalUnits = memberships.reduce((acc, m) => acc + (m.units?.length || 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Bar */}
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
            <span className="material-symbols-outlined text-primary text-[28px]">
              account_circle
            </span>
            My Profile
          </h1>
          <p className="page-subtitle">
            Manage your personal identity, vehicles, and society memberships
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 shadow-sm transition-opacity cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span>Edit Profile</span>
          </button>

          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors no-underline"
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
            <span className="hidden sm:inline">Security & Password</span>
          </Link>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-body-sm font-semibold text-emerald-800 shadow-sm animate-in fade-in">
          <span className="material-symbols-outlined text-[20px] text-emerald-600">
            check_circle
          </span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Hero Profile Card */}
      <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        {/* Cover Gradient Banner */}
        <div className="relative bg-gradient-to-r from-primary via-emerald-800 to-teal-900 px-6 pt-8 pb-14 text-white sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Large Avatar */}
              <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-3xl bg-white text-primary font-extrabold text-[32px] sm:text-[40px] shadow-xl ring-4 ring-white/30">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              {/* Name & Role */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-title-lg sm:text-headline-sm font-extrabold text-white tracking-tight">
                    {user.name}
                  </h2>
                  <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-label-sm font-bold uppercase tracking-wider text-white backdrop-blur-md">
                    {roleLabel}
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">mail</span>
                    {user.email}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">call</span>
                    {user.phone}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Membership Pill */}
            {activeSociety && (
              <div className="hidden md:flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-md border border-white/10">
                <span className="material-symbols-outlined text-[20px] text-white">apartment</span>
                <div className="text-left">
                  <p className="text-[11px] font-semibold text-white/70 uppercase">Active Society</p>
                  <p className="text-body-sm font-bold text-white truncate max-w-[140px]">
                    {activeSociety.name}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 divide-x divide-outline-variant/60 border-t border-outline-variant/40 bg-surface-container-low sm:grid-cols-4">
          <div className="p-4 text-center">
            <span className="text-label-sm text-outline">Societies</span>
            <p className="mt-0.5 text-title-md font-extrabold text-on-surface">
              {memberships.length}
            </p>
          </div>

          <div className="p-4 text-center">
            <span className="text-label-sm text-outline">Linked Houses</span>
            <p className="mt-0.5 text-title-md font-extrabold text-on-surface">{totalUnits}</p>
          </div>

          <div className="p-4 text-center">
            <span className="text-label-sm text-outline">Vehicles</span>
            <p className="mt-0.5 text-title-md font-extrabold text-on-surface">
              {user.vehicles?.length || 0}
            </p>
          </div>

          <div className="p-4 text-center">
            <span className="text-label-sm text-outline">Family Members</span>
            <p className="mt-0.5 text-title-md font-extrabold text-on-surface">
              {user.familyMembers ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Personal Info vs Societies */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Personal Information & Vehicles */}
        <div className="space-y-6 lg:col-span-2">
          {/* Identity & Details Card */}
          <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-4">
              <h3 className="text-title-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Personal Information
              </h3>
              <button
                type="button"
                onClick={handleOpenEdit}
                className="text-label-sm font-semibold text-primary hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="flex items-center gap-1.5 text-label-sm text-outline">
                  <span className="material-symbols-outlined text-[16px]">badge</span> Full Name
                </span>
                <p className="mt-1 text-body-md font-bold text-on-surface">{user.name || "—"}</p>
              </div>

              <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="flex items-center gap-1.5 text-label-sm text-outline">
                  <span className="material-symbols-outlined text-[16px]">work</span> Occupation
                </span>
                <p className="mt-1 text-body-md font-bold text-on-surface">
                  {user.occupation || "Not Specified"}
                </p>
              </div>

              <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="flex items-center gap-1.5 text-label-sm text-outline">
                  <span className="material-symbols-outlined text-[16px]">mail</span> Email Address
                </span>
                <p className="mt-1 text-body-md font-bold text-on-surface truncate">
                  {user.email || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="flex items-center gap-1.5 text-label-sm text-outline">
                  <span className="material-symbols-outlined text-[16px]">call</span> Phone Number
                </span>
                <p className="mt-1 text-body-md font-bold text-on-surface">{user.phone || "—"}</p>
              </div>

              <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="flex items-center gap-1.5 text-label-sm text-outline">
                  <span className="material-symbols-outlined text-[16px]">group</span> Family Members
                </span>
                <p className="mt-1 text-body-md font-bold text-on-surface">
                  {user.familyMembers ? `${user.familyMembers} Members` : "None Registered"}
                </p>
              </div>

              <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="flex items-center gap-1.5 text-label-sm text-outline">
                  <span className="material-symbols-outlined text-[16px]">event</span> Member Since
                </span>
                <p className="mt-1 text-body-md font-bold text-on-surface">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Registered Vehicles Card */}
          <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div>
                <h3 className="text-title-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">directions_car</span>
                  Registered Vehicles
                </h3>
                <p className="text-label-sm text-on-surface-variant">
                  Vehicle plates used for parking allocation and security gate identification
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-label-sm font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Manage</span>
              </button>
            </div>

            {user.vehicles && user.vehicles.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {user.vehicles.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-2xl border border-outline-variant/70 bg-surface-container-low p-3.5 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-[20px]">
                          directions_car
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-body-md font-bold text-on-surface tracking-wider">
                          {v}
                        </p>
                        <span className="text-[11px] font-semibold text-outline uppercase">
                          Authorized Vehicle
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-outline-variant p-6 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[32px] text-outline/60 mb-1">
                  no_crash
                </span>
                <p className="text-body-sm font-medium">No vehicles registered</p>
                <p className="text-label-sm text-outline mt-0.5">
                  Add your car or two-wheeler license plate to register with society gate security.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Societies & Units */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div>
                <h3 className="text-title-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">apartment</span>
                  Societies & Houses
                </h3>
                <p className="text-label-sm text-on-surface-variant">Your residencies and roles</p>
              </div>
            </div>

            {memberships.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant p-6 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[32px] text-outline/60 mb-1">
                  domain_disabled
                </span>
                <p className="text-body-sm font-medium">No society linked</p>
                <p className="text-label-sm text-outline mt-0.5">
                  Accept an invitation link from your society admin to join.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {memberships.map((m) => {
                  const isActive = activeSociety && String(m.society.id) === String(activeSociety.id);
                  return (
                    <div
                      key={m.membershipId}
                      className={`rounded-2xl border p-4 transition-all ${
                        isActive
                          ? "border-primary/40 bg-primary/5 shadow-sm"
                          : "border-outline-variant/60 bg-surface-container-low"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-body-md font-bold text-on-surface truncate">
                            {m.society.name}
                          </h4>
                          <p className="text-label-sm text-outline">
                            {m.society.city}
                            {m.society.state ? `, ${m.society.state}` : ""}
                          </p>
                        </div>
                        {isActive && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-outline-variant/40 pt-2.5 text-label-sm">
                        <span className="text-on-surface-variant">Role:</span>
                        <span className="font-bold text-primary capitalize">
                          {m.role.replace(/_/g, " ")}
                        </span>
                      </div>

                      {m.units && m.units.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[11px] text-outline uppercase font-semibold">
                            Flats / Houses:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {m.units.map((u) => (
                              <span
                                key={u.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1 font-mono text-label-sm font-bold text-on-surface shadow-2xs"
                              >
                                <span className="material-symbols-outlined text-[14px] text-primary">
                                  home
                                </span>
                                House {u.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Links Card */}
          <div className="rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm space-y-3">
            <h4 className="text-body-md font-bold text-on-surface">Quick Access</h4>
            <div className="space-y-1.5">
              <Link
                to="/family-members"
                className="flex items-center justify-between rounded-xl p-2.5 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors no-underline"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">group</span>
                  Manage Family Members
                </span>
                <span className="material-symbols-outlined text-[16px] text-outline">
                  chevron_right
                </span>
              </Link>

              <Link
                to="/my-unit"
                className="flex items-center justify-between rounded-xl p-2.5 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors no-underline"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    door_front
                  </span>
                  My Flat & Renters
                </span>
                <span className="material-symbols-outlined text-[16px] text-outline">
                  chevron_right
                </span>
              </Link>

              <Link
                to="/settings"
                className="flex items-center justify-between rounded-xl p-2.5 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors no-underline"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">lock</span>
                  Change Password & Security
                </span>
                <span className="material-symbols-outlined text-[16px] text-outline">
                  chevron_right
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => !updateProfileMutation.isPending && setIsEditModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="text-title-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit</span>
                Edit Profile Information
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={updateProfileMutation.isPending}
                className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-body-sm text-error">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Occupation & Family Members */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={form.occupation}
                    onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                    placeholder="e.g. Software Engineer"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-label-md font-medium text-on-surface mb-1">
                    Family Members Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={form.familyMembers}
                    onChange={(e) => setForm({ ...form, familyMembers: e.target.value })}
                    placeholder="e.g. 4"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 px-3.5 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Vehicles Manager */}
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">
                  Registered Vehicles
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.newVehicleInput}
                    onChange={(e) => setForm({ ...form, newVehicleInput: e.target.value })}
                    placeholder="Enter license plate (e.g. MH02AB1234)"
                    className="flex-1 rounded-xl border border-outline-variant bg-surface py-2 px-3.5 text-body-sm uppercase font-mono text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddVehicle}
                    className="rounded-xl bg-surface-container-high px-4 py-2 text-label-md font-semibold text-on-surface hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {form.vehicles.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {form.vehicles.map((v, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1 font-mono text-label-sm font-bold text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          directions_car
                        </span>
                        {v}
                        <button
                          type="button"
                          onClick={() => handleRemoveVehicle(i)}
                          className="ml-1 text-outline hover:text-error cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={updateProfileMutation.isPending}
                  className="rounded-xl border border-outline-variant px-4 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {updateProfileMutation.isPending ? "hourglass_top" : "save"}
                  </span>
                  <span>
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
