import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuthStore from "../../stores/auth.store";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-surface-container-lowest pt-16 md:pt-24">
      <div className="w-full flex flex-col lg:flex-row min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-96px)] max-w-[1680px] mx-auto">
          {/* Left - Brand / Editorial */}
          <div className="hidden lg:flex lg:w-[54%] xl:w-[56%] relative bg-inverse-surface overflow-hidden flex-col justify-between">
            {/* subtle pattern */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="absolute -top-40 -right-40 w-[640px] h-[640px] bg-primary rounded-full blur-[140px] opacity-[0.18]" />
            <div className="absolute -bottom-40 -left-40 w-[560px] h-[560px] bg-tertiary rounded-full blur-[140px] opacity-[0.12]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-white/[0.06] rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] border border-white/[0.04] rounded-full" />

            <div className="relative z-10 p-10 xl:p-14 2xl:p-16 pb-8">
              <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-full px-4 py-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-white/90 text-xs font-semibold tracking-widest uppercase">
                  Trusted by 500+ societies • 50k+ residents
                </span>
              </div>

              <h1 className="mt-10 font-display text-[44px] xl:text-[56px] 2xl:text-[62px] font-bold leading-[0.9] tracking-tight text-white">
                Welcome
                <br />
                <span className="font-light italic text-primary-fixed-dim">back</span> to
                <br />
                your community.
              </h1>
              <p className="mt-6 text-white/60 text-[16px] xl:text-[17px] leading-relaxed max-w-[520px]">
                Sign in to manage maintenance, visitors, complaints and stay
                connected with your society — all in one secure place.
              </p>

              <div className="mt-10 grid grid-cols-1 gap-4 max-w-[520px]">
                {[
                  {
                    icon: "verified_user",
                    title: "Bank-grade security",
                    desc: "256-bit encryption & SOC 2 compliant",
                  },
                  {
                    icon: "bolt",
                    title: "Lightning fast",
                    desc: "95% of tasks completed in under 2 minutes",
                  },
                  {
                    icon: "support_agent",
                    title: "Human support",
                    desc: "Average response time under 4 hours",
                  },
                ].map((f) => (
                  <div
                    key={f.title}
                    className="flex items-center gap-4 bg-white/[0.06] backdrop-blur border border-white/10 rounded-2xl px-5 py-4"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-[22px]">
                        {f.icon}
                      </span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold leading-none">
                        {f.title}
                      </div>
                      <div className="text-white/60 text-xs mt-1">
                        {f.desc}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-white/20 ml-auto text-[18px]">
                      arrow_forward
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 p-10 xl:p-14 2xl:p-16 pt-6">
              <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-[20px] p-6 xl:p-7 shadow-2xl">
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-amber-400 text-[18px] fill-current"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                  <span className="ml-2 text-white/70 text-xs font-medium">
                    4.9/5 from 2,400+ reviews
                  </span>
                </div>
                <p className="text-white text-[15px] leading-relaxed font-medium">
                  “ResidentOne cut our manual work by 80%. Collections are on
                  time, complaints are tracked, and residents actually love
                  using it.”
                </p>
                <div className="flex items-center gap-3 mt-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-fixed-dim to-primary flex items-center justify-center text-white font-bold text-sm">
                    P
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold leading-none">
                      Priya Mehta
                    </div>
                    <div className="text-white/60 text-xs mt-1">
                      Secretary, Green Valley Heights • 312 flats
                    </div>
                  </div>
                  <div className="ml-auto hidden xl:flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/20 rounded-full px-3 py-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-300 text-xs font-semibold">
                      Verified
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-5 mt-6 text-white/50 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">
                    shield
                  </span>{" "}
                  ISO 27001 Certified
                </span>
                <span className="w-1 h-1 bg-white/20 rounded-full" />
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">
                    lock
                  </span>{" "}
                  SSL Secured
                </span>
                <span className="w-1 h-1 bg-white/20 rounded-full" />
                <span>GDPR Compliant</span>
              </div>
            </div>
          </div>

          {/* Right - Form */}
          <div className="flex-1 flex items-center justify-center bg-surface-container-lowest px-4 sm:px-6 lg:px-10 xl:px-14 py-8 lg:py-10">
            <div className="w-full max-w-[460px]">
              {/* Mobile brand */}
              <div className="lg:hidden flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-inverse-surface rounded-xl flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-white text-[22px]">
                    apartment
                  </span>
                </div>
                <div>
                  <div className="font-bold text-[18px] tracking-tight leading-none text-on-surface">
                    ResidentOne
                  </div>
                  <div className="text-[11px] tracking-widest uppercase font-semibold text-on-surface-variant">
                    Society OS
                  </div>
                </div>
                <span className="ml-auto text-xs font-medium text-on-surface-variant bg-surface-container border border-outline-variant/30 px-3 py-1.5 rounded-full">
                  Secure login
                </span>
              </div>

              <div className="bg-white border border-outline-variant/30 rounded-[28px] shadow-[0_24px_64px_-24px_rgba(0,23,75,0.18),0_12px_32px_-16px_rgba(0,23,75,0.08)] overflow-hidden">
                {/* Top accent */}
                <div className="h-1 w-full bg-gradient-to-r from-primary via-primary to-tertiary" />
                <div className="p-7 sm:p-8">
                  <div className="mb-7">
                    <h2 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-on-surface leading-none">
                      Sign in
                    </h2>
                    <p className="text-on-surface-variant text-sm mt-2.5 leading-relaxed">
                      Welcome back — please enter your details to access your
                      dashboard.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 bg-error-container border border-error/15 rounded-2xl px-4 py-3.5 flex gap-3 animate-[fadeIn_0.2s_ease]">
                      <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-error text-[18px]">
                          error
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-on-error-container text-sm font-semibold leading-none">
                          Unable to sign in
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
                        <span className="material-symbols-outlined text-[18px]">
                          close
                        </span>
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-semibold tracking-widest uppercase text-on-surface-variant mb-2"
                      >
                        Email or phone
                      </label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[20px] pointer-events-none">
                          mail
                        </span>
                        <input
                          id="email"
                          name="email"
                          type="text"
                          autoComplete="username"
                          placeholder="you@example.com or 98765 43210"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-11 pr-4 py-3.5 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="password"
                          className="block text-xs font-semibold tracking-widest uppercase text-on-surface-variant"
                        >
                          Password
                        </label>
                        <a
                          href="#forgot"
                          onClick={(e) => e.preventDefault()}
                          className="text-xs font-semibold text-primary hover:text-primary/80 hover:underline underline-offset-4 transition-colors"
                        >
                          Forgot password?
                        </a>
                      </div>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[20px] pointer-events-none">
                          lock
                        </span>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-11 pr-11 py-3.5 text-[15px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {showPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group select-none py-1">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="peer w-[18px] h-[18px] rounded-[6px] border-[1.5px] border-outline-variant bg-white checked:bg-primary checked:border-primary transition-all appearance-none"
                        />
                        <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-[14px] opacity-0 peer-checked:opacity-100 pointer-events-none font-bold">
                          check
                        </span>
                      </div>
                      <span className="text-sm font-medium text-on-surface group-hover:text-on-surface transition-colors">
                        Remember for 30 days
                      </span>
                      <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Secure device
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary hover:bg-[#0040b8] active:bg-[#00359b] disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl shadow-[0_10px_24px_-10px_rgba(0,83,219,0.6)] hover:shadow-[0_12px_28px_-10px_rgba(0,83,219,0.65)] hover:-translate-y-[1px] active:translate-y-0 transition-all flex items-center justify-center gap-2 text-[15px]"
                    >
                      {loading ? (
                        <>
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign in
                          <span className="material-symbols-outlined text-[18px]">
                            arrow_forward
                          </span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-7 text-center">
                    <p className="text-sm text-on-surface-variant">
                      Don&apos;t have an account?{" "}
                      <Link
                        to="/register"
                        className="font-semibold text-primary hover:underline underline-offset-4 decoration-2"
                      >
                        Create account
                      </Link>
                    </p>
                  </div>
                </div>

                {/* Bottom trust */}
                <div className="bg-surface-container-low border-t border-outline-variant/20 px-7 sm:px-8 py-4 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">
                    verified_user
                  </span>
                  Protected by 256-bit encryption •{" "}
                  <a
                    href="#privacy"
                    onClick={(e) => e.preventDefault()}
                    className="underline decoration-dotted underline-offset-4 hover:text-on-surface"
                  >
                    Privacy
                  </a>{" "}
                  &{" "}
                  <a
                    href="#terms"
                    onClick={(e) => e.preventDefault()}
                    className="underline decoration-dotted underline-offset-4 hover:text-on-surface"
                  >
                    Terms
                  </a>
                </div>
              </div>

              {/* Demo helper */}
              <div className="mt-5 bg-primary-fixed/40 border border-primary-fixed-dim/20 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-[16px]">
                    lightbulb
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-primary-fixed text-xs font-bold uppercase tracking-widest">
                    Try demo account
                  </p>
                  <p className="text-on-primary-fixed-variant text-xs mt-1 font-mono break-all">
                    demo@residentone.com / demo123
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("demo@residentone.com");
                    setPassword("demo123");
                  }}
                  className="shrink-0 text-xs font-bold bg-white text-primary px-4 py-2 rounded-full border border-outline-variant/30 hover:bg-surface-container shadow-sm hover:shadow transition-all"
                >
                  Fill
                </button>
              </div>

              <p className="text-center text-[11px] text-on-surface-variant/60 mt-4">
                By signing in you agree to our Terms and acknowledge our Privacy
                Policy.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
