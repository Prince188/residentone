import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import useAuthStore from "../../stores/auth.store";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { changePassword, extractApiError } from "../../lib/userSettings";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("security"); // "security" | "account" | "session"
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const navigate = useNavigate();

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword) throw new Error("Please enter your current password.");
      if (!newPassword) throw new Error("Please enter a new password.");
      if (newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
      if (newPassword !== confirmPassword) throw new Error("New passwords do not match.");

      return changePassword({ currentPassword, newPassword });
    },
    onSuccess: () => {
      setSuccess("Your password has been updated successfully!");
      setError("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      setError(extractApiError(err, "Failed to update password."));
      setSuccess("");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    changePasswordMutation.mutate();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-error text-error" };
    if (score <= 3) return { score: 2, label: "Medium", color: "bg-amber-500 text-amber-600" };
    return { score: 3, label: "Strong", color: "bg-emerald-500 text-emerald-600" };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
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
            settings
          </span>
          Settings & Security
        </h1>
        <p className="page-subtitle">
          Manage your account security, password, and active session
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/60 gap-4 sm:gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 pb-3 text-body-md font-semibold transition-colors cursor-pointer ${
            activeTab === "security"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">lock</span>
          <span>Security & Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`flex items-center gap-2 pb-3 text-body-md font-semibold transition-colors cursor-pointer ${
            activeTab === "account"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">badge</span>
          <span>Account Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("session")}
          className={`flex items-center gap-2 pb-3 text-body-md font-semibold transition-colors cursor-pointer ${
            activeTab === "session"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">devices</span>
          <span>Session & Devices</span>
        </button>
      </div>

      {/* TAB 1: Security & Password */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Security Banner */}
          <div className="flex items-start gap-3.5 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
              <span className="material-symbols-outlined text-[22px]">shield</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-body-md font-bold text-on-surface">
                Account Security Status: Protected
              </h3>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                Your account is secured with bcrypt-12 encrypted password credentials. Regularly updating your password helps keep your society records safe.
              </p>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-7 shadow-sm">
            <h2 className="text-title-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">key</span>
              Change Password
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Enter your current password and choose a new password of at least 6 characters.
            </p>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-error/30 bg-error/5 p-3.5 text-body-sm text-error">
                <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-body-sm text-emerald-800">
                <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0">
                  check_circle
                </span>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-w-lg">
              {/* Current Password */}
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 pl-3.5 pr-10 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showCurrentPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password (min. 6 characters)"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 pl-3.5 pr-10 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showNewPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-label-sm">
                      <span className="text-on-surface-variant">Strength:</span>
                      <span className={`font-semibold ${strength.color.split(" ")[1]}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="flex h-1.5 w-full gap-1 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 1 ? strength.color.split(" ")[0] : ""
                        }`}
                        style={{ width: "33.33%" }}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 2 ? strength.color.split(" ")[0] : ""
                        }`}
                        style={{ width: "33.33%" }}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 3 ? strength.color.split(" ")[0] : ""
                        }`}
                        style={{ width: "33.33%" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl border border-outline-variant bg-surface py-2.5 pl-3.5 pr-10 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showConfirmPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-label-sm text-error">Passwords do not match.</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-label-lg font-semibold text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {changePasswordMutation.isPending ? "hourglass_top" : "lock_reset"}
                  </span>
                  <span>
                    {changePasswordMutation.isPending ? "Updating Password..." : "Update Password"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Account Overview */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-7 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-title-md font-bold text-on-surface">Personal Information</h2>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  Basic details linked to your ResidentOne account
                </p>
              </div>
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2 text-label-md font-semibold text-primary hover:bg-primary/10 transition-colors no-underline"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>Edit Profile</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-outline-variant/60">
              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="text-label-sm text-outline">Full Name</span>
                <p className="mt-0.5 text-body-md font-bold text-on-surface">
                  {user?.name || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="text-label-sm text-outline">Email Address</span>
                <p className="mt-0.5 text-body-md font-bold text-on-surface">
                  {user?.email || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="text-label-sm text-outline">Phone Number</span>
                <p className="mt-0.5 text-body-md font-bold text-on-surface">
                  {user?.phone || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="text-label-sm text-outline">Current Society</span>
                <p className="mt-0.5 text-body-md font-bold text-on-surface truncate">
                  {activeSociety?.name || "None Selected"}
                </p>
              </div>

              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="text-label-sm text-outline">Society Role</span>
                <p className="mt-0.5 text-body-md font-bold text-primary capitalize">
                  {activeMembership?.role?.replace("_", " ") || "Resident"}
                </p>
              </div>

              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low p-4">
                <span className="text-label-sm text-outline">Account Role</span>
                <p className="mt-0.5 text-body-md font-bold text-on-surface">
                  {Array.isArray(user?.role) ? user.role.join(", ") : user?.role || "Resident"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Session & Devices */}
      {activeTab === "session" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-7 shadow-sm space-y-5">
            <div>
              <h2 className="text-title-md font-bold text-on-surface">Active Session</h2>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                You are currently logged into ResidentOne Web Client
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <span className="material-symbols-outlined text-[22px]">laptop_mac</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-body-md font-bold text-on-surface">Web Browser</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      Current Device
                    </span>
                  </div>
                  <p className="text-label-sm text-outline mt-0.5">
                    Logged in via JWT Authentication
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-error/30 bg-error/5 px-3.5 py-2 text-label-md font-semibold text-error hover:bg-error/10 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
