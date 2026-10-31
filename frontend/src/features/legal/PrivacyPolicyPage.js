import { useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const sections = [
  { id: "overview", label: "1. Overview & DPDP Scope" },
  { id: "collection", label: "2. Data We Collect" },
  { id: "purpose", label: "3. Purpose of Processing" },
  { id: "retention", label: "4. Retention & Auto-Purge" },
  { id: "sharing", label: "5. Third-Party Processors" },
  { id: "security", label: "6. Security & Encryption" },
  { id: "rights", label: "7. Your DPDP 2023 Rights" },
  { id: "grievance", label: "8. Grievance Officer" },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState("overview");

  const scrollTo = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <main className="flex-grow bg-[#FAFBF9] min-h-screen">
      <SEO
        title="Privacy Policy & DPDP Act 2023 Compliance"
        description="Official Privacy Policy and Data Protection declaration for ResidentOne. Compliant with the Digital Personal Data Protection Act, 2023 (DPDP Act)."
        keywords={[
          "privacy policy",
          "DPDP Act 2023",
          "ResidentOne data protection",
          "society privacy",
          "resident data security",
          "gate pass data policy"
        ]}
        canonicalPath="/privacy"
      />

      {/* Header Banner */}
      <header className="relative bg-[#002117] text-white py-16 md:py-20 border-b border-emerald-950 overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#006948_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="relative z-10 max-w-container mx-auto px-margin-mobile md:px-margin-desktop text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold tracking-wider uppercase mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            DPDP Act 2023 Aligned
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Privacy Policy &amp; Data Protection
          </h1>
          <p className="text-emerald-100/80 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            ResidentOne is dedicated to safeguarding the privacy and digital personal data of every resident, visitor, management committee member, and staff member.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-emerald-200/70">
            <span>Last Updated: October 2026</span>
            <span>&bull;</span>
            <span>Applicable Law: DPDP Act 2023 (India)</span>
            <span>&bull;</span>
            <span>Version: 2.1.0</span>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Quick Navigation Sticky Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                Policy Navigation
              </h3>
              <nav className="flex flex-col space-y-1">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`text-left text-sm py-2 px-3 rounded-xl transition-all flex items-center justify-between ${
                      activeSection === s.id
                        ? "bg-emerald-50 font-bold text-emerald-800 border-l-4 border-emerald-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className="material-symbols-outlined text-[16px] opacity-40">chevron_right</span>
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="bg-emerald-900/5 rounded-xl p-4 border border-emerald-900/10">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs mb-1">
                    <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    Data Protection Officer
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Have questions about your data or wish to exercise your DPDP rights?</p>
                  <a
                    href="mailto:residentone188@gmail.com"
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1"
                  >
                    residentone188@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Detailed Policy Text */}
          <article className="lg:col-span-8 space-y-12 text-gray-700 text-sm md:text-base leading-relaxed">

            {/* Section 1 */}
            <section id="overview" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  1
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Overview &amp; DPDP Scope
                </h2>
              </div>
              <p className="mb-4">
                This Privacy Policy outlines how <strong>ResidentOne</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, processes, stores, and protects digital personal data in compliance with India&rsquo;s <strong>Digital Personal Data Protection Act, 2023 (DPDP Act 2023)</strong> and Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4">
                <h4 className="font-bold text-gray-900 text-sm mb-2">Dual Relationship Under Law:</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  <li>
                    <strong>Housing Society / RWA (Data Fiduciary):</strong> The Management Committee or Resident Welfare Association determines the membership rules, unit allocation, gate security rules, and maintenance schedules.
                  </li>
                  <li>
                    <strong>ResidentOne Platform (Data Processor &amp; Co-Fiduciary):</strong> ResidentOne provides the software infrastructure, databases, and digital applications to safely process records on behalf of the society.
                  </li>
                </ul>
              </div>
              <p className="text-xs text-gray-500">
                By downloading, registering, or using the ResidentOne mobile application or web portal, you acknowledge having read and understood this policy.
              </p>
            </section>

            {/* Section 2 */}
            <section id="collection" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  2
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Personal Data We Collect
                </h2>
              </div>
              <p className="mb-4">
                We strictly collect personal data necessary to operate gated community services, gate security, maintenance accounting, and emergency communications:
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-gray-100 bg-[#FAFBF9]">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">person</span>
                    A. Resident &amp; Unit Profiles
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Full name, primary mobile number, email address, password hash (encrypted), flat/house number, block/wing, ownership designation (Owner or Tenant), and optional family members registered with digital gate passes.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-[#FAFBF9]">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">shield</span>
                    B. Gate Terminal &amp; Visitor Logs
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Visitor full name, visitor mobile number, vehicle registration number, purpose of visit (Guest, Delivery, Cab, Domestic Staff, Maintenance Technician), entry/exit timestamps, host unit label, and security guard camera photo snapshot taken at the gate terminal.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-[#FAFBF9]">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">receipt_long</span>
                    C. Maintenance &amp; Society Dues
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Maintenance cycle invoice records, payment dates, transaction IDs generated by Cashfree, offline cash/bank payment remarks recorded by society administrators, and computer-generated payment receipts. <em>Note: ResidentOne never stores raw credit card numbers or UPI PINs.</em>
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-[#FAFBF9]">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">directions_car</span>
                    D. Vehicles &amp; Parking Data
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Vehicle classification (2-Wheeler / 4-Wheeler), license plate number, vehicle make/model, and assigned parking lot / RFID sticker identifiers.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-[#FAFBF9]">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">support_agent</span>
                    E. Complaints &amp; Community Communications
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Helpdesk ticket titles, descriptions, uploaded evidence images, community survey votes, poll ballots, and notices published by the management committee.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section id="purpose" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  3
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Purpose of Processing &amp; Lawful Basis
                </h2>
              </div>
              <p className="mb-3">
                In accordance with <strong>Section 4 and Section 6 of the DPDP Act 2023</strong>, all data processing is conducted solely for specified, lawful, and explicit purposes:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                <li>
                  <strong>Gate Security &amp; Intercom Alerts:</strong> Verifying visitor identities at the society gate and notifying residents via push notifications or intercom ringing before permitting entry.
                </li>
                <li>
                  <strong>Society Dues &amp; Accounting:</strong> Generating digital invoices, recording cash collections, processing online settlements, and issuing verified receipts for annual audits.
                </li>
                <li>
                  <strong>Emergency SOS Support:</strong> Dispatching real-time emergency alerts to on-duty security guards and family contacts with unit location coordinates.
                </li>
                <li>
                  <strong>Community Governance:</strong> Enabling transparent committee resolutions, society polls, notice distribution, and maintenance ticket tracking.
                </li>
              </ul>
              <div className="mt-4 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-xs text-emerald-900">
                <strong>Zero Commercial Monetization Guarantee:</strong> We do <u>not</u> sell, lease, or monetize resident personal data, phone numbers, or vehicle information to advertisers, marketing brokers, or data analytics firms.
              </div>
            </section>

            {/* Section 4 */}
            <section id="retention" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  4
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Data Retention &amp; Auto-Purging Policy
                </h2>
              </div>
              <p className="mb-4">
                Under the DPDP principle of <strong>Purpose Limitation and Storage Limitation</strong>, data is retained only for the duration required to fulfill its operational purpose or satisfy legal audit obligations:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-gray-200 rounded-xl overflow-hidden">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Data Type</th>
                      <th className="py-3 px-4">Retention Period</th>
                      <th className="py-3 px-4">Post-Retention Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-600">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-gray-800">Gate Visitor Logs &amp; Photos</td>
                      <td className="py-3 px-4">90 Calendar Days</td>
                      <td className="py-3 px-4 text-emerald-700 font-medium">Automatically Purged / Erased</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-gray-800">Maintenance Financial Receipts</td>
                      <td className="py-3 px-4">7 - 8 Years (Statutory Audit)</td>
                      <td className="py-3 px-4">Archived for Society Chartered Accountant Audit</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-gray-800">Resident Profile &amp; Vehicles</td>
                      <td className="py-3 px-4">Duration of Society Residency</td>
                      <td className="py-3 px-4">De-linked upon Move-out; Erased on Request</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-gray-800">Closed Complaints &amp; Helpdesk</td>
                      <td className="py-3 px-4">12 Months following Resolution</td>
                      <td className="py-3 px-4">Anonymized / Closed</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 5 */}
            <section id="sharing" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  5
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Third-Party Data Processors
                </h2>
              </div>
              <p className="mb-4">
                We engage verified enterprise technology partners who comply with rigorous data protection standards under binding data processing agreements:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <h4 className="font-bold text-gray-900 text-sm">Payment Gateway (Cashfree)</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Facilitates UPI, Netbanking, and Debit/Credit cards under RBI-approved PCI-DSS Level 1 compliance. ResidentOne never stores raw payment tokens.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <h4 className="font-bold text-gray-900 text-sm">Cloud Infrastructure (AWS / GCP)</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    All application servers, primary databases, and document vaults are hosted in high-security, ISO 27001 certified data center regions located in India.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <h4 className="font-bold text-gray-900 text-sm">Push Notifications (Expo / FCM)</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Used exclusively to deliver urgent visitor gate alerts, intercom rings, and official society circulars to user devices.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <h4 className="font-bold text-gray-900 text-sm">Transactional SMS &amp; WhatsApp Gateways</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Delivers time-sensitive OTP login codes and emergency broadcast circulars.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section id="security" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  6
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Security Safeguards &amp; Encryption
                </h2>
              </div>
              <p className="mb-4">
                We implement comprehensive organizational and technical security measures to prevent data breaches, unauthorized access, or accidental alterations:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 text-center">
                  <span className="material-symbols-outlined text-emerald-700 text-3xl mb-2">lock</span>
                  <h5 className="font-bold text-gray-900 text-xs mb-1">256-bit TLS Encryption</h5>
                  <p className="text-[11px] text-gray-600">All data in transit is encrypted using bank-grade HTTPS/TLS protocols.</p>
                </div>
                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 text-center">
                  <span className="material-symbols-outlined text-emerald-700 text-3xl mb-2">key</span>
                  <h5 className="font-bold text-gray-900 text-xs mb-1">Salted Bcrypt Hashing</h5>
                  <p className="text-[11px] text-gray-600">Passwords are cryptographically hashed; never stored in readable plain text.</p>
                </div>
                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 text-center">
                  <span className="material-symbols-outlined text-emerald-700 text-3xl mb-2">admin_panel_settings</span>
                  <h5 className="font-bold text-gray-900 text-xs mb-1">Strict Role-Based Access</h5>
                  <p className="text-[11px] text-gray-600">Gate guards cannot view resident financials or private documents.</p>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section id="rights" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  7
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Your Rights Under the DPDP Act, 2023
                </h2>
              </div>
              <p className="mb-4">
                As a <strong>Data Principal</strong>, Indian privacy law affords you explicit rights regarding your digital personal data:
              </p>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm">Right to Access Information (Section 11)</h5>
                    <p className="text-xs text-gray-600">You can view all personal details stored about you directly in the ResidentOne profile and download transaction receipts.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm">Right to Correction &amp; Updation (Section 12)</h5>
                    <p className="text-xs text-gray-600">You may update inaccurate contact details, registered vehicles, or family members at any time via your profile settings.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm">Right to Erasure / Right to be Forgotten (Section 12)</h5>
                    <p className="text-xs text-gray-600">Upon leaving or relocating from the housing society, you have the right to request deletion of your account and personal records.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-emerald-600 mt-0.5">check_circle</span>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm">Right of Grievance Redressal (Section 13)</h5>
                    <p className="text-xs text-gray-600">You have the right to file grievances directly with our designated Grievance Officer and escalate to the Data Protection Board if unresolved.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 8 */}
            <section id="grievance" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  8
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Data Protection Grievance Officer
                </h2>
              </div>
              <p className="mb-4">
                In compliance with <strong>Section 13 of the DPDP Act 2023</strong> and the Information Technology Rules, the designated Grievance Redressal Officer for ResidentOne can be reached at:
              </p>

              <div className="bg-gradient-to-br from-emerald-900 to-[#002117] text-white rounded-2xl p-6 shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
                  <div>
                    <span className="text-emerald-300 font-semibold uppercase text-[10px] tracking-wider block mb-1">Officer Name</span>
                    <p className="font-bold text-base">Grievance Redressal Officer</p>
                    <p className="text-emerald-100/80">ResidentOne Technologies Pvt. Ltd.</p>
                  </div>
                  <div>
                    <span className="text-emerald-300 font-semibold uppercase text-[10px] tracking-wider block mb-1">Direct Privacy Helpline</span>
                    <a href="mailto:residentone188@gmail.com" className="font-bold text-emerald-300 hover:text-white underline block">
                      residentone188@gmail.com
                    </a>
                    <span className="text-emerald-100/70 text-[11px]">Expected Response: Within 48-72 hours</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-emerald-800 text-[11px] text-emerald-200/70">
                  Corporate Office: ResidentOne Technologies, Tech Hub District, Bengaluru, Karnataka, India - 560103.
                </div>
              </div>
            </section>

          </article>

        </div>
      </div>
    </main>
  );
}
