import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuthStore from "../../stores/auth.store";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const fullName = [firstName, lastName].filter(Boolean).join(" ");
      await register(fullName, email, phone, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Registration failed");
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
              Join Your Digital Community
            </h1>
            <p className="font-body-lg text-body-lg text-primary-fixed-dim opacity-90 max-w-lg">
              Experience a new standard of residential management. ResidentOne brings transparency, effortless connection, and professional governance directly to your fingertips.
            </p>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center p-margin-mobile md:p-margin-desktop py-16">
          <div className="w-full max-w-md">
            <div className="mb-stack-lg text-center lg:text-left">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">Create an Account</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Sign up to manage your society operations efficiently.
              </p>
            </div>

            {error && <p className="text-error mb-4 text-body-sm">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-stack-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-unit" htmlFor="firstName">First Name</label>
                  <input
                    className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Rahul"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-unit" htmlFor="lastName">Last Name</label>
                  <input
                    className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Sharma"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
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
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-unit" htmlFor="phone">Phone Number</label>
                <input
                  className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-unit" htmlFor="password">Password</label>
                <input
                  className="w-full bg-white border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="pt-stack-sm">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-label-md text-label-md bg-inverse-surface text-white py-3 rounded-lg hover:bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </div>
            </form>

            <div className="mt-stack-lg text-center">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Already have an account?
                <Link to="/login" className="text-primary font-label-md hover:underline hover:text-primary-container transition-colors ml-1">
                  Log In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
