import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const values = [
  { icon: "touch_app", title: "Intuitive Simplicity", desc: "We believe managing a society shouldn't require complex training. Every screen is intuitive, accessible, and delight to use." },
  { icon: "diversity_3", title: "Community First", desc: "Every tool is designed to eliminate neighborhood friction, build trust, and bring families together in harmonious living." },
  { icon: "security", title: "Bank-Grade Security", desc: "Role-based permissions, 256-bit encrypted visitor records, and strict data masking keep your community safe and private." },
];

const milestones = [
  { icon: "lightbulb", year: "2024", title: "The Vision", desc: "Frustrated by fragmented WhatsApp chats and manual billing books, we set out to build an all-in-one residential society OS." },
  { icon: "rocket_launch", year: "2025", title: "Pilot Launch", desc: "Rolled out core automated billing, gate security passes, and complaint tracking across 50 pilot residential societies." },
  { icon: "domain", year: "2026", title: "Full Platform", desc: "Expanded to amenity bookings, digital ballot polling, society expense ledgers, and multi-society administration." },
];

const stats = [
  { num: "500+", label: "Societies Onboarded" },
  { num: "50k+", label: "Connected Residents" },
  { num: "99.9%", label: "Platform Uptime" },
  { num: "4.9/5", label: "App Store Rating" },
];

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About ResidentOne",
  description: "Building modern software to simplify residential society management, accounting, security, and community living.",
  url: "https://residentone.app/about"
};

export default function AboutPage() {
  return (
    <main className="flex-grow bg-surface">
      <SEO
        title="About Us — Empowering Residential Communities"
        description="Learn about ResidentOne's mission to modernize housing societies through intuitive technology, transparent accounting, and secure community management."
        keywords={[
          "about residentone",
          "society management mission",
          "residential tech company",
          "apartment community software",
        ]}
        canonicalPath="/about"
        schema={aboutSchema}
      />
      {/* 🍏 Hero */}
      <header className="relative bg-gradient-to-b from-[#E8FDF2]/50 via-surface to-surface overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24 flex items-center">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop w-full text-center relative z-10">
          <span className="inline-block py-1 px-3.5 rounded-full bg-primary-light text-primary text-xs font-bold mb-4 border border-primary/15 uppercase tracking-widest">
            Our Story
          </span>
          <h1 className="text-[34px] md:text-[46px] lg:text-[56px] leading-[1.08] tracking-tight font-bold text-on-surface max-w-3xl mx-auto mb-5 font-display">
            Elevating Residential Living Across India
          </h1>
          <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-8 leading-relaxed">
            ResidentOne was created to replace chaotic manual paperwork and fragmented messaging with an intelligent, high-trust digital platform built for homeowners, tenants, and committee managers.
          </p>
        </div>
      </header>

      {/* 🍏 Mission & Vision */}
      <section className="py-14 md:py-20 bg-white border-y border-black/[0.05]">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3 py-1 rounded-full border border-primary/15 inline-block mb-3">
                Core Purpose
              </span>
              <h2 className="text-[26px] md:text-[34px] font-bold text-on-surface mb-3 font-display">Our Mission</h2>
              <p className="text-body-md text-on-surface-variant mb-6 leading-relaxed">
                To empower residential societies with modern, transparent, and beautiful software that simplifies billing, guards the gate, and empowers committees to focus on community well-being.
              </p>
              <h2 className="text-[26px] md:text-[34px] font-bold text-on-surface mb-3 font-display">Our Vision</h2>
              <p className="text-body-md text-on-surface-variant mb-8 leading-relaxed">
                We envision every residential apartment running smoothly: 100% transparent balance sheets, zero gate security lapses, swift complaint resolution, and informed residents.
              </p>
              <Link
                to="/features"
                className="ios-btn-primary px-7 py-3 text-body-sm no-underline shadow-xs"
              >
                Explore Modules
              </Link>
            </div>
            <div className="ios-card p-8 bg-surface-container flex flex-col justify-center items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-white text-primary flex items-center justify-center text-3xl shadow-sm mb-4">
                🏢
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2 font-display">500+ Societies Transformed</h3>
              <p className="text-body-sm text-on-surface-variant max-w-sm">
                From luxury high-rises to cooperative housing colonies, ResidentOne scales with every community layout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🍏 Ambient Stats Strip */}
      <section className="py-12 md:py-16 bg-surface">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
          <div className="rounded-3xl bg-gradient-to-br from-[#004730] via-[#006948] to-[#002117] text-white p-8 md:p-12 shadow-apple-hero">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
              {stats.map((s) => (
                <div key={s.label} className="pt-4 md:pt-0">
                  <div className="text-[34px] md:text-[48px] font-bold font-display leading-none mb-2">{s.num}</div>
                  <div className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 🍏 Timeline */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15">
              Evolution
            </span>
            <h2 className="text-[28px] md:text-[38px] font-bold text-on-surface mt-3 tracking-tight font-display">
              Our Journey
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {milestones.map((m) => (
              <div key={m.year} className="ios-card p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full font-display">
                      {m.year}
                    </span>
                    <span className="text-2xl">{m.icon === "lightbulb" ? "💡" : m.icon === "rocket_launch" ? "🚀" : "🏢"}</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface mb-2 font-display">{m.title}</h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🍏 Values */}
      <section className="py-16 md:py-24 bg-white border-t border-black/[0.05]">
        <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15">
              Guiding Principles
            </span>
            <h2 className="text-[28px] md:text-[38px] font-bold text-on-surface mt-3 tracking-tight font-display">
              Our Values
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((v) => (
              <div key={v.title} className="ios-card p-8 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center text-2xl mb-5 shadow-xs">
                    {v.icon === "touch_app" ? "👆" : v.icon === "diversity_3" ? "🤝" : "🔒"}
                  </div>
                  <h3 className="text-xl font-bold text-on-surface mb-2 font-display">{v.title}</h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🍏 CTA */}
      <section className="py-16 md:py-24 bg-surface text-center">
        <div className="max-w-3xl mx-auto ios-card p-10 md:p-14 bg-surface-container">
          <h2 className="text-[26px] md:text-[34px] font-bold text-on-surface mb-3 font-display">
            Join Us in Building Better Communities
          </h2>
          <p className="text-body-md text-on-surface-variant mb-8 max-w-xl mx-auto leading-relaxed">
            Whether you're a society admin, treasurer, or resident, ResidentOne simplifies every interaction.
          </p>
          <Link
            to="/register"
            className="ios-btn-primary px-8 py-3.5 text-body-sm no-underline shadow-[0_4px_16px_rgba(0,105,72,0.25)]"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </main>
  );
}