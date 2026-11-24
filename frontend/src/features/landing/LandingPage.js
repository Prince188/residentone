import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const LIVE_GATE_EVENTS = [
  {
    tag: "Gate 1 Pass",
    icon: "local_shipping",
    title: "Amazon Logistics Delivery",
    details: "Rajesh Kumar • KA-04-E-1982",
    status: "Awaiting Approval",
    statusColor: "bg-amber-100 text-amber-800 border-amber-200",
    time: "Just now",
  },
  {
    tag: "UPI Auto-Receipt",
    icon: "verified",
    title: "Maintenance Settled ₹2,500",
    details: "Flat B-402 • Green Valley Heights",
    status: "Receipt Generated",
    statusColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    time: "2 mins ago",
  },
  {
    tag: "Guard Intercom",
    icon: "call",
    title: "Visitor for Flat B-402",
    details: "Main Gate Intercom • Audio Connected",
    status: "Calling Resident",
    statusColor: "bg-sky-100 text-sky-800 border-sky-200",
    time: "Live",
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
  const [eventIdx, setEventIdx] = useState(0);

  // Cycle realistic activity alerts in the smartphone preview
  useEffect(() => {
    const eventTimer = setInterval(() => {
      setEventIdx((prev) => (prev + 1) % LIVE_GATE_EVENTS.length);
    }, 3800);
    return () => clearInterval(eventTimer);
  }, []);

  const currentEvent = LIVE_GATE_EVENTS[eventIdx];

  return (
    <div className="bg-surface overflow-hidden">
      <SEO
        title="Smart Society & Apartment Management Platform"
        description="Streamline maintenance requests, automate billing with UPI, enhance gate security with visitor approvals, and unite your residential community with ResidentOne."
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

      {/* Grounded, High-Trust Hero Section */}
      <header className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-gradient-to-b from-[#EBFBF3]/70 via-[#F7FCF9]/80 to-surface">
        {/* Subtle, architectural grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#006948_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[520px] h-[320px] bg-primary/[0.06] rounded-full blur-[90px] pointer-events-none" />

        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Copy Column */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
              {/* Category Pill Tag */}
              <div className="inline-flex items-center gap-2.5 bg-white/95 px-3.5 py-1.5 rounded-full border border-black/[0.08] shadow-2xs hover:border-primary/30 transition-colors">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs font-semibold text-on-surface tracking-wide flex items-center gap-1.5">
                  <span>The Operating System for Housing Societies</span>
                  <span className="text-on-surface-muted">•</span>
                  <span className="text-primary font-bold">Trusted by 500+ Societies</span>
                </span>
              </div>

              {/* Grounded, Authoritative Headline */}
              <h1 className="text-[34px] sm:text-[46px] lg:text-[54px] font-bold leading-[1.14] tracking-tight text-on-surface font-display">
                Smart Society Management &amp; Gate Security,{" "}
                <span className="text-primary block sm:inline">Without the Chaos.</span>
              </h1>

              {/* Practical, Indian Society Specific Value Proposition */}
              <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                Say goodbye to manual guard registers and endless WhatsApp follow-ups. Automate monthly maintenance collection with instant UPI auto-receipts, verify visitors at the gate in seconds, and keep audit-ready financial books for your AGM.
              </p>

              {/* Concrete Value Chips */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs font-medium text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-black/[0.07] shadow-2xs">
                  <span className="material-symbols-outlined text-[15px] text-primary">check_circle</span>
                  Instant Cashfree UPI Receipts
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-black/[0.07] shadow-2xs">
                  <span className="material-symbols-outlined text-[15px] text-primary">check_circle</span>
                  2-Tap Gate Visitor Pass
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-black/[0.07] shadow-2xs">
                  <span className="material-symbols-outlined text-[15px] text-primary">check_circle</span>
                  AGM-Ready Audit Ledgers
                </span>
              </div>

              {/* Direct Conversion CTAs */}
              <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto mt-1">
                <Link
                  to="/register"
                  className="ios-btn-primary px-8 py-3.5 text-body-sm no-underline shadow-[0_4px_16px_rgba(0,105,72,0.25)] group"
                >
                  <span>Create Society Free</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/pricing"
                  className="ios-btn-secondary px-7 py-3.5 text-body-sm no-underline group"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    calculate
                  </span>
                  <span>Pricing &amp; Calculator</span>
                </Link>
              </div>

              {/* Credible Social Proof Strip */}
              <div className="flex items-center gap-3 mt-2 pt-5 border-t border-black/[0.06] w-full justify-center lg:justify-start">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-[17px] fill-current">star</span>
                  ))}
                </div>
                <div className="text-left text-xs sm:text-body-sm text-on-surface-variant">
                  <span className="font-bold text-on-surface">4.9 / 5.0</span> • Trusted by Management Committees &amp; RWAs across India
                </div>
              </div>
            </div>

            {/* Right Column: Realistic Smartphone App Mockup */}
            <div className="lg:col-span-5 relative w-full flex justify-center py-4">
              {/* Floating Verified Badge 1 (Top Left) */}
              <div className="absolute -top-3 -left-2 sm:-left-4 z-20 hidden sm:flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-black/[0.08] shadow-[0_12px_30px_rgba(0,35,22,0.10)]">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-on-surface leading-tight">₹2,500 Settled via UPI</div>
                  <div className="text-[10px] text-on-surface-muted leading-tight">Instant auto-receipt generated</div>
                </div>
              </div>

              {/* Floating Verified Badge 2 (Bottom Right) */}
              <div className="absolute -bottom-2 -right-2 sm:-right-4 z-20 hidden sm:flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-black/[0.08] shadow-[0_12px_30px_rgba(0,35,22,0.10)]">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">shield</span>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-on-surface leading-tight">Gate 1 Pass Approved</div>
                  <div className="text-[10px] text-on-surface-muted leading-tight">Delivery partner cleared entry</div>
                </div>
              </div>

              {/* Smartphone Frame Bezel */}
              <div className="w-full max-w-[340px] sm:max-w-[365px] bg-slate-900 rounded-[44px] p-2.5 shadow-[0_25px_60px_-15px_rgba(0,40,25,0.28)] ring-1 ring-slate-800">
                {/* Inner Mobile Screen */}
                <div className="bg-[#F8FAF9] rounded-[36px] overflow-hidden flex flex-col border border-slate-700/20 text-slate-800">
                  {/* Top Status Bar & Dynamic Island */}
                  <div className="bg-white px-5 pt-3 pb-2 flex items-center justify-between text-[11px] font-semibold text-slate-700">
                    <span>9:41</span>
                    {/* Dynamic Island Notch */}
                    <div className="w-20 h-4 bg-slate-900 rounded-full flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9px] text-slate-300 font-mono">ResidentOne</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="material-symbols-outlined text-[13px]">signal_cellular_alt</span>
                      <span className="material-symbols-outlined text-[13px]">wifi</span>
                      <span className="material-symbols-outlined text-[13px]">battery_full</span>
                    </div>
                  </div>

                  {/* Mobile App Header */}
                  <div className="bg-white px-4 pb-3 pt-1 border-b border-black/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xs shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">apartment</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface leading-tight">Green Valley Heights</div>
                        <div className="text-[10px] text-on-surface-muted">Flat B-402 • Wing B</div>
                      </div>
                    </div>
                    <div className="relative w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      <span className="material-symbols-outlined text-[17px]">notifications</span>
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                    </div>
                  </div>

                  {/* Mobile Screen Body Content */}
                  <div className="p-3.5 space-y-3">
                    {/* 1. Maintenance Due Card */}
                    <div className="rounded-2xl bg-gradient-to-br from-[#004730] to-[#006948] p-3.5 text-white shadow-sm">
                      <div className="flex items-center justify-between text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">
                        <span>Maintenance Due</span>
                        <span className="bg-emerald-800/80 px-2 py-0.5 rounded text-[9px] text-white">Due 5th Dec</span>
                      </div>
                      <div className="text-xl font-bold font-display mt-1 flex items-baseline gap-1.5">
                        ₹2,500 <span className="text-[10px] font-normal text-emerald-200 font-sans">/ month</span>
                      </div>
                      <div className="text-[10px] text-emerald-100/90 mt-0.5">
                        Maintenance + Water Cess + Lift AMC
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-200 flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-[13px]">qr_code_2</span> Cashfree UPI
                        </span>
                        <button
                          type="button"
                          className="bg-white text-primary text-[11px] font-bold px-3 py-1 rounded-lg shadow-xs hover:bg-emerald-50 transition-colors"
                        >
                          Pay via UPI
                        </button>
                      </div>
                    </div>

                    {/* 2. Real-time Live Gate Event */}
                    <div className="rounded-xl bg-white border border-black/[0.07] p-3 shadow-2xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-primary">{currentEvent.icon}</span>
                          {currentEvent.tag}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${currentEvent.statusColor}`}>
                          {currentEvent.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-on-surface">{currentEvent.title}</div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">{currentEvent.details}</div>
                      <div className="mt-2.5 flex gap-1.5">
                        <button
                          type="button"
                          className="flex-1 bg-primary text-white text-[10px] font-bold py-1.5 rounded-lg shadow-xs hover:bg-primary-hover transition-colors"
                        >
                          Allow Entry
                        </button>
                        <button
                          type="button"
                          className="flex-1 bg-slate-100 text-slate-700 text-[10px] font-medium py-1.5 rounded-lg border border-black/[0.05] hover:bg-slate-200 transition-colors"
                        >
                          Leave at Gate
                        </button>
                      </div>
                    </div>

                    {/* 3. Quick Actions Grid */}
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {[
                        { icon: "badge", label: "Gate Pass" },
                        { icon: "receipt_long", label: "Ledger" },
                        { icon: "campaign", label: "Notices" },
                        { icon: "support_agent", label: "Helpdesk" },
                      ].map((item, i) => (
                        <div key={i} className="bg-white rounded-xl p-2 border border-black/[0.05] shadow-2xs">
                          <span className="material-symbols-outlined text-[18px] text-primary block mx-auto">
                            {item.icon}
                          </span>
                          <span className="text-[9px] font-medium text-slate-600 block mt-0.5">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Home Indicator Bar */}
                  <div className="bg-white py-1.5 flex justify-center">
                    <div className="w-24 h-1 bg-slate-300 rounded-full" />
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