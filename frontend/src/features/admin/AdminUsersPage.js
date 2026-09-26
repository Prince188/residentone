import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllUsersAdmin,
  updateUserAdmin,
  freezeUserAdmin,
  deleteUserAdmin,
} from "../../lib/userManagement";
import { toast } from "../../lib/toast";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function generateRandomPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
  let pass = "";
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Edit form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formOccupation, setFormOccupation] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formRoles, setFormRoles] = useState([]);

  const usersQuery = useQuery({
    queryKey: ["admin-users", search, statusFilter, roleFilter],
    queryFn: async () => {
      const res = await getAllUsersAdmin({
        search: search || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
      });
      return res.data.data;
    },
  });

  const usersData = usersQuery.data?.users || [];
  const totalCount = usersQuery.data?.total || 0;

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateUserAdmin(id, payload),
    onSuccess: () => {
      toast.success("User updated successfully");
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || "Failed to update user");
    },
  });

  const freezeMutation = useMutation({
    mutationFn: (id) => freezeUserAdmin(id),
    onSuccess: (res) => {
      const isNowActive = res.data.data.isActive;
      toast.success(isNowActive ? "User account unfrozen" : "User account frozen");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || "Failed to change account status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteUserAdmin(id),
    onSuccess: () => {
      toast.success("User account deleted successfully");
      setDeletingUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || "Failed to delete user");
    },
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormName(user.name || "");
    setFormEmail(user.email || "");
    setFormPhone(user.phone || "");
    setFormOccupation(user.occupation || "");
    setFormPassword("");
    setShowPassword(false);
    setFormIsActive(user.isActive !== false);
    setFormRoles(Array.isArray(user.role) ? [...user.role] : [user.role || "resident"]);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const payload = {
      name: formName,
      email: formEmail,
      phone: formPhone,
      occupation: formOccupation,
      isActive: formIsActive,
      role: formRoles,
    };
    if (formPassword.trim()) {
      payload.password = formPassword.trim();
    }
    updateMutation.mutate({ id: editingUser._id || editingUser.id, payload });
  };

  const toggleRole = (roleKey) => {
    if (formRoles.includes(roleKey)) {
      if (formRoles.length > 1) {
        setFormRoles(formRoles.filter((r) => r !== roleKey));
      }
    } else {
      setFormRoles([...formRoles, roleKey]);
    }
  };

  const activeCount = usersData.filter((u) => u.isActive !== false).length;
  const frozenCount = usersData.filter((u) => u.isActive === false).length;
  const superAdminCount = usersData.filter((u) => (u.role || []).includes("super_admin")).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">
            Manage platform users, update profile info, override passwords, freeze or delete accounts.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3.5 py-2 text-label-md font-bold text-primary">
          <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
          <span>{totalCount} Platform Users</span>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-outline">Total Users</p>
          <p className="mt-1 text-headline-md font-extrabold text-on-surface">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Active Accounts</p>
          <p className="mt-1 text-headline-md font-extrabold text-emerald-900">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Frozen Accounts</p>
          <p className="mt-1 text-headline-md font-extrabold text-amber-900">{frozenCount}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-800">Super Admins</p>
          <p className="mt-1 text-headline-md font-extrabold text-violet-900">{superAdminCount}</p>
        </div>
      </section>

      {/* Main Table Card */}
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest">
        {/* Filters and Search Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-surface-container-low p-1">
              <button
                type="button"
                onClick={() => setStatusFilter("")}
                className={`rounded-full px-3 py-1 text-label-sm font-semibold transition-colors cursor-pointer ${
                  statusFilter === "" ? "bg-inverse-surface text-white" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`rounded-full px-3 py-1 text-label-sm font-semibold transition-colors cursor-pointer ${
                  statusFilter === "active" ? "bg-emerald-600 text-white" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("frozen")}
                className={`rounded-full px-3 py-1 text-label-sm font-semibold transition-colors cursor-pointer ${
                  statusFilter === "frozen" ? "bg-amber-600 text-white" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Frozen
              </button>
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-body-sm font-medium text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="society_admin">Society Admin</option>
              <option value="resident">Resident / Member</option>
              <option value="guard">Security Guard</option>
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search name, email, phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-64 border border-outline-variant rounded-lg bg-white px-3 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-1.5 text-label-md font-semibold text-on-primary hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Table Content */}
        {usersQuery.isLoading ? (
          <div className="p-10 text-center text-body-sm text-on-surface-variant">
            Loading platform users...
          </div>
        ) : usersQuery.isError ? (
          <div className="p-10 text-center text-body-sm text-error">
            Failed to load users. Please check server connection.
          </div>
        ) : usersData.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[40px] text-outline">group_off</span>
            <p className="mt-2 text-body-md font-semibold text-on-surface">No users found</p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {search || statusFilter || roleFilter
                ? "Try adjusting your search criteria or role filters."
                : "No registered users exist in the platform yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead>
                <tr className="border-b border-outline-variant text-label-sm uppercase tracking-wide text-outline">
                  <th className="px-4 py-3 font-semibold">User Profile</th>
                  <th className="px-4 py-3 font-semibold">Contact Info</th>
                  <th className="px-4 py-3 font-semibold">Roles</th>
                  <th className="px-4 py-3 font-semibold">Societies</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Registered</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersData.map((user) => {
                  const isFrozen = user.isActive === false;
                  const isSuperAdmin = (user.role || []).includes("super_admin");
                  const userInitials = (user.name || "U").charAt(0).toUpperCase();

                  return (
                    <tr
                      key={user._id || user.id}
                      className="border-b border-outline-variant/60 last:border-0 hover:bg-surface-container-low/60 transition-colors"
                    >
                      {/* Name & Occupation */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-[14px] ${
                            isSuperAdmin
                              ? "bg-violet-100 text-violet-800 border border-violet-300"
                              : "bg-primary/10 text-primary"
                          }`}>
                            {userInitials}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-body-sm flex items-center gap-1.5">
                              {user.name}
                              {isSuperAdmin && (
                                <span className="material-symbols-outlined text-[15px] text-violet-600" title="Super Admin">
                                  verified_user
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-on-surface-variant font-medium">
                              {user.occupation || "Resident"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email & Phone */}
                      <td className="px-4 py-3">
                        <p className="text-body-sm font-medium text-on-surface">{user.email}</p>
                        <p className="text-label-sm text-on-surface-variant">{user.phone}</p>
                      </td>

                      {/* Roles */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(user.role || ["resident"]).map((r) => (
                            <span
                              key={r}
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                r === "super_admin"
                                  ? "bg-violet-100 text-violet-800 border border-violet-200"
                                  : r === "society_admin"
                                  ? "bg-blue-100 text-blue-800"
                                  : r === "guard"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-surface-container-high text-on-surface-variant"
                              }`}
                            >
                              {r === "super_admin"
                                ? "Super Admin"
                                : r === "society_admin"
                                ? "Society Admin"
                                : r === "guard"
                                ? "Guard"
                                : "Resident"}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Societies */}
                      <td className="px-4 py-3">
                        {user.societies && user.societies.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.societies.slice(0, 2).map((s, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-on-surface truncate max-w-[130px]"
                              >
                                <span className="material-symbols-outlined text-[12px] text-primary">apartment</span>
                                {s.societyName}
                              </span>
                            ))}
                            {user.societies.length > 2 && (
                              <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant">
                                +{user.societies.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-outline italic">No society linked</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isFrozen ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                            Frozen
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-white px-2.5 py-1 text-label-sm font-semibold text-on-surface hover:bg-surface-container-low hover:border-primary hover:text-primary transition-colors cursor-pointer"
                            title="Edit user info or override password"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            Edit
                          </button>

                          {/* Freeze / Unfreeze Button */}
                          <button
                            type="button"
                            onClick={() => freezeMutation.mutate(user._id || user.id)}
                            disabled={freezeMutation.isPending}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-label-sm font-semibold transition-colors cursor-pointer ${
                              isFrozen
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200"
                                : "bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white border border-amber-200"
                            }`}
                            title={isFrozen ? "Unfreeze user account" : "Freeze user account"}
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {isFrozen ? "lock_open" : "ac_unit"}
                            </span>
                            {isFrozen ? "Unfreeze" : "Freeze"}
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeletingUser(user)}
                            className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 p-1 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors cursor-pointer"
                            title="Delete user account"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-outline-variant space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">manage_accounts</span>
                <h2 className="text-title-lg font-bold text-on-surface">Edit User Account</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-low cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-sm font-semibold text-on-surface mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-label-sm font-semibold text-on-surface mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1">
                  Occupation / Work
                </label>
                <input
                  type="text"
                  value={formOccupation}
                  onChange={(e) => setFormOccupation(e.target.value)}
                  placeholder="e.g. Software Engineer, Business Owner"
                  className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              {/* Password Override Section */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-label-md font-bold text-primary">
                    <span className="material-symbols-outlined text-[18px]">key</span>
                    Update / Override Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = generateRandomPassword();
                      setFormPassword(gen);
                      setShowPassword(true);
                      toast.info(`Generated: ${gen}`);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-primary/30 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">autorenew</span>
                    Auto-Generate
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm text-on-surface pr-10 focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Enter a new password here to reset credentials for this user immediately.
                </p>
              </div>

              {/* Roles Selection */}
              <div>
                <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
                  Platform Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "super_admin", label: "Super Admin" },
                    { key: "society_admin", label: "Society Admin" },
                    { key: "owner", label: "Owner" },
                    { key: "tenant", label: "Tenant" },
                    { key: "guard", label: "Security Guard" },
                    { key: "resident", label: "Resident" },
                  ].map((role) => {
                    const isSelected = formRoles.includes(role.key);
                    return (
                      <button
                        key={role.key}
                        type="button"
                        onClick={() => toggleRole(role.key)}
                        className={`rounded-lg px-3 py-1.5 text-label-sm font-semibold transition-colors cursor-pointer border ${
                          isSelected
                            ? "bg-primary text-on-primary border-primary"
                            : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-outline"
                        }`}
                      >
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Status Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-outline-variant p-3 bg-surface-container-lowest">
                <div>
                  <p className="text-body-sm font-bold text-on-surface">Account Status</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {formIsActive ? "User can log in and access services" : "User account is frozen and cannot log in"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formIsActive ? "bg-emerald-600" : "bg-amber-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formIsActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-outline-variant pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-outline-variant px-4 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-lg bg-primary px-5 py-2 text-label-md font-semibold text-on-primary hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-outline-variant space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <span className="material-symbols-outlined text-[32px]">warning</span>
              <h2 className="text-title-lg font-bold text-on-surface">Delete User Account?</h2>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Are you sure you want to delete <strong className="text-on-surface">{deletingUser.name}</strong> ({deletingUser.email})? This action cannot be undone and will remove their platform account and memberships.
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-outline-variant pt-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deletingUser._id || deletingUser.id)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-5 py-2 text-label-md font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
