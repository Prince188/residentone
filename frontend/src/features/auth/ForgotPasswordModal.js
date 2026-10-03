import { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../lib/firebase";
import api from "../../lib/api";

export default function ForgotPasswordModal({ isOpen, onClose, onPasswordResetSuccess }) {
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Enter OTP, 3: New Password, 4: Success
  const [identifier, setIdentifier] = useState("");
  const [maskedTarget, setMaskedTarget] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [firebaseToken, setFirebaseToken] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Clean up recaptcha widget when modal unmounts or closes
  useEffect(() => {
    return () => {
      cleanupRecaptcha();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const cleanupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById("recaptcha-container");
    if (container) {
      container.innerHTML = "";
    }
  };

  const getOrCreateRecaptchaVerifier = () => {
    if (window.recaptchaVerifier) {
      return window.recaptchaVerifier;
    }
    const container = document.getElementById("recaptcha-container");
    if (container) {
      container.innerHTML = "";
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved
      },
      "expired-callback": () => {
        setError("reCAPTCHA expired. Please try requesting OTP again.");
      },
    });
    return window.recaptchaVerifier;
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter your registered mobile number or email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // 1. Verify user exists in backend first
      const res = await api.post("/auth/forgot-password/send-otp", { identifier: cleanId });
      setMaskedTarget(res.data?.data?.masked || cleanId);

      const isEmail = cleanId.includes("@");
      if (!isEmail) {
        let appVerifier;
        try {
          appVerifier = getOrCreateRecaptchaVerifier();
        } catch (verr) {
          cleanupRecaptcha();
          appVerifier = getOrCreateRecaptchaVerifier();
        }

        // Format to standard E.164 format (+91 for 10-digit Indian numbers)
        const digitsOnly = cleanId.replace(/[^0-9]/g, "");
        const formattedPhone = cleanId.startsWith("+")
          ? cleanId
          : digitsOnly.length === 10
          ? `+91${digitsOnly}`
          : `+${digitsOnly}`;

        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        setConfirmationResult(confirmation);
      }

      setStep(2);
      setCountdown(45);
    } catch (err) {
      console.error("Send OTP Error:", err);
      cleanupRecaptcha();
      let errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Failed to send verification code. Please check the mobile number and try again.";
      
      if (errorMsg.includes("auth/invalid-phone-number")) {
        errorMsg = "Invalid mobile number format. Please enter a valid 10-digit mobile number.";
      } else if (errorMsg.includes("auth/too-many-requests")) {
        errorMsg = "Too many OTP requests. Please wait a few minutes before trying again.";
      } else if (errorMsg.includes("auth/quota-exceeded")) {
        errorMsg = "Daily SMS quota reached. Please contact support or try again tomorrow.";
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (confirmationResult) {
        // Verify code directly via Firebase
        const userCredential = await confirmationResult.confirm(cleanOtp);
        const idToken = await userCredential.user.getIdToken();
        setFirebaseToken(idToken);
        setStep(3);
      } else {
        // Backend verification fallback
        const res = await api.post("/auth/forgot-password/verify-otp", {
          identifier: identifier.trim(),
          otp: cleanOtp,
        });
        setResetToken(res.data?.data?.resetToken || "");
        setStep(3);
      }
    } catch (err) {
      console.error("Verify OTP Error:", err);
      let errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Invalid OTP code. Please check and try again.";
      if (errorMsg.includes("auth/invalid-verification-code")) {
        errorMsg = "Invalid 6-digit OTP. Please enter the code received on your phone.";
      } else if (errorMsg.includes("auth/code-expired")) {
        errorMsg = "OTP code has expired. Please click Resend OTP.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please ensure both passwords match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password/reset", {
        resetToken,
        firebaseToken,
        identifier: identifier.trim(),
        newPassword,
      });
      setStep(4);
      setTimeout(() => {
        if (onPasswordResetSuccess) {
          onPasswordResetSuccess(identifier.trim());
        }
        handleClose();
      }, 2500);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Failed to update password. Session may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }
    setStep(1);
    setIdentifier("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setResetToken("");
    setFirebaseToken("");
    setConfirmationResult(null);
    setError("");
    setCountdown(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      {/* Invisible reCAPTCHA container for Firebase */}
      <div id="recaptcha-container" />

      <div
        className="w-full max-w-[480px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 sm:p-7 text-white">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[22px]">
                {step === 4 ? "check_circle" : "lock_reset"}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">
                {step === 1 && "Forgot Password"}
                {step === 2 && "Enter Verification Code"}
                {step === 3 && "Set New Password"}
                {step === 4 && "Password Reset Complete"}
              </h3>
              <p className="text-xs text-white/80 mt-0.5">
                {step === 1 && "Recover access via your registered mobile number"}
                {step === 2 && `SMS code sent to ${maskedTarget}`}
                {step === 3 && "Create a new secure password for your account"}
                {step === 4 && "Your password has been successfully updated"}
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          {step < 4 && (
            <div className="flex items-center gap-2 mt-5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    s === step
                      ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]"
                      : s < step
                      ? "bg-white/80"
                      : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7">
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200/80 rounded-2xl px-4 py-3 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-600 text-[20px] shrink-0 mt-0.5">
                error
              </span>
              <div className="flex-1 text-xs sm:text-sm text-red-700 leading-snug">
                {error}
              </div>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-700"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* STEP 1: Enter Mobile */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Registered Mobile Number
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors text-[20px] pointer-events-none">
                    phone_android
                  </span>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all font-medium"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  We will send a 6-digit SMS verification code to your phone.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-60 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending SMS...
                    </>
                  ) : (
                    <>
                      Send SMS OTP
                      <span className="material-symbols-outlined text-[18px]">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Enter 6-Digit OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Enter 6-Digit SMS OTP
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-emerald-700 font-bold hover:underline"
                  >
                    Change Number
                  </button>
                </div>

                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors text-[20px] pointer-events-none">
                    pin
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6 digits (e.g. 123456)"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    required
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-[18px] text-slate-900 tracking-[0.3em] font-mono placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all font-bold"
                  />
                </div>

                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-slate-500">Didn&apos;t receive SMS?</span>
                  {countdown > 0 ? (
                    <span className="text-slate-400 font-medium font-mono">
                      Resend in {countdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="text-emerald-700 font-bold hover:underline"
                    >
                      Resend SMS OTP
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-2/3 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Code
                      <span className="material-symbols-outlined text-[18px]">
                        verified
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors text-[20px] pointer-events-none">
                    lock
                  </span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-11 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showNewPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors text-[20px] pointer-events-none">
                    lock_clock
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-11 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showConfirmPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-2/3 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      Update Password
                      <span className="material-symbols-outlined text-[18px]">
                        check_circle
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Success Message */}
          {step === 4 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700 animate-bounce">
                <span className="material-symbols-outlined text-[36px]">
                  check_circle
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                Password Successfully Reset!
              </h4>
              <p className="text-sm text-slate-600 max-w-[320px] mx-auto">
                Your new password is now active. Returning you to the sign-in screen...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
