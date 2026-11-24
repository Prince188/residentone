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

const PRODUCT_MODULES = [
  {
    id: "finance",
    title: "Maintenance & UPI",
    navLabel: "Maintenance & UPI",
    tag: "Automated Society Finances",
    icon: "payments",
    headline: "Zero-Hassle Dues Collection with Instant Bank Settlement",
    description: "Generate 1st-of-the-month invoices automatically and collect dues via UPI, Cards, or Netbanking. Money settles directly into the society's current bank account with zero manual reconciliation.",
    benefits: [
      "Auto-generated invoices with wing, flat number & custom line items",
      "Instant WhatsApp & SMS payment links with Dynamic UPI QR codes",
      "Zero manual bank reconciliation: receipts issue instantly upon payment",
      "Automated late fee penalties with configurable grace period rules",
    ],
    ctaText: "Explore Billing Features",
    ctaLink: "/features",
  },
  {
    id: "gate",
    title: "Gate Security & Passes",
    navLabel: "Gate Security",
    tag: "Digital Gatekeeper OS",
    icon: "shield_person",
    headline: "2-Tap Visitor Approvals & Fast Digital Entry at the Gate",
    description: "Replace soggy paper guard registers with a fast, touch-friendly guard tablet console. Residents pre-approve guests and deliveries, and get notified instantly when visitors arrive.",
    benefits: [
      "Instant guest pre-approvals with 4-digit PIN / QR entry passes",
      "One-tap delivery 'Leave at Gate' verification with photo proof",
      "Daily domestic staff (maids, drivers, cooks) biometric / PIN attendance",
      "Audible guard-to-resident intercom calling over internet without intercom wiring",
    ],
    ctaText: "Explore Gate Security",
    ctaLink: "/features",
  },
  {
    id: "accounting",
    title: "Audit Ledgers & AGM",
    navLabel: "Audit & AGM Ledgers",
    tag: "Treasurer & CA Transparency",
    icon: "account_balance",
    headline: "Audit-Ready Books Ready for Your Next General Body Meeting",
    description: "Give your Treasurer, Managing Committee, and Chartered Accountant instant access to clean income & expenditure statements, vendor AMC payment logs, and verified dues reports.",
    benefits: [
      "Live Income vs Expenditure statements with category-wise breakdown",
      "Sinking fund, repair reserve, and investment deposit tracking",
      "1-Click Export to Excel & PDF formatted for society statutory audits",
      "Transparent resident ledger access eliminates billing disputes",
    ],
    ctaText: "View Accounting Modules",
    ctaLink: "/features",
  },
  {
    id: "helpdesk",
    title: "Helpdesk & Amenities",
    navLabel: "Helpdesk & Amenities",
    tag: "Resident Operations & Comfort",
    icon: "support_agent",
    headline: "Structured Complaint Resolution & Self-Service Amenities",
    description: "Eliminate chaotic WhatsApp complaints. Residents raise tickets for plumbing, electrical, or lift issues with photos, and book clubhouses, tennis courts, and party halls in seconds.",
    benefits: [
      "Ticket routing to assigned facility managers with SLA deadlines",
      "Clubhouse & party hall calendar with automatic slot conflict blocking",
      "Integrated amenity deposit and refundable advance fee collection",
      "Official committee broadcast noticeboard with read-receipt tracking",
    ],
    ctaText: "Explore Community Features",
    ctaLink: "/features",
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
  const [activeTab, setActiveTab] = useState(0);

  // Cycle realistic activity alerts in the smartphone preview
  useEffect(() => {
    const eventTimer = setInterval(() => {
      setEventIdx((prev) => (prev + 1) % LIVE_GATE_EVENTS.length);
    }, 3800);
    return () => clearInterval(eventTimer);
  }, []);

  const currentEvent = LIVE_GATE_EVENTS[eventIdx];
  const activeModule = PRODUCT_MODULES[activeTab];

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

      {/* Interactive Tabbed Product Deep-Dive */}
      <section className="py-20 md:py-28 bg-white border-y border-black/[0.05]">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15 inline-block">
              Core Platform Architecture
            </span>
            <h2 className="text-[30px] md:text-[42px] font-bold text-on-surface mt-4 tracking-tight font-display">
              Built for Every Stakeholder in Your Society.
            </h2>
            <p className="text-body-md md:text-body-lg text-on-surface-variant mt-3 leading-relaxed">
              Whether you are a resident paying maintenance, a guard at the gate, or a treasurer presenting the annual AGM audit, ResidentOne delivers dedicated, purpose-built workflows.
            </p>
          </div>

          {/* Interactive Module Tabs */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 sm:pb-0 mb-10 no-scrollbar">
            {PRODUCT_MODULES.map((m, idx) => {
              const isActive = activeTab === idx;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-body-sm font-semibold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-primary text-white shadow-[0_4px_14px_rgba(0,105,72,0.28)] scale-[1.02]"
                      : "bg-surface-container/70 text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-black/[0.05]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                  <span>{m.navLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Display */}
          <div className="rounded-3xl bg-surface-container/40 border border-black/[0.06] p-6 sm:p-8 md:p-12 transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Deep Dive Copy */}
              <div className="lg:col-span-6 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-3">
                    <span className="material-symbols-outlined text-[15px]">{activeModule.icon}</span>
                    <span>{activeModule.tag}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-on-surface font-display leading-tight mb-3">
                    {activeModule.headline}
                  </h3>
                  <p className="text-body-md text-on-surface-variant leading-relaxed mb-6">
                    {activeModule.description}
                  </p>

                  <div className="space-y-3 mb-8">
                    {activeModule.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </div>
                        <span className="text-body-sm text-on-surface font-medium leading-snug">
                          {benefit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Link
                    to={activeModule.ctaLink}
                    className="inline-flex items-center gap-2 text-body-sm font-bold text-primary hover:text-primary-hover group no-underline"
                  >
                    <span>{activeModule.ctaText}</span>
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>

              {/* Right Column: Interactive Real-World UI Canvas */}
              <div className="lg:col-span-6 relative">
                {/* Module 0: Maintenance & UPI */}
                {activeModule.id === "finance" && (
                  <div className="rounded-2xl bg-slate-900 text-white p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,35,22,0.18)] border border-slate-800 animate-fade-slide-up">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-100">Monthly Dues Auto-Invoice</div>
                          <div className="text-[11px] text-slate-400">#INV-2026-11-042 • Flat B-402</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        PAID via UPI
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80 text-slate-300">
                        <span>Society Maintenance (Flat B-402)</span>
                        <span className="font-semibold text-white">₹1,800.00</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80 text-slate-300">
                        <span>Lift AMC &amp; DG Backup Surcharge</span>
                        <span className="font-semibold text-white">₹350.00</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80 text-slate-300">
                        <span>Water Cess &amp; Borewell AMC</span>
                        <span className="font-semibold text-white">₹200.00</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80 text-slate-300">
                        <span>Sinking Fund Mandatory Allocation</span>
                        <span className="font-semibold text-white">₹150.00</span>
                      </div>
                      <div className="flex justify-between pt-2 text-sm font-bold text-white">
                        <span>Total Settled</span>
                        <span className="text-emerald-400 font-display text-base">₹2,500.00</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-emerald-400">verified</span>
                        <span>Settled directly to HDFC Society A/C #...8812</span>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors w-fit"
                      >
                        <span className="material-symbols-outlined text-[14px]">download</span>
                        <span>Download PDF Receipt</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Module 1: Gate Security & Passes */}
                {activeModule.id === "gate" && (
                  <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,35,22,0.12)] border border-black/[0.08] animate-fade-slide-up">
                    <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-[20px]">shield</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-on-surface">Gate 1 Guard Console</div>
                          <div className="text-[11px] text-on-surface-muted">Security Guard: Suresh P. (Terminal #1)</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Shift Active
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {/* Entry 1 */}
                      <div className="p-3 rounded-xl bg-surface-container/60 border border-black/[0.05] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-on-surface">Amazon Logistics • Delivery</div>
                            <div className="text-[11px] text-on-surface-variant">Rajesh Kumar (Pass #8291) • Flat B-402</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Pre-Approved
                        </span>
                      </div>

                      {/* Entry 2 */}
                      <div className="p-3 rounded-xl bg-surface-container/60 border border-black/[0.05] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]">directions_car</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-on-surface">Guest: Amit V. (White City)</div>
                            <div className="text-[11px] text-on-surface-variant">DL-3C-8912 • Intercom calling Flat C-104</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          Audio Intercom
                        </span>
                      </div>

                      {/* Entry 3 */}
                      <div className="p-3 rounded-xl bg-surface-container/60 border border-black/[0.05] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]">badge</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-on-surface">Rukmini (Housekeeper #14)</div>
                            <div className="text-[11px] text-on-surface-variant">Biometric entry logged at 08:30 AM</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Inside Society
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Module 2: Audit Ledgers & AGM */}
                {activeModule.id === "accounting" && (
                  <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,35,22,0.12)] border border-black/[0.08] animate-fade-slide-up">
                    <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06]">
                      <div>
                        <div className="text-xs font-bold text-on-surface">Annual Society Financial Health</div>
                        <div className="text-[11px] text-on-surface-muted">FY 2026–27 Statutory Audit Ledger</div>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">verified</span>
                        AGM Ready
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 my-4">
                      <div className="bg-surface-container/60 p-3 rounded-xl border border-black/[0.04]">
                        <div className="text-[10px] uppercase font-semibold text-on-surface-muted">Collections</div>
                        <div className="text-base sm:text-lg font-bold text-emerald-700 font-display mt-0.5">₹ 28.45 L</div>
                        <div className="text-[10px] text-emerald-600 font-medium">96.4% on-time</div>
                      </div>
                      <div className="bg-surface-container/60 p-3 rounded-xl border border-black/[0.04]">
                        <div className="text-[10px] uppercase font-semibold text-on-surface-muted">Sinking Fund</div>
                        <div className="text-base sm:text-lg font-bold text-on-surface font-display mt-0.5">₹ 12.50 L</div>
                        <div className="text-[10px] text-primary font-medium">Bank FD Verified</div>
                      </div>
                      <div className="bg-surface-container/60 p-3 rounded-xl border border-black/[0.04]">
                        <div className="text-[10px] uppercase font-semibold text-on-surface-muted">Overdue Dues</div>
                        <div className="text-base sm:text-lg font-bold text-rose-600 font-display mt-0.5">₹ 1.05 L</div>
                        <div className="text-[10px] text-rose-600 font-medium">Down 78% YoY</div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-muted mb-1">
                        Major Monthly Society AMC Contracts
                      </div>
                      <div className="flex justify-between py-1 border-b border-black/[0.04] text-on-surface-variant">
                        <span>Security Agency Contract (6 Guards, 24/7)</span>
                        <span className="font-semibold text-on-surface">₹1,20,000 / mo</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-black/[0.04] text-on-surface-variant">
                        <span>Otis Elevator Comprehensive AMC (4 Lifts)</span>
                        <span className="font-semibold text-on-surface">₹24,500 / mo</span>
                      </div>
                      <div className="flex justify-between py-1 text-on-surface-variant">
                        <span>DG Generator Diesel &amp; Backup Maintenance</span>
                        <span className="font-semibold text-on-surface">₹18,200 / mo</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/[0.06] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-on-surface-muted">1-Click export for CA audit</span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-light px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary-fixed/40 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">file_download</span>
                        <span>CA Audit Pack (.xlsx)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Module 3: Helpdesk & Amenities */}
                {activeModule.id === "helpdesk" && (
                  <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,35,22,0.12)] border border-black/[0.08] animate-fade-slide-up">
                    <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[20px]">handyman</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-on-surface">Helpdesk &amp; Resident Services</div>
                          <div className="text-[11px] text-on-surface-muted">Real-time SLAs &amp; Conflict-free Bookings</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full">
                        Zero WhatsApp Spam
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {/* Ticket 1 */}
                      <div className="p-3 rounded-xl bg-surface-container/60 border border-black/[0.05]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-on-surface">Ticket #184: Wing B Passenger Lift Sensor</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            In Progress
                          </span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant">
                          Assigned to Otis AMC Technician • SLA Target: 2h remaining
                        </div>
                      </div>

                      {/* Amenity Reservation */}
                      <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-emerald-700">celebration</span>
                            Clubhouse Banquet Hall Reservation
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Confirmed
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-800">
                          Flat A-201 • Saturday 6:00 PM – 10:00 PM • ₹5,000 Refundable Deposit Paid
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
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