import { Link } from "react-router-dom";

const featureDetails = [
  {
    tag: "Maintenance & Finance",
    icon: "build",
    title: "Automated Maintenance Tracking",
    desc: "Eliminate manual paperwork. Our automated billing system ensures timely fee collection, while the transparent resident portal allows real-time status tracking for all maintenance requests and financial contributions.",
    items: [
      "Automated recurring billing and invoicing",
      "Transparent resident financial portals",
      "Real-time maintenance request tracking",
    ],
  },
  {
    tag: "Security & Access",
    icon: "security",
    title: "Smart Security Management",
    desc: "Enhance gate management with digital visitor logs, pre-approvals, and real-time alerts. Keep your community safe with modern security tools that replace paper registers.",
    items: [
      "Digital visitor pre-approval system",
      "Real-time gate alerts and notifications",
      "Complete vehicle and staff registry",
    ],
  },
  {
    tag: "Communication",
    icon: "forum",
    title: "Community Communication Hub",
    desc: "Create a dedicated, moderated space for official resident notices, community polls, and secure digital voting. Replace WhatsApp chaos with structured communication.",
    items: [
      "Targeted notices to specific groups",
      "Community polls and digital voting",
      "Document library with secure access",
    ],
  },
  {
    tag: "Facilities",
    icon: "event_available",
    title: "Facility Booking System",
    desc: "Offer easy self-service scheduling for clubhouses, sports areas, and party halls with integrated payment collection. No more double bookings or manual coordination.",
    items: [
      "Self-service amenity scheduling",
      "Integrated payment collection",
      "Calendar view with conflict prevention",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <main className="flex-grow">
      {/* Hero */}
      <section className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-16 md:py-24 flex flex-col md:flex-row items-center gap-gutter">
        <div className="md:w-1/2 space-y-5">
          <h1 className="text-[32px] md:text-[42px] lg:text-[52px] leading-[1.1] tracking-tight font-bold text-on-surface">
            Powerful Tools for Modern Societies
          </h1>
          <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
            Streamline operations, enhance security, and foster community engagement with our
            comprehensive suite of management tools designed for modern residential complexes.
          </p>
          <div className="flex gap-4 pt-2">
            <Link
              to="/register"
              className="bg-inverse-surface text-on-primary font-label-md text-label-md px-6 py-3 hover:bg-primary transition-colors no-underline"
            >
              Explore Features
            </Link>
          </div>
        </div>
        <div className="md:w-1/2 relative h-[280px] md:h-[350px] w-full rounded-xl overflow-hidden border border-surface-variant">
          <div className="bg-inverse-surface w-full h-full flex items-center justify-center">
            <div className="text-center opacity-50">
              <div className="text-[64px] text-inverse-primary">⬡</div>
              <div className="text-inverse-on-surface text-sm mt-2">Dashboard Preview</div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent mix-blend-overlay" />
        </div>
      </section>

      {/* Feature Details */}
      {featureDetails.map((f, i) => (
        <section
          key={f.title}
          className={`py-16 md:py-24 border-y border-surface-variant ${
            i % 2 === 0 ? "bg-surface-container-low" : "bg-surface-container-lowest"
          }`}
        >
          <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row items-center gap-gutter">
            <div className={`md:w-1/2 relative h-[250px] md:h-[300px] w-full rounded-xl overflow-hidden border border-surface-variant bg-surface ${i % 2 === 0 ? "order-2 md:order-1" : ""}`}>
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-[48px] text-primary/20">{f.icon === "build" ? "🔧" : f.icon === "security" ? "🔒" : f.icon === "forum" ? "💬" : "📅"}</div>
              </div>
            </div>
            <div className={`md:w-1/2 space-y-3 ${i % 2 === 0 ? "order-1 md:order-2" : ""}`}>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-label-sm font-semibold">
                <span>{f.tag}</span>
              </div>
              <h2 className="text-[24px] md:text-[28px] font-semibold text-on-surface">{f.title}</h2>
              <p className="text-body-sm md:text-body-md text-on-surface-variant leading-relaxed">{f.desc}</p>
              <ul className="space-y-1.5 pt-1 text-body-sm text-on-surface-variant">
                {f.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-primary">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-16 md:py-24 text-center px-margin-mobile md:px-margin-desktop bg-inverse-surface text-on-primary">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-[28px] md:text-[36px] lg:text-[44px] leading-tight font-bold text-on-primary">
            Ready to Transform Your Community?
          </h2>
          <p className="text-body-md md:text-body-lg text-inverse-primary opacity-80">
            Join thousands of modern societies utilizing ResidentOne to enhance their management
            operations and resident satisfaction.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 hover:bg-white hover:text-on-surface transition-colors no-underline inline-block"
            >
              Get Started Today
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
