import { Link } from "react-router-dom";

const values = [
  { icon: "touch_app", title: "Simplicity", desc: "We believe managing a society shouldn't require a computer science degree. Our tools are intuitive and easy to use." },
  { icon: "diversity_3", title: "Community First", desc: "Every feature is designed to strengthen community bonds and make resident life more convenient." },
  { icon: "security", title: "Security", desc: "Role-based access and data encryption ensure your society's information stays private and protected." },
];

const milestones = [
  { icon: "lightbulb", year: "2024", title: "The Idea", desc: "Frustrated by outdated society management tools, we set out to build something better for residential communities." },
  { icon: "rocket_launch", year: "2025", title: "MVP Launch", desc: "Launched with core features: billing, complaints, and visitor management for pilot societies." },
  { icon: "domain", year: "2026", title: "Full Platform", desc: "Expanded to cover parking, documents, notices, events, and multi-society management with role-based access." },
];

const stats = [
  { num: "50+", label: "Societies Onboarded" },
  { num: "10k+", label: "Residents Connected" },
  { num: "99.9%", label: "Uptime Guaranteed" },
  { num: "4.8/5", label: "Average Rating" },
];

export default function AboutPage() {
  return (
    <main className="flex-grow">
      {/* Hero */}
      <header className="relative bg-on-primary-fixed overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center pt-10">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#002117] via-primary/90 to-[#002117] opacity-80" />
        </div>
        <div className="relative z-10 max-w-container mx-auto px-margin-mobile md:px-margin-desktop w-full text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-surface-container-highest/20 text-inverse-primary text-label-sm font-semibold mb-4 backdrop-blur-sm border border-inverse-primary/30 uppercase tracking-widest">
            About Us
          </span>
          <h1 className="text-[32px] md:text-[42px] lg:text-[52px] leading-[1.1] tracking-tight font-bold text-on-primary max-w-4xl mx-auto mb-6">
            Building Better Communities
          </h1>
          <p className="text-body-md md:text-body-lg text-inverse-primary max-w-2xl mx-auto mb-8 leading-relaxed">
            ResidentOne was created to solve a simple problem: residential society management is
            fragmented, outdated, and painful. We're changing that.
          </p>
        </div>
      </header>

      {/* Mission & Vision */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <h2 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.01em] text-on-surface mb-2">Our Mission</h2>
              <p className="text-body-md md:text-body-lg text-on-surface-variant mb-8 leading-relaxed">
                To empower residential societies with modern, affordable technology that simplifies
                day-to-day operations — from maintenance billing to visitor management — so committees
                can focus on building better communities.
              </p>
              <h2 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.01em] text-on-surface mb-2">Our Vision</h2>
              <p className="text-body-md md:text-body-lg text-on-surface-variant mb-8 leading-relaxed">
                We envision every residential society running smoothly with the right digital tools.
                Transparent finances, resolved complaints, informed residents, and secure premises.
              </p>
              <Link
                to="/features"
                className="bg-brand text-on-primary text-label-md font-semibold px-6 py-3 rounded-lg hover:bg-on-primary-fixed-variant transition-colors shadow-sm no-underline inline-block"
              >
                See What We Offer
              </Link>
            </div>
            <div className="bg-surface-container-low rounded-xl p-8 border border-outline-variant shadow-sm h-full flex flex-col justify-center">
              <div className="w-full h-64 bg-surface-container-highest rounded-lg flex items-center justify-center text-on-surface-variant">
                <span className="text-[64px]">🏢</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 md:py-16 bg-on-primary-fixed text-on-primary relative">
        <div className="absolute inset-0 bg-brand opacity-90 mix-blend-multiply" />
        <div className="relative z-10 max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-[32px] md:text-[48px] lg:text-[56px] leading-none font-bold mb-2 font-display">{s.num}</div>
                <div className="text-label-sm font-semibold text-inverse-primary uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-20 bg-surface-container-lowest">
        <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
          <h2 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.01em] text-on-surface text-center mb-12 md:mb-16">Our Journey</h2>
          <div className="space-y-12 max-w-3xl mx-auto relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant before:to-transparent">
            {milestones.map((m) => (
              <div key={m.year} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-surface-container-highest group-[.is-active]:bg-brand text-on-surface group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <span className="text-sm">{m.icon === "lightbulb" ? "💡" : m.icon === "rocket_launch" ? "🚀" : "🏢"}</span>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-xl bg-surface border border-outline-variant shadow-sm hover:-translate-y-1 hover:shadow-md hover:border-brand transition-all duration-300">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[20px] md:text-[24px] font-semibold text-on-surface">{m.title}</h3>
                    <time className="text-xs font-semibold text-brand">{m.year}</time>
                  </div>
                  <p className="text-body-sm md:text-body-md text-on-surface-variant">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.01em] text-on-surface">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v) => (
              <div key={v.title} className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm hover:-translate-y-1 hover:shadow-md hover:border-brand transition-all duration-300">
                <div className="w-12 h-12 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center mb-6">
                  <span className="text-lg">{v.icon === "touch_app" ? "👆" : v.icon === "diversity_3" ? "🤝" : "🔒"}</span>
                </div>
                <h3 className="text-[20px] md:text-[24px] font-semibold text-on-surface mb-3">{v.title}</h3>
                <p className="text-body-sm md:text-body-md text-on-surface-variant leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-on-primary-fixed relative overflow-hidden text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-brand to-[#0f3b2b] opacity-90" />
        <div className="relative z-10 max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop">
          <h2 className="text-[28px] md:text-[36px] lg:text-[44px] leading-tight font-bold text-on-primary mb-6">
            Join Us in Building Better Communities
          </h2>
          <p className="text-body-md md:text-body-lg text-inverse-primary mb-8">
            Whether you're a society admin or a resident, ResidentOne makes your life easier.
          </p>
          <Link
            to="/register"
            className="text-brand bg-surface-container-lowest text-label-md font-semibold px-8 py-4 rounded-lg hover:bg-surface-container-low transition-colors shadow-lg no-underline inline-block"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </main>
  );
}
