import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuthStore from "../../stores/auth.store";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError(err.response?.data?.error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex">
      <div className="w-full flex">
        {/* Left Side - Editorial Content */}
        <div className="hidden lg:flex w-1/2 relative bg-surface-container-highest">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBu3pr4U7oKtJbQULJB8mzgvMWa8328HhCorKsYSzhTKKFP0w1OAbMY4Yaw0YGxreD0vX7LNioT2JqepVRsAu2T7yhNSBbJPHkICey52GnLh5KkMwupSou6FMVX6qrvB2GoLi0q8Y2IP3M9D4TJh3f0nr6vDaFg0X_jIETyycsPEJ8UOYwuMCEpUgnfXK75p3PbDVTQ79wZ9QM4kPilDtS2bH_8erhTD04cjUabxWtSveqAoWewOkFfjA')" }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-on-primary-fixed/90 to-on-primary-fixed/40 mix-blend-multiply" />
          </div>
          <div className="relative z-10 p-16 flex flex-col justify-end text-white max-w-2xl">
            <h1 className="font-display-lg text-display-lg mb-stack-lg leading-tight">
              Welcome Back
            </h1>
            <p className="font-body-lg text-body-lg text-primary-fixed-dim opacity-90 max-w-lg">
              Access your society dashboard and continue managing your community with ResidentOne's powerful tools.
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center p-margin-mobile md:p-margin-desktop py-16">
          <div className="w-full max-w-md">
            <div className="mb-stack-lg text-center lg:text-left">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">Log In to Your Account</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Enter your credentials to access your society dashboard.
              </p>
            </div>

            {error && <p className="text-error mb-4 text-body-sm">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-stack-md">
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-unit" htmlFor="email">Email Address</label>
                <input
                  className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
                  id="email"
                  name="email"
                  type="email"
                  placeholder="rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-unit" htmlFor="password">Password</label>
                  <a href="#forgot" className="font-label-sm text-label-sm text-primary hover:underline">Forgot Password?</a>
                </div>
                <input
                  className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="pt-stack-sm">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-label-md text-label-md bg-inverse-surface text-white py-3 rounded-lg hover:bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                >
                  {loading ? "Logging in..." : "Log In"}
                </button>
              </div>
            </form>

            <div className="mt-stack-lg text-center">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Don't have an account?
                <Link to="/register" className="text-primary font-label-md hover:underline hover:text-primary-container transition-colors ml-1">
                  Join Your Society
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
