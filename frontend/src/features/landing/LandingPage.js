import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const ROTATING_WORDS = [
  { word: "Living", tag: "Residential Living", icon: "home" },
  { word: "Security", tag: "Gate Intercom & Passes", icon: "shield_person" },
  { word: "Finances", tag: "Zero-Fee UPI Collections", icon: "payments" },
  { word: "Management", tag: "Transparent Voting & Ops", icon: "forum" },
  { word: "Governance", tag: "Digital Audit Ledgers", icon: "account_balance" },
];

const LIVE_EVENTS = [
  {
    icon: "door_front",
    title: "Visitor at Main Gate",
    subtitle: "Amazon Delivery • Gate 1 Pass Verified",
    badge: "Pre-Approved",
    tint: "bg-[#E8FDF2] text-[#006948]",
    isBeacon: true,
  },
  {
    icon: "payments",
    title: "Maintenance Settled",
    subtitle: "Flat A-402 • ₹4,500 via UPI QR Auto-Receipt",
    badge: "Paid Instantly",
    tint: "bg-[#E0F2FE] text-[#0369A1]",
    isBeacon: false,
  },
  {
    icon: "ring_volume",
    title: "Audible Gate Intercom",
    subtitle: "Security guard connected with Resident",
    badge: "Calling Live",
    tint: "bg-[#FEF3C7] text-[#B45309]",
    isBeacon: true,
  },
];

const features = [
  {
    icon: "build",
    title: "Automated Maintenance",
    desc: "Automate monthly billing, zero-commission UPI payments, transparent expense tracking, and real-time dues ledgers.",
    tint: "bg-[#E0F2FE] text-[#0369A1]",
    tag: "Finance",
  },
  {
    icon: "shield_person",
    title: "Smart Gate & Visitors",
    desc: "Digital visitor pre-approvals, instantaneous guard intercom calls, delivery leave-at-gate logs, and staff registry.",
    tint: "bg-[#E8FDF2] text-[#006948]",
    tag: "Security",
  },
  {
    icon: "forum",
    title: "Community & Voting",
    desc: "Moderated society noticeboard, digital ballot polling, resident directory with privacy masking, and emergency SOS alerts.",
    tint: "bg-[#EDE9FE] text-[#6D28D9]",
    tag: "Community",
  },
  {
    icon: "event_available",
    title: "Facility & Amenities",
    desc: "Instant self-service reservations for clubhouses, swimming pools, tennis courts, and party halls with slot conflict prevention.",
    tint: "bg-[#FEF3C7] text-[#B45309]",
    tag: "Amenities",
  },
];

const steps = [
  {
    n: "01",
    title: "Onboard Your Society",
    desc: "Upload wings, flats, and resident directories. Bulk invite homeowners and tenants with secure instant access links.",
    icon: "upload_file",
  },
  {
    n: "02",
    title: "Configure & Automate",
    desc: "Set recurring monthly maintenance rules, assign gate security guards, and establish amenity booking slots in minutes.",
    icon: "tune",
  },
  {
    n: "03",
    title: "Seamless Daily Living",
    desc: "Residents pay dues, approve visitors, book amenities, and vote on community initiatives directly from their phones.",
    icon: "sentiment_satisfied",
  },
];

const landingSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "ResidentOne — Modern Residential Society & Apartment Management Platform",
  description: "Streamline society maintenance, enhance gate security with digital visitor passes, and simplify community communication.",
  url: "https://residentone.app/",
  mainEntity: {
    "@type": "SoftwareApplication",
    name: "ResidentOne",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "2400",
    },
  },
};

export default function LandingPage() {
  const [wordIdx, setWordIdx] = useState(0);
  const [eventIdx, setEventIdx] = useState(0);
  const [animatingWord, setAnimatingWord] = useState(false);

  // Cycle rotating words in Hero Title
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatingWord(true);
      setTimeout(() => {
        setWordIdx((prev) => (prev + 1) % ROTATING_WORDS.length);
        setAnimatingWord(false);
      }, 250);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Cycle live events in the floating Apple Mockup Card
  useEffect(() => {
    const eventTimer = setInterval(() => {
      setEventIdx((prev) => (prev + 1) % LIVE_EVENTS.length);
    }, 3600);
    return () => clearInterval(eventTimer);
  }, []);

  const currentWord = ROTATING_WORDS[wordIdx];
  const currentEvent = LIVE_EVENTS[eventIdx];

  return (
    <div className="bg-surface overflow-hidden">
      <SEO
        title="Smart Society & Apartment Management Platform"
        description="Streamline maintenance requests, automate billing, enhance gate security with visitor approvals, and unite your residential community with ResidentOne."
        keywords={[
          "residential society management",
          "apartment billing system",
          "housing society app",
          "visitor gate management",
          "resident communication platform",
          "society maintenance collection",
        ]}
        canonicalPath="/"
        schema={landingSchema}
      />

      {/* 🍏 Apple HIG Hero Section with High-Impact Animations */}
      <header className="relative pt-24 pb-16 md:pt-36 md:pb-28 overflow-hidden bg-gradient-to-b from-[#E8FDF2]/50 via-surface to-surface">
        {/* Animated Ambient Apple Glow Backdrops */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[720px] h-[380px] bg-primary/12 rounded-full blur-[130px] pointer-events-none animate-float-slow" />
        <div className="absolute -top-24 right-[-100px] w-[460px] h-[460px] bg-tertiary/12 rounded-full blur-[140px] pointer-events-none animate-float-reverse" />
        <div className="absolute top-1/2 left-[-100px] w-[350px] h-[350px] bg-primary-fixed/20 rounded-full blur-[110px] pointer-events-none animate-pulse-glow" />

        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
              {/* Apple Pill Tag with Pulsing Beacon */}
              <div className="inline-flex items-center gap-2.5 bg-white/95 backdrop-blur-xl px-4 py-1.5 rounded-full border border-black/[0.06] shadow-xs hover:border-primary/30 transition-colors">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs font-semibold text-on-surface tracking-wide flex items-center gap-1.5">
                  <span>Smart Society Platform</span>
                  <span className="text-on-surface-muted">•</span>
                  <span className="text-primary font-bold">Trusted by 500+ Societies</span>
                </span>
              </div>

              {/* 🍏 Dynamic Animated Hero Title — Structured in 3 Lines for Desktop */}
              <h1 className="text-[38px] sm:text-[50px] lg:text-[58px] xl:text-[66px] font-bold leading-[1.08] tracking-tight text-on-surface font-display min-h-[140px] sm:min-h-[175px] lg:min-h-[200px] xl:min-h-[225px]">
                <span className="block">Community</span>
                <span className="block">
                  <span
                    key={currentWord.word}
                    className={`italic text-gradient-shimmer inline-block pr-2 transition-all duration-300 transform ${
                      animatingWord
                        ? "opacity-0 -translate-y-3 scale-95"
                        : "opacity-100 translate-y-0 scale-100"
                    }`}
                  >
                    {currentWord.word}
                  </span>
                  {" "}
                </span>
                <span className="block text-on-surface">Perfected.</span>
              </h1>

              <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                Streamline maintenance billing, approve gate visitors in real time, and foster transparent residential governance with an intelligent, high-trust management platform built for modern residential communities.
              </p>

              {/* Apple Capsule Buttons with Tactile Spring */}
              <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto mt-2">
                <Link
                  to="/register"
                  className="ios-btn-primary px-8 py-3.5 text-body-sm no-underline shadow-[0_4px_16px_rgba(0,105,72,0.25)] group"
                >
                  <span>Get Started Free</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/features"
                  className="ios-btn-secondary px-7 py-3.5 text-body-sm no-underline group"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary group-hover:rotate-90 transition-transform">
                    grid_view
                  </span>
                  <span>Explore Modules</span>
                </Link>
              </div>

              {/* Social Proof Avatars */}
              <div className="flex items-center gap-3.5 mt-4 pt-6 border-t border-black/[0.06] w-full justify-center lg:justify-start">
                <div className="flex -space-x-2.5">
                  {["P", "A", "N", "R"].map((initial, i) => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full border-2 border-white bg-primary-light flex items-center justify-center text-xs font-bold text-primary shadow-xs hover:-translate-y-0.5 transition-transform"
                    >
                      {initial}
                    </div>
                  ))}
                </div>
                <div className="text-left text-body-sm text-on-surface-variant">
                  <span className="font-bold text-on-surface">50,000+</span> Residents connected across 500+ societies
                </div>
              </div>
            </div>

            {/* Right Mockup Card with Floating Elements and Live Activity Ticker */}
            <div className="lg:col-span-5 relative w-full flex justify-center">
              {/* Floating Badge 1 (Top Left) */}
              <div className="absolute -top-6 -left-6 z-20 hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-xl px-4 py-2 rounded-full border border-black/[0.08] shadow-apple animate-float">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">verified_user</span>
                </div>
                <span className="text-xs font-bold text-on-surface">256-Bit Gate Security</span>
              </div>

              {/* Floating Badge 2 (Bottom Right) */}
              <div className="absolute -bottom-5 -right-5 z-20 hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-xl px-4 py-2 rounded-full border border-black/[0.08] shadow-apple floating-delayed">
                <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">bolt</span>
                </div>
                <span className="text-xs font-bold text-on-surface">Instant UPI Receipts</span>
              </div>

              {/* Central Floating Apple Window */}
              <div className="w-full max-w-[460px] bg-white rounded-3xl border border-black/[0.08] shadow-[0_20px_50px_rgba(0,33,22,0.12)] p-5 relative hover:shadow-[0_24px_60px_rgba(0,33,22,0.16)] transition-shadow duration-300">
                {/* Mockup Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider bg-surface-container px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span>ResidentOne OS</span>
                  </div>
                </div>

                {/* Mockup Content Widgets */}
                <div className="mt-4 space-y-3.5">
                  {/* Digital Wallet Card with Apple Shimmer */}
                  <div className="rounded-2xl bg-gradient-to-br from-[#004730] to-[#006948] p-4 text-white shadow-md relative overflow-hidden group">
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
                    
                    <div className="flex justify-between items-center text-xs opacity-85">
                      <span>Society Maintenance Balance</span>
                      <span className="material-symbols-outlined text-[16px]">contactless</span>
                    </div>
                    <div className="text-2xl font-bold mt-2 font-display">
                      ₹ 4,500 <span className="text-xs font-normal opacity-75">Due in 5 days</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/15 text-[11px]">
                      <span>Flat A-402 • Green Valley</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full font-semibold">Active Member</span>
                    </div>
                  </div>

                  {/* 🍏 Dynamic Live Event Card (Transitions smoothly between 3 events) */}
                  <div
                    key={currentEvent.title}
                    className="rounded-2xl bg-[#E8FDF2] border border-primary/20 p-3.5 flex items-center gap-3 transition-all duration-300 animate-fade-slide-up"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">{currentEvent.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                        <span>{currentEvent.title}</span>
                        {currentEvent.isBeacon && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        )}
                      </div>
                      <div className="text-[11px] text-on-surface-variant truncate">
                        {currentEvent.subtitle}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-primary bg-white px-2.5 py-1 rounded-full border border-primary/20 shadow-xs shrink-0">
                      {currentEvent.badge}
                    </span>
                  </div>

                  {/* Quick Feature Metric Strip */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-surface-container/60 p-3 border border-black/[0.04] hover:bg-surface-container transition-colors">
                      <div className="text-xs text-on-surface-variant">Active Complaints</div>
                      <div className="text-lg font-bold text-on-surface mt-0.5 font-display">0 Pending</div>
                      <div className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">check</span>
                        <span>100% Resolved</span>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-surface-container/60 p-3 border border-black/[0.04] hover:bg-surface-container transition-colors">
                      <div className="text-xs text-on-surface-variant">Clubhouse Slots</div>
                      <div className="text-lg font-bold text-on-surface mt-0.5 font-display">Reserved</div>
                      <div className="text-[10px] text-primary font-medium mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        <span>Today 6:00 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 🍏 Features Grid (Apple Squircles & Micro Hover Animations) */}
      <section className="py-20 md:py-28 bg-white border-y border-black/[0.05]">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
          <div className="text-center max-w-2xl mx-auto mb-14 md:mb-20">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15 inline-block">
              Comprehensive Platform
            </span>
            <h2 className="text-[30px] md:text-[40px] font-bold text-on-surface mt-4 tracking-tight font-display">
              Engineered for Peace of Mind.
            </h2>
            <p className="text-body-md text-on-surface-variant mt-3 leading-relaxed">
              Replace chaotic WhatsApp chats and manual registers with intelligent, structured workflows designed for clarity and peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="ios-card p-6 md:p-7 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${f.tint} shadow-xs group-hover:scale-110 group-hover:rotate-2 transition-transform duration-200`}>
                    <span className="material-symbols-outlined text-[24px]">{f.icon}</span>
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-muted mb-1">
                    {f.tag}
                  </div>
                  <h3 className="text-lg font-bold text-on-surface mb-2 font-display group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {f.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-black/[0.04] flex items-center text-xs font-semibold text-primary group-hover:translate-x-1.5 transition-transform duration-200">
                  <span>Learn more</span>
                  <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🍏 Apple Ambient Stats Strip with Animated Glow */}
      <section className="py-14 md:py-20 bg-surface">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
          <div className="rounded-3xl bg-gradient-to-br from-[#004730] via-[#006948] to-[#002117] text-white p-8 md:p-14 shadow-apple-hero relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
              <div className="pt-4 md:pt-0 hover:scale-105 transition-transform duration-200">
                <div className="text-[38px] md:text-[52px] font-bold font-display leading-none mb-2">500+</div>
                <div className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Societies Managed</div>
              </div>
              <div className="pt-4 md:pt-0 hover:scale-105 transition-transform duration-200">
                <div className="text-[38px] md:text-[52px] font-bold font-display leading-none mb-2">50k+</div>
                <div className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Connected Residents</div>
              </div>
              <div className="pt-4 md:pt-0 hover:scale-105 transition-transform duration-200">
                <div className="text-[38px] md:text-[52px] font-bold font-display leading-none mb-2">₹ 15Cr+</div>
                <div className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Maintenance Collected</div>
              </div>
              <div className="pt-4 md:pt-0 hover:scale-105 transition-transform duration-200">
                <div className="text-[38px] md:text-[52px] font-bold font-display leading-none mb-2">99.8%</div>
                <div className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🍏 How It Works Steps */}
      <section className="py-20 md:py-28 bg-surface">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
          <div className="text-center max-w-2xl mx-auto mb-14 md:mb-18">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15 inline-block">
              Rapid Setup
            </span>
            <h2 className="text-[30px] md:text-[40px] font-bold text-on-surface mt-4 tracking-tight font-display">
              Get Live in 3 Simple Steps.
            </h2>
            <p className="text-body-md text-on-surface-variant mt-3 leading-relaxed">
              We guide your committee through seamless onboarding so residents can start enjoying the platform right away.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div
                key={step.n}
                className="ios-card p-8 flex flex-col justify-between relative group hover:border-primary/30"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full border border-primary/15 font-display">
                      Step {step.n}
                    </span>
                    <span className="material-symbols-outlined text-[28px] text-primary/70 group-hover:scale-110 transition-transform">
                      {step.icon}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-on-surface mb-3 font-display group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🍏 Final High-Conversion CTA Banner */}
      <section className="py-20 md:py-28 bg-white border-t border-black/[0.06]">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
          <div className="rounded-3xl bg-surface-container p-8 md:p-14 border border-black/[0.06] text-center flex flex-col items-center shadow-apple relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[32px]">apartment</span>
            </div>
            <h2 className="text-[32px] md:text-[44px] font-bold text-on-surface tracking-tight max-w-2xl leading-tight font-display">
              Ready to modernize your residential community?
            </h2>
            <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-xl mt-4 leading-relaxed">
              Join hundreds of progressive societies standardizing their billing, security, and community operations with ResidentOne.
            </p>
            <div className="flex flex-col sm:flex-row gap-3.5 mt-8 w-full sm:w-auto">
              <Link
                to="/register"
                className="ios-btn-primary px-8 py-4 text-body-sm no-underline shadow-[0_4px_16px_rgba(0,105,72,0.25)] group"
              >
                <span>Get Started Now</span>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/pricing"
                className="ios-btn-secondary px-7 py-4 text-body-sm no-underline"
              >
                <span>View Pricing Plans</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}