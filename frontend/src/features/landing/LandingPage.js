import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

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

      {/* 🍏 Apple HIG Hero Section */}
      <header className="relative pt-24 pb-16 md:pt-36 md:pb-28 overflow-hidden bg-gradient-to-b from-[#E8FDF2]/40 via-surface to-surface">
        {/* Ambient Apple Glow Backdrops */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -top-24 right-0 w-[400px] h-[400px] bg-tertiary/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
              {/* Apple Pill Tag */}
              <div className="inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-xl px-4 py-1.5 rounded-full border border-black/[0.06] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold text-on-surface tracking-wide">
                  iOS Design System 2.0 • Trusted by 500+ Societies
                </span>
              </div>

              <h1 className="text-[36px] sm:text-[48px] lg:text-[58px] xl:text-[64px] font-bold leading-[1.06] tracking-tight text-on-surface">
                Community <br />
                <span className="text-primary italic">Living</span>, Perfected.
              </h1>

              <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                Streamline maintenance billing, approve gate visitors in real time, and foster transparent residential governance with an Apple-grade management platform built for modern societies.
              </p>

              {/* Apple Capsule Buttons */}
              <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto mt-2">
                <Link
                  to="/register"
                  className="ios-btn-primary px-8 py-3.5 text-body-sm no-underline shadow-[0_4px_16px_rgba(0,105,72,0.25)]"
                >
                  <span>Get Started Free</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
                <Link
                  to="/features"
                  className="ios-btn-secondary px-7 py-3.5 text-body-sm no-underline"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">grid_view</span>
                  <span>Explore Modules</span>
                </Link>
              </div>

              {/* Social Proof Avatars */}
              <div className="flex items-center gap-3.5 mt-4 pt-6 border-t border-black/[0.06] w-full justify-center lg:justify-start">
                <div className="flex -space-x-2.5">
                  {["P", "A", "N", "R"].map((initial, i) => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full border-2 border-white bg-primary-light flex items-center justify-center text-xs font-bold text-primary shadow-xs"
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

            {/* Right Mockup Card (Apple macOS / iPad Floating Card) */}
            <div className="lg:col-span-5 relative w-full flex justify-center">
              <div className="w-full max-w-[460px] bg-white rounded-3xl border border-black/[0.08] shadow-[0_20px_50px_rgba(0,33,22,0.12)] p-5 relative">
                {/* Mockup Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider bg-surface-container px-3 py-1 rounded-full">
                    ResidentOne OS
                  </div>
                </div>

                {/* Mockup Content Widgets */}
                <div className="mt-4 space-y-3.5">
                  {/* Digital Wallet Card */}
                  <div className="rounded-2xl bg-gradient-to-br from-[#004730] to-[#006948] p-4 text-white shadow-md">
                    <div className="flex justify-between items-center text-xs opacity-80">
                      <span>Society Maintenance Balance</span>
                      <span className="material-symbols-outlined text-[16px]">contactless</span>
                    </div>
                    <div className="text-2xl font-bold mt-2 font-display">₹ 4,500 <span className="text-xs font-normal opacity-75">Due in 5 days</span></div>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/15 text-[11px]">
                      <span>Flat A-402 • Green Valley</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full font-semibold">Active Member</span>
                    </div>
                  </div>

                  {/* Gate Alert Notification Card */}
                  <div className="rounded-2xl bg-[#E8FDF2] border border-primary/20 p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">door_front</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                        <span>Visitor at Main Gate</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                      <div className="text-[11px] text-on-surface-variant truncate">Amazon Delivery • Gate 1 Verified</div>
                    </div>
                    <span className="text-[11px] font-bold text-primary bg-white px-2.5 py-1 rounded-full border border-primary/20 shadow-xs shrink-0">
                      Pre-Approved
                    </span>
                  </div>

                  {/* Quick Feature Metric Strip */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-surface-container/60 p-3 border border-black/[0.04]">
                      <div className="text-xs text-on-surface-variant">Active Complaints</div>
                      <div className="text-lg font-bold text-on-surface mt-0.5">0 Pending</div>
                      <div className="text-[10px] text-emerald-600 font-medium mt-1">100% Resolved</div>
                    </div>
                    <div className="rounded-2xl bg-surface-container/60 p-3 border border-black/[0.04]">
                      <div className="text-xs text-on-surface-variant">Clubhouse Slots</div>
                      <div className="text-lg font-bold text-on-surface mt-0.5">Booked</div>
                      <div className="text-[10px] text-primary font-medium mt-1">Today 6:00 PM</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 🍏 Features Grid (Apple Squircles & Pastel Tints) */}
      <section className="py-20 md:py-28 bg-white border-y border-black/[0.05]">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
          <div className="text-center max-w-2xl mx-auto mb-14 md:mb-20">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15">
              Comprehensive Platform
            </span>
            <h2 className="text-[30px] md:text-[40px] font-bold text-on-surface mt-4 tracking-tight">
              Designed with Apple Precision.
            </h2>
            <p className="text-body-md text-on-surface-variant mt-3 leading-relaxed">
              Replace chaotic WhatsApp chats and manual registers with intelligent, structured workflows designed for clarity and peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="ios-card p-6 md:p-7 flex flex-col justify-between group"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${f.tint} shadow-xs`}>
                    <span className="material-symbols-outlined text-[24px]">{f.icon}</span>
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-muted mb-1">
                    {f.tag}
                  </div>
                  <h3 className="text-lg font-bold text-on-surface mb-2 font-display">
                    {f.title}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {f.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-black/[0.04] flex items-center text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                  <span>Learn more</span>
                  <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🍏 Apple Ambient Stats Strip */}
      <section className="py-14 md:py-20 bg-surface">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
          <div className="rounded-3xl bg-gradient-to-br from-[#004730] via-[#006948] to-[#002117] text-white p-8 md:p-14 shadow-apple-hero relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
              <div className="pt-4 md:pt-0">
                <div className="text-[38px] md:text-[52px] font-bold font-display leading-none mb-2">500+</div>
                <div className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Societies Managed</div>
              </div>
              <div className="pt-4 md:pt-0">
                <div className="text-[38px] md:text-[52px] font-bold font-display leading-none mb-2">50k+</div>
                <div className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Connected Residents</div>
              </div>
              <div className="pt-4 md:pt-0">
                <div className="text-[38px] md:text-[52px] font-bold font-display leading-none mb-2">₹ 15Cr+</div>
                <div className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Maintenance Collected</div>
              </div>
              <div className="pt-4 md:pt-0">
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
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15">
              Rapid Setup
            </span>
            <h2 className="text-[30px] md:text-[40px] font-bold text-on-surface mt-4 tracking-tight">
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
                className="ios-card p-8 flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full border border-primary/15 font-display">
                      Step {step.n}
                    </span>
                    <span className="material-symbols-outlined text-[28px] text-primary/70">{step.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-on-surface mb-3 font-display">
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
          <div className="rounded-3xl bg-surface-container p-8 md:p-14 border border-black/[0.06] text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center mb-6 shadow-md">
              <span className="material-symbols-outlined text-[32px]">apartment</span>
            </div>
            <h2 className="text-[32px] md:text-[44px] font-bold text-on-surface tracking-tight max-w-2xl leading-tight">
              Ready to modernize your residential community?
            </h2>
            <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-xl mt-4 leading-relaxed">
              Join hundreds of progressive societies standardizing their billing, security, and community operations with ResidentOne.
            </p>
            <div className="flex flex-col sm:flex-row gap-3.5 mt-8 w-full sm:w-auto">
              <Link
                to="/register"
                className="ios-btn-primary px-8 py-4 text-body-sm no-underline shadow-[0_4px_16px_rgba(0,105,72,0.25)]"
              >
                <span>Get Started Now</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
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
