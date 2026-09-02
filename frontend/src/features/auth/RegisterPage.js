import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuthStore from "../../stores/auth.store";
import SEO from "../../components/SEO";

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "", width: "0%" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { score, label: "Weak", color: "bg-error", width: "25%" };
  if (score === 3) return { score, label: "Fair", color: "bg-amber-500", width: "50%" };
  if (score === 4) return { score, label: "Good", color: "bg-emerald-500", width: "75%" };
  return { score, label: "Strong", color: "bg-emerald-600", width: "100%" };
}

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = !confirmPassword || password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!agree) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      await register(fullName, email, phone, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-surface-container-lowest pt-16 md:pt-24">
      <SEO
        title="Create Society Account — 30 Days Free Trial"
        description="Register your housing society or apartment complex with ResidentOne. Get started in 5 minutes with a 30-day free trial, no credit card required."
        canonicalPath="/register"
      />
      <div className="w-full flex flex-col lg:flex-row min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-96px)] max-w-[1680px] mx-auto">
          {/* Left - Editorial */}
          <div className="hidden lg:flex lg:w-[54%] xl:w-[56%] relative bg-inverse-surface overflow-hidden flex-col justify-between">
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="absolute -top-40 -right-40 w-[640px] h-[640px] bg-primary rounded-full blur-[140px] opacity-[0.18]" />
            <div className="absolute -bottom-40 -left-40 w-[560px] h-[560px] bg-tertiary rounded-full blur-[140px] opacity-[0.14]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-white/[0.06] rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] border border-white/[0.04] rounded-full" />

            <div className="relative z-10 p-10 xl:p-14 2xl:p-16 pb-8">
              <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-full px-4 py-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-white/90 text-xs font-semibold tracking-widest uppercase">
                  New societies get 30 days free • No card required
                </span>
              </div>

              <h1 className="mt-10 font-display text-[42px] xl:text-[54px] 2xl:text-[58px] font-bold leading-[0.9] tracking-tight text-white">
                Join your
                <br />
                <span className="font-light italic text-primary-fixed-dim">digital</span>
                <br />
                community.
              </h1>
              <p className="mt-6 text-white/60 text-[16px] xl:text-[17px] leading-relaxed max-w-[520px]">
                Experience a new standard of residential management. Transparency,
                effortless connection, and professional governance at your
                fingertips.
              </p>

              <div className="mt-10 space-y-4 max-w-[520px]">
                {[
                  {
                    icon: "rocket_launch",
                    title: "Set up in 5 minutes",
                    desc: "Create your society and invite residents instantly",
                    step: "01",
                  },
                  {
                    icon: "group_add",
                    title: "Invite & onboard",
                    desc: "Bulk import residents or share a secure invite link",
                    step: "02",
                  },
                  {
                    icon: "insights",
                    title: "Go live with confidence",
                    desc: "Billing, complaints, visitors — everything just works",
                    step: "03",
                  },
                ].map((f) => (
                  <div
                    key={f.title}
                    className="flex items-center gap-4 bg-white/[0.06] backdrop-blur border border-white/10 rounded-2xl px-5 py-4"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-[22px]">{f.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-semibold leading-none flex items-center gap-2">
                        {f.title}
                        <span className="text-white/30 text-[11px] font-mono tracking-widest">{f.step}</span>
                      </div>
                      <div className="text-white/60 text-xs mt-1">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 p-10 xl:p-14 2xl:p-16 pt-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { k: "500+", v: "Societies" },
                  { k: "50k+", v: "Residents" },
                  { k: "99.9%", v: "Uptime" },
                ].map((s) => (
                  <div
                    key={s.v}
                    className="bg-white/[0.06] backdrop-blur border border-white/10 rounded-2xl p-4 text-center"
                  >
                    <div className="text-white font-bold text-xl leading-none">{s.k}</div>
                    <div className="text-white/60 text-[11px] tracking-widest uppercase font-semibold mt-1">
                      {s.v}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-[20px] p-6 xl:p-7">
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-amber-400 text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                  <span className="ml-2 text-white/70 text-xs font-medium">Loved by secretaries</span>
                </div>
                <p className="text-white text-[15px] leading-relaxed font-medium">
                  “We onboarded 280 flats in a day. The import tool is magic and support
                  actually answers.”
                </p>
                <div className="flex items-center gap-3 mt-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                    R
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold leading-none">Rajesh Kumar</div>
                    <div className="text-white/60 text-xs mt-1">President, Lotus Elite • 280 flats</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div className="flex-1 flex items-start lg:items-center justify-center bg-surface-container-lowest px-4 sm:px-6 lg:px-10 xl:px-14 py-8 lg:py-10 overflow-y-auto">
            <div className="w-full max-w-[480px] my-auto">
              <div className="lg:hidden flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-inverse-surface rounded-xl flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-white text-[22px]">apartment</span>
                </div>
                <div>
                  <div className="font-bold text-[18px] tracking-tight leading-none text-on-surface">
                    ResidentOne
                  </div>
                  <div className="text-[11px] tracking-widest uppercase font-semibold text-on-surface-variant">
                    Society OS
                  </div>
                </div>
                <span className="ml-auto text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                  30 days free
                </span>
              </div>

              <div className="bg-white border border-outline-variant/30 rounded-[28px] shadow-[0_24px_64px_-24px_rgba(0,23,75,0.18),0_12px_32px_-16px_rgba(0,23,75,0.08)] overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-primary via-primary to-tertiary" />
                <div className="p-7 sm:p-8">
                  <div className="mb-7">
                    <h2 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-on-surface leading-none">
                      Create account
                    </h2>
                    <p className="text-on-surface-variant text-sm mt-2.5 leading-relaxed">
                      Start managing your society operations efficiently. No credit card
                      required.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 bg-error-container border border-error/15 rounded-2xl px-4 py-3.5 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-error text-[18px]">error</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-on-error-container text-sm font-semibold leading-none">
                          Unable to create account
                        </p>
                        <p className="text-on-error-container/80 text-sm mt-1 leading-snug break-words">
                          {error}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setError("")}
                        className="self-start w-7 h-7 rounded-full hover:bg-error/10 flex items-center justify-center text-on-error-container/60 hover:text-on-error-container transition-colors"
                        aria-label="Dismiss error"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="firstName"
                          className="block text-xs font-semibold tracking-widest uppercase text-on-surface-variant mb-2"
                        >
                          First name <span className="text-error">*</span>
                        </label>
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[20px] pointer-events-none">
                            person
                          </span>
                          <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            autoComplete="given-name"
                            placeholder="Rahul"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-11 pr-4 py-3.5 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="lastName"
                          className="block text-xs font-semibold tracking-widest uppercase text-on-surface-variant mb-2"
                        >
                          Last name
                        </label>
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          autoComplete="family-name"
                          placeholder="Sharma"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3.5 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-semibold tracking-widest uppercase text-on-surface-variant mb-2"
                      >
                        Email address <span className="text-error">*</span>
                      </label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[20px] pointer-events-none">
                          mail
                        </span>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="rahul@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-11 pr-4 py-3.5 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-xs font-semibold tracking-widest uppercase text-on-surface-variant mb-2"
                      >
                        Phone number{" "}
                        <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">
                          (optional)
                        </span>
                      </label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[20px] pointer-events-none">
                          call
                        </span>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="+91 98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-11 pr-4 py-3.5 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className="block text-xs font-semibold tracking-widest uppercase text-on-surface-variant mb-2"
                      >
                        Password <span className="text-error">*</span>
                      </label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[20px] pointer-events-none">
                          lock
                        </span>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="At least 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-11 pr-11 py-3.5 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {showPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                      {password && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-on-surface-variant">
                              Password strength
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                strength.label === "Weak"
                                  ? "text-error"
                                  : strength.label === "Fair"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {strength.label}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                            <div
                              className={`h-full ${strength.color} transition-all duration-500`}
                              style={{ width: strength.width }}
                            />
                          </div>
                          <p className="text-[11px] text-on-surface-variant/70 mt-1.5 leading-relaxed">
                            Use 8+ characters with a mix of letters, numbers & symbols.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-xs font-semibold tracking-widest uppercase text-on-surface-variant mb-2"
                      >
                        Confirm password <span className="text-error">*</span>
                      </label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[20px] pointer-events-none">
                          lock_reset
                        </span>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirm ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Repeat your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className={`w-full bg-surface-container-low border rounded-xl pl-11 pr-11 py-3.5 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-white focus:ring-4 transition-all ${
                            !passwordsMatch
                              ? "border-error focus:border-error focus:ring-error/10"
                              : "border-outline-variant/40 focus:border-primary focus:ring-primary/10"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                          aria-label={showConfirm ? "Hide password" : "Show password"}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {showConfirm ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                      {!passwordsMatch && (
                        <p className="text-xs text-error mt-1.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">error</span>
                          Passwords do not match
                        </p>
                      )}
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer group select-none py-1">
                      <div className="relative flex items-center mt-0.5">
                        <input
                          type="checkbox"
                          checked={agree}
                          onChange={(e) => setAgree(e.target.checked)}
                          className="peer w-[18px] h-[18px] rounded-[6px] border-[1.5px] border-outline-variant bg-white checked:bg-primary checked:border-primary transition-all appearance-none"
                        />
                        <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-[14px] opacity-0 peer-checked:opacity-100 pointer-events-none font-bold">
                          check
                        </span>
                      </div>
                      <span className="text-sm leading-relaxed text-on-surface-variant">
                        I agree to the{" "}
                        <a
                          href="#terms"
                          onClick={(e) => e.preventDefault()}
                          className="font-semibold text-on-surface underline decoration-outline-variant underline-offset-4 hover:text-primary hover:decoration-primary"
                        >
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a
                          href="#privacy"
                          onClick={(e) => e.preventDefault()}
                          className="font-semibold text-on-surface underline decoration-outline-variant underline-offset-4 hover:text-primary hover:decoration-primary"
                        >
                          Privacy Policy
                        </a>
                        .
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary-container active:bg-[#0e3828] disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl shadow-[0_10px_24px_-10px_rgba(19,74,54,0.5)] hover:shadow-[0_12px_28px_-10px_rgba(19,74,54,0.55)] hover:-translate-y-[1px] active:translate-y-0 transition-all flex items-center justify-center gap-2 text-[15px] mt-2"
                    >
                      {loading ? (
                        <>
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create account
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-7 text-center">
                    <p className="text-sm text-on-surface-variant">
                      Already have an account?{" "}
                      <Link
                        to="/login"
                        className="font-semibold text-primary hover:underline underline-offset-4 decoration-2"
                      >
                        Log in
                      </Link>
                    </p>
                  </div>
                </div>
                <div className="bg-surface-container-low border-t border-outline-variant/20 px-7 sm:px-8 py-4 flex items-center justify-center gap-2 text-xs text-on-surface-variant text-center">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">
                    verified_user
                  </span>
                  <span>Protected by 256-bit encryption • GDPR compliant</span>
                </div>
              </div>

              <p className="text-center text-[11px] text-on-surface-variant/60 mt-4 px-4">
                By creating an account you agree to our Terms and confirm you have read our
                Privacy Policy.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
