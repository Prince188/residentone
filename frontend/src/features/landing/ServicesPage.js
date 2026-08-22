import { Link } from "react-router-dom";

const services = [
  {
    icon: "🏘",
    title: "Society Management",
    desc: "Complete tools for managing buildings, units, residents, and memberships across one or many societies.",
    color: "bg-blue-50",
    features: ["Multi-society support", "Building & unit management", "Resident directory", "Role-based access control"],
  },
  {
    icon: "💰",
    title: "Billing & Payments",
    desc: "Automated maintenance billing, online payment collection via Razorpay, and expense tracking.",
    color: "bg-green-50",
    features: ["Auto invoice generation", "Razorpay integration", "Payment tracking", "Expense management"],
  },
  {
    icon: "🔧",
    title: "Complaint Management",
    desc: "Residents raise complaints, admins assign staff, everyone tracks progress in real-time.",
    color: "bg-orange-50",
    features: ["Easy complaint filing", "Auto-assignment", "Status tracking", "Resident notifications"],
  },
  {
    icon: "🚗",
    title: "Parking & Visitors",
    desc: "Slot allocation, vehicle registry, visitor pre-approval, and gate pass management.",
    color: "bg-violet-50",
    features: ["Slot allocation", "Vehicle registry", "Visitor pre-approval", "Gate pass system"],
  },
  {
    icon: "📋",
    title: "Notices & Documents",
    desc: "Publish notices to all or specific residents. Store and share society documents securely.",
    color: "bg-pink-50",
    features: ["Targeted notices", "Document library", "Read receipts", "Expiry scheduling"],
  },
  {
    icon: "📅",
    title: "Events & Amenities",
    desc: "Create community events, manage amenity bookings, and keep the social calendar alive.",
    color: "bg-sky-50",
    features: ["Event creation", "Amenity booking", "Calendar view", "Reminders"],
  },
];

const capabilities = [
  {
    title: "For Society Admins",
    text: "Full control over billing, member management, and operations. Generate invoices, approve expenses, assign complaints, and view reports — all from one dashboard.",
    items: ["Financial reports & summaries", "Bulk member invitations", "Maintenance config per unit", "Audit log for all actions"],
  },
  {
    title: "For Residents",
    text: "Pay maintenance bills online, raise complaints, pre-approve visitors, and stay updated with notices — all from your phone or laptop.",
    items: ["Online bill payment", "Complaint tracking", "Visitor pre-approval", "Document access"],
  },
];

export default function ServicesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-20 px-12 text-center bg-[#f8f9ff]">
        <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-brand text-[13px] font-semibold mb-5">
          Our Services
        </span>
        <h1 className="text-[44px] font-extrabold mb-4 tracking-[-0.5px]">Everything Your Society Needs</h1>
        <p className="text-lg text-gray-500 max-w-[640px] mx-auto leading-relaxed">
          A single platform to manage billing, complaints, visitors, notices, and
          day-to-day operations for any residential community in India.
        </p>
      </section>

      {/* Core Services */}
      <section className="py-20 px-12 max-w-[1100px] mx-auto">
        <h2 className="text-[32px] font-bold text-center mb-3">Core Services</h2>
        <p className="text-base text-gray-500 text-center leading-relaxed mb-12 max-w-[640px] mx-auto">
          Six powerful modules that cover every aspect of residential society management.
        </p>
        <div className="grid grid-cols-3 gap-7">
          {services.map((svc) => (
            <div key={svc.title} className="bg-white rounded-[14px] p-9 border border-gray-100">
              <div className={`w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-[26px] mb-5 ${svc.color}`}>
                {svc.icon}
              </div>
              <h3 className="text-[19px] font-bold mb-2.5">{svc.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{svc.desc}</p>
              <ul className="list-none p-0 m-0">
                {svc.features.map((f) => (
                  <li key={f} className="text-[13px] text-gray-600 py-[5px] flex items-center gap-2">
                    <span className="text-green-500 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 px-12 bg-gray-50">
        <div className="max-w-[1100px] mx-auto">
          {capabilities.map((cap, i) => (
            <div
              key={cap.title}
              className="grid grid-cols-2 gap-12 items-center"
              style={{ marginBottom: i === 0 ? 64 : 0 }}
            >
              <div style={i % 2 === 1 ? { order: 2 } : {}}>
                <h2 className="text-[30px] font-bold mb-4">{cap.title}</h2>
                <p className="text-[15px] text-gray-500 leading-relaxed mb-6">{cap.text}</p>
                <ul className="list-none p-0 m-0">
                  {cap.items.map((item) => (
                    <li key={item} className="flex gap-3 mb-4 text-[15px] text-gray-600 leading-relaxed">
                      <div className="w-2 h-2 rounded-full bg-brand mt-[7px] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className="bg-[#f8f9ff] min-h-[260px] flex items-center justify-center text-[64px] rounded-[14px] border border-gray-100"
                style={i % 2 === 1 ? { order: 1 } : {}}
              >
                {i === 0 ? "🏢" : "📱"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-12 max-w-[1100px] mx-auto">
        <h2 className="text-[32px] font-bold text-center mb-3">How It Works</h2>
        <p className="text-base text-gray-500 text-center leading-relaxed mb-12 max-w-[640px] mx-auto">
          Get started in four simple steps — no technical expertise required.
        </p>
        <div className="grid grid-cols-4 gap-8 text-center">
          {[
            { n: "1", title: "Create Account", desc: "Sign up for free in under a minute." },
            { n: "2", title: "Set Up Society", desc: "Add buildings, units, and invite members." },
            { n: "3", title: "Configure", desc: "Set billing cycles, roles, and permissions." },
            { n: "4", title: "Go Live", desc: "Residents join, pay bills, and raise complaints." },
          ].map((step) => (
            <div key={step.n} className="p-6">
              <div className="w-12 h-12 rounded-full bg-brand text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                {step.n}
              </div>
              <h4 className="text-base font-bold mb-2">{step.title}</h4>
              <p className="text-[13px] text-gray-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-12">
        <div className="max-w-[700px] mx-auto p-14 rounded-2xl bg-brand text-center">
          <h2 className="text-[30px] font-bold text-white mb-3.5">Ready to Simplify Society Management?</h2>
          <p className="text-base text-white/90 mb-8">
            Start with our free plan. No credit card required.
          </p>
          <Link to="/register" className="inline-block px-9 py-3.5 rounded-[10px] bg-white text-brand text-base font-semibold no-underline">
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
