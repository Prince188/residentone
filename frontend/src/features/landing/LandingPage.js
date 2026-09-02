import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const features = [
  { icon: "build", title: "Maintenance Tracking", desc: "Automate monthly billing and provide residents with a transparent portal for complaint resolution and status tracking." },
  { icon: "security", title: "Smart Security", desc: "Enhance gate management with digital visitor logs, pre-approvals, and real-time alerts for staff and deliveries." },
  { icon: "forum", title: "Community App", desc: "Create a dedicated, moderated space for official resident notices, community polls, and secure digital voting." },
  { icon: "event_available", title: "Facility Booking", desc: "Offer easy self-service scheduling for clubhouses, sports areas, and party halls with integrated payment collection." },
];

const steps = [
  { n: "01", title: "Onboard", desc: "Upload your resident directory and securely invite users to download the app." },
  { n: "02", title: "Automate", desc: "Set up recurring maintenance bills, configure gate rules, and define facility slots." },
  { n: "03", title: "Connect", desc: "Enjoy a peaceful, organized community where everyone stays informed and engaged." },
];

const landingSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "ResidentOne — Modern Residential Society & Apartment Management Platform",
  "description": "Streamline society maintenance, enhance gate security with digital visitor passes, and simplify community communication.",
  "url": "https://residentone.app/",
  "mainEntity": {
    "@type": "SoftwareApplication",
    "name": "ResidentOne",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web, iOS, Android",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "2400"
    }
  }
};

export default function LandingPage() {
  return (
    <div>
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
      {/* Hero */}
      <header className="relative bg-surface-container-lowest pt-24 pb-14 md:pt-32 md:pb-24">
        <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 flex flex-col gap-6 z-10">
              <div className="inline-flex items-center gap-2 bg-surface text-on-surface px-3 py-1.5 border border-surface-variant w-fit">
                <span className="material-symbols-outlined text-primary text-[16px]">verified</span>
                <span className="font-label-sm text-[11px] uppercase tracking-widest">Trusted by 50+ Societies</span>
              </div>
              <h1 className="text-[32px] md:text-[42px] lg:text-[52px] font-bold leading-[1.1] tracking-tight text-on-surface">
                Community <br />
                <span className="text-primary italic">Management</span> <br />
                Made Simple.
              </h1>
              <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                Streamline maintenance requests, enhance security with digital visitor logs, and foster
                seamless resident communication all from one centralized, easy-to-use platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <Link
                  to="/register"
                  className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 hover:bg-on-surface transition-colors flex justify-center items-center gap-2 uppercase tracking-widest no-underline"
                >
                  Get Started
                  <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>
                </Link>
                <Link
                  to="/about"
                  className="bg-transparent border border-on-surface text-on-surface font-label-md text-label-md px-6 py-3 hover:bg-surface transition-colors flex justify-center items-center gap-2 uppercase tracking-widest no-underline"
                >
                  Watch Demo
                </Link>
              </div>
              <div className="flex items-center gap-4 mt-6 pt-6 border-t border-surface-variant">
                <div className="flex -space-x-3">
                  {["P", "A", "N"].map((initial, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center text-xs font-bold text-on-surface-variant">
                      {initial}
                    </div>
                  ))}
                </div>
                <div className="text-body-sm text-on-surface-variant">
                  <span className="font-bold text-on-surface">50k+</span> Residents connected
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 relative h-[300px] lg:h-[480px] w-full hidden lg:block">
              <div className="absolute inset-0 bg-inverse-surface">
                <div className="w-full h-full flex items-center justify-center opacity-80">
                  <div className="text-center">
                    <div className="text-[80px] leading-none text-inverse-primary opacity-40">⬡</div>
                    <div className="text-inverse-on-surface text-sm mt-3 opacity-60">ResidentOne Dashboard</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-primary mix-blend-multiply opacity-20 blur-3xl" />
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-16 md:py-24 bg-inverse-surface text-inverse-on-surface">
        <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            <div className="lg:col-span-4">
              <h2 className="text-[28px] md:text-[36px] leading-tight text-on-primary mb-4">Master Your Society.</h2>
              <p className="text-body-md text-surface-variant opacity-80 mb-6 leading-relaxed">
                A comprehensive suite of tools designed to replace chaotic WhatsApp groups and manual
                ledgers with structured, transparent workflows.
              </p>
              <Link
                to="/features"
                className="border-b border-primary text-primary pb-1 font-label-sm text-label-sm uppercase tracking-widest hover:text-on-primary transition-colors flex items-center gap-2 no-underline"
              >
                View All Features <span className="material-symbols-outlined text-[16px]">arrow_right_alt</span>
              </Link>
            </div>
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`bg-on-surface p-6 md:p-8 group hover:-translate-y-1 transition-transform duration-300 border border-white/10 ${i % 2 === 0 ? "md:mt-12" : ""}`}
                >
                  <div className="w-12 h-12 bg-primary/20 flex items-center justify-center mb-5 border border-primary/30">
                    <span className="material-symbols-outlined text-primary text-[24px]">{f.icon}</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-primary mb-3">{f.title}</h3>
                  <p className="text-body-sm text-surface-variant opacity-70 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 md:py-20 bg-primary text-on-primary border-t-8 border-inverse-surface">
        <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-3 gap-4 md:gap-12 text-center divide-x divide-white/20">
            <div className="px-2 md:px-0">
              <div className="text-[32px] md:text-[48px] lg:text-[56px] leading-none mb-2 md:mb-4 font-bold font-display">500+</div>
              <div className="font-label-sm md:font-label-md text-[10px] md:text-label-md text-primary-fixed-dim uppercase tracking-widest">Societies</div>
            </div>
            <div className="px-2 md:px-0">
              <div className="text-[32px] md:text-[48px] lg:text-[56px] leading-none mb-2 md:mb-4 font-bold font-display">50k+</div>
              <div className="font-label-sm md:font-label-md text-[10px] md:text-label-md text-primary-fixed-dim uppercase tracking-widest">Residents</div>
            </div>
            <div className="px-2 md:px-0">
              <div className="text-[32px] md:text-[48px] lg:text-[56px] leading-none mb-2 md:mb-4 font-bold font-display">99%</div>
              <div className="font-label-sm md:font-label-md text-[10px] md:text-label-md text-primary-fixed-dim uppercase tracking-widest">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="mb-10 md:mb-16">
            <h2 className="text-[28px] md:text-[36px] text-on-surface mb-4 border-b-2 border-primary inline-block pb-3">How It Works</h2>
            <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-2xl mt-6 leading-relaxed">
              Get your entire society up and running in days, not months. A streamlined process designed for efficiency.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 relative">
            {steps.map((step, i) => (
              <div key={step.n} className={`relative z-10 flex flex-col group ${i > 0 ? `md:mt-${i * 10}` : ""}`}>
                <div className="text-[56px] md:text-[72px] font-display text-surface-variant opacity-30 leading-none mb-3 group-hover:text-primary transition-colors">
                  {step.n}
                </div>
                <h3 className="text-[20px] md:text-[24px] font-semibold text-on-surface mb-3">{step.title}</h3>
                <p className="text-body-sm md:text-body-md text-on-surface-variant leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-inverse-surface text-on-primary">
        <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
            <div>
              <h2 className="text-[28px] md:text-[36px] lg:text-[44px] leading-tight text-on-primary mb-5">Bring Your Society Online Today.</h2>
              <p className="text-body-md md:text-body-lg text-surface-variant opacity-80 mb-8 max-w-lg leading-relaxed">
                Join hundreds of other progressive communities standardizing their management
                operations with ResidentOne.
              </p>
              <Link
                to="/register"
                className="bg-primary text-on-primary font-label-md text-label-md px-6 py-4 hover:bg-white hover:text-on-surface transition-colors uppercase tracking-widest border border-primary hover:border-white no-underline inline-block"
              >
                Get Started Now
              </Link>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <div className="w-full h-[280px] lg:h-[350px] bg-surface-variant/30 flex items-center justify-center border border-white/10">
                <div className="text-center opacity-50">
                  <div className="text-[64px] text-inverse-primary">⬡</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
