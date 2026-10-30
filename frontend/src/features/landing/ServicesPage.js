import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const services = [
  {
    icon: "apartment",
    title: "Society Architecture",
    desc: "Complete hierarchical tools for managing wings, floors, units, homeowners, and tenant directories across communities.",
    tint: "bg-[#E0F2FE] text-[#0369A1]",
    features: ["Multi-society administration", "Wing & floor hierarchy", "Masked resident directory", "Granular role permissions"],
  },
  {
    icon: "payments",
    title: "Billing & Collections",
    desc: "Automated recurring maintenance billing, instant UPI collection via Cashfree, and transparent expense ledgers.",
    tint: "bg-[#E8FDF2] text-[#006948]",
    features: ["Auto invoice generation", "Cashfree instant UPI", "Real-time payment tracking", "Society expense audits"],
  },
  {
    icon: "support_agent",
    title: "Helpdesk & Complaints",
    desc: "Residents raise complaints with photo proof, admins assign staff, and progress updates trigger in real time.",
    tint: "bg-[#FEF3C7] text-[#B45309]",
    features: ["Photo complaint filing", "Auto-assignment to staff", "SLA resolution tracking", "Resident feedback ratings"],
  },
  {
    icon: "shield_person",
    title: "Gate Security & Visitors",
    desc: "Visitor pre-approvals, delivery leave-at-gate logs, vehicle registrations, and guard terminal interface.",
    tint: "bg-[#EDE9FE] text-[#6D28D9]",
    features: ["Digital QR entry passes", "Audible guard intercom", "Vehicle number registry", "Overstay gate alerts"],
  },
  {
    icon: "campaign",
    title: "Notices & Official Vault",
    desc: "Publish targeted circulars to all or specific wings. Store bylaws, audit files, and possession certificates securely.",
    tint: "bg-[#FFE4E6] text-[#BE123C]",
    features: ["Audited committee notices", "Unit document safe", "Read-receipt indicators", "Auto-expiry dates"],
  },
  {
    icon: "pool",
    title: "Amenities & Clubhouse",
    desc: "Create community events, manage amenity booking slots, and keep your complex's social calendar organized.",
    tint: "bg-[#CFFAFE] text-[#0E7490]",
    features: ["Clubhouse slot bookings", "Integrated deposit collection", "Interactive calendar view", "Guest access rules"],
  },
];

export default function ServicesPage() {
  return (
    <div className="bg-surface min-h-screen">
      <SEO
        title="Comprehensive Society Management Services"
        description="Explore the full suite of ResidentOne services: maintenance billing, gate security, complaints, amenity bookings, and notices."
        canonicalPath="/features"
      />

      {/* 🍏 Hero */}
      <section className="pt-28 pb-14 md:pt-36 md:pb-20 px-4 sm:px-margin-mobile md:px-margin-desktop text-center max-w-container mx-auto">
        <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15 inline-block mb-3">
          Our Services
        </span>
        <h1 className="text-[34px] md:text-[46px] lg:text-[54px] font-bold text-on-surface mb-4 tracking-tight font-display">
          Everything Your Society Needs
        </h1>
        <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          A unified, modern platform to manage billing, complaints, visitor gate security, notices, and day-to-day operations for residential communities across India.
        </p>
      </section>

      {/* 🍏 Core Services Grid */}
      <section className="py-12 md:py-16 px-4 sm:px-margin-mobile md:px-margin-desktop max-w-container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc) => (
            <div key={svc.title} className="ios-card p-7 flex flex-col justify-between">
              <div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${svc.tint} shadow-xs`}>
                  <span className="material-symbols-outlined text-[24px]">{svc.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-2 font-display">{svc.title}</h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed mb-5">{svc.desc}</p>
                <ul className="space-y-2 mb-6">
                  {svc.features.map((f) => (
                    <li key={f} className="text-xs text-on-surface flex items-center gap-2">
                      <span className="text-primary font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🍏 CTA */}
      <section className="py-16 md:py-24 px-4 sm:px-margin-mobile md:px-margin-desktop">
        <div className="max-w-3xl mx-auto p-10 md:p-14 rounded-3xl bg-surface-container border border-black/[0.06] text-center">
          <h2 className="text-[28px] md:text-[36px] font-bold text-on-surface font-display mb-3">
            Ready to Simplify Society Management?
          </h2>
          <p className="text-body-md text-on-surface-variant mb-8 max-w-xl mx-auto leading-relaxed">
            Start with our starter plan. Transparent setup in under 5 minutes.
          </p>
          <Link
            to="/register"
            className="ios-btn-primary px-8 py-3.5 text-body-sm no-underline shadow-[0_4px_16px_rgba(0,105,72,0.25)]"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}