import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const featureDetails = [
  {
    tag: "Maintenance & Ledgers",
    icon: "build",
    tint: "bg-[#E0F2FE] text-[#0369A1]",
    title: "Automated Maintenance & Zero-Fee UPI",
    desc: "Eliminate manual bookkeeping and messy receipts. Automate recurring monthly billing, send instant WhatsApp/SMS reminders, and give residents a transparent ledger with instant PDF receipts.",
    items: [
      "Automated monthly & quarterly maintenance invoice generation",
      "Instant zero-convenience-fee UPI & QR code payments",
      "Real-time society expense tracking and digital audit trails",
    ],
  },
  {
    tag: "Gate & Guard OS",
    icon: "shield_person",
    tint: "bg-[#E8FDF2] text-[#006948]",
    title: "Smart Gate Pass & Intercom Security",
    desc: "Transform entry gates with modern digital passes. Residents pre-approve guests and deliveries with one tap, while security guards verify vehicles and staff without touching paper registers.",
    items: [
      "Digital visitor pre-approvals with QR entry passes",
      "Real-time audible guard intercom ringing directly on phones",
      "Leave at gate delivery logs and full vehicle registries",
    ],
  },
  {
    tag: "Community Governance",
    icon: "forum",
    tint: "bg-[#EDE9FE] text-[#6D28D9]",
    title: "Moderated Notices & Secret Digital Ballots",
    desc: "Create an official, spam-free space for committee announcements, emergency alerts, and democratic community polling. Eliminate WhatsApp arguments with structured discussions.",
    items: [
      "Official committee notices with read-receipt tracking",
      "Secure secret and open ballot community elections",
      "Full resident directory with privacy number masking",
    ],
  },
  {
    tag: "Amenities & Lifestyle",
    icon: "event_available",
    tint: "bg-[#FEF3C7] text-[#B45309]",
    title: "Clubhouse & Facility Reservation",
    desc: "Offer transparent self-service scheduling for clubhouses, swimming pools, tennis courts, and party halls. Automated time slot allocation prevents duplicate bookings.",
    items: [
      "Real-time calendar view with automatic conflict prevention",
      "Integrated amenity fee collection and deposit handling",
      "Configurable usage guidelines and peak hour quotas",
    ],
  },
];

const featuresSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "ResidentOne Features & Modules",
  description: "Comprehensive suite of residential management tools",
  itemListElement: [
    { "@type": "ListItem", "position": 1, "name": "Automated Maintenance Tracking" },
    { "@type": "ListItem", "position": 2, "name": "Smart Security & Visitor Management" },
    { "@type": "ListItem", "position": 3, "name": "Community Communication Hub" },
    { "@type": "ListItem", "position": 4, "name": "Facility & Amenity Booking System" }
  ]
};

export default function FeaturesPage() {
  return (
    <main className="flex-grow bg-surface">
      <SEO
        title="Features & Modules — Gate Security, Billing & Resident Tools"
        description="Explore ResidentOne features: automated maintenance tracking, digital visitor security, complaint resolution, facility bookings, and official notices."
        keywords={[
          "society management features",
          "apartment security system",
          "maintenance billing automation",
          "society amenity booking",
          "digital resident directory",
          "visitor pass app",
        ]}
        canonicalPath="/features"
        schema={featuresSchema}
      />

      {/* 🍏 Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop text-center">
        <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15 inline-block mb-3">
          Platform Architecture
        </span>
        <h1 className="text-[34px] md:text-[46px] lg:text-[56px] leading-[1.08] tracking-tight font-bold text-on-surface max-w-3xl mx-auto mb-5 font-display">
          Powerful Modules for Modern Societies
        </h1>
        <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-8 leading-relaxed">
          From the entrance gate to the treasurer's balance sheet, ResidentOne is built to streamline every aspect of residential living with effortless precision.
        </p>
        <div className="flex justify-center gap-3.5">
          <Link
            to="/register"
            className="ios-btn-primary px-8 py-3.5 text-body-sm no-underline shadow-[0_4px_16px_rgba(0,105,72,0.25)]"
          >
            Get Started Free
          </Link>
          <Link
            to="/pricing"
            className="ios-btn-secondary px-7 py-3.5 text-body-sm no-underline"
          >
            Compare Plans
          </Link>
        </div>
      </section>

      {/* 🍏 Feature Deep Dives */}
      <div className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop pb-20 space-y-10">
        {featureDetails.map((f, i) => (
          <section
            key={f.title}
            className="ios-card p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-14"
          >
            <div className={`md:w-1/2 space-y-4 ${i % 2 === 1 ? "md:order-2" : ""}`}>
              <div className="inline-flex items-center gap-2 bg-primary-light text-primary px-3.5 py-1 rounded-full text-xs font-bold">
                <span>{f.tag}</span>
              </div>
              <h2 className="text-[24px] md:text-[30px] font-bold text-on-surface font-display">{f.title}</h2>
              <p className="text-body-md text-on-surface-variant leading-relaxed">{f.desc}</p>
              <ul className="space-y-2.5 pt-2">
                {f.items.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-body-sm text-on-surface">
                    <span className="w-5 h-5 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0 text-xs font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`md:w-1/2 w-full h-[240px] md:h-[280px] rounded-2xl bg-surface-container flex items-center justify-center border border-black/[0.04] ${i % 2 === 1 ? "md:order-1" : ""}`}>
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${f.tint} shadow-xs`}>
                <span className="material-symbols-outlined text-[40px]">{f.icon}</span>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* 🍏 CTA */}
      <section className="py-16 md:py-24 text-center px-4 sm:px-margin-mobile md:px-margin-desktop bg-white border-t border-black/[0.06]">
        <div className="max-w-3xl mx-auto ios-card p-10 md:p-14 bg-surface-container">
          <h2 className="text-[28px] md:text-[36px] font-bold text-on-surface font-display mb-3">
            Ready to Transform Your Community?
          </h2>
          <p className="text-body-md text-on-surface-variant max-w-xl mx-auto mb-8 leading-relaxed">
            Join hundreds of modern societies utilizing ResidentOne to enhance transparency and resident satisfaction.
          </p>
          <Link
            to="/register"
            className="ios-btn-primary px-8 py-3.5 text-body-sm no-underline shadow-[0_4px_16px_rgba(0,105,72,0.25)]"
          >
            Get Started Today
          </Link>
        </div>
      </section>
    </main>
  );
}