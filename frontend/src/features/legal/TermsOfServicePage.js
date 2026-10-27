import { useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const sections = [
  { id: "acceptance", label: "1. Acceptance of Terms" },
  { id: "accounts", label: "2. User Accounts & Society Roles" },
  { id: "visitor", label: "3. Gate Security & Visitors" },
  { id: "billing", label: "4. Maintenance Dues & Payments" },
  { id: "conduct", label: "5. Community Code of Conduct" },
  { id: "liability", label: "6. Limitation of Liability" },
  { id: "termination", label: "7. Account Termination & Move-out" },
  { id: "governing", label: "8. Governing Law & Dispute" },
];

export default function TermsOfServicePage() {
  const [activeSection, setActiveSection] = useState("acceptance");

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
        title="Terms of Service & Resident Agreement"
        description="Official Terms of Service and End User License Agreement for ResidentOne residential community management platform."
        keywords={[
          "terms of service",
          "resident agreement",
          "society software terms",
          "ResidentOne EULA",
          "maintenance payment terms"
        ]}
        canonicalPath="/terms"
      />

      {/* Header Banner */}
      <header className="relative bg-[#002117] text-white py-16 md:py-20 border-b border-emerald-950 overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#006948_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="relative z-10 max-w-container mx-auto px-margin-mobile md:px-margin-desktop text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold tracking-wider uppercase mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Official Platform Agreement
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-emerald-100/80 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Please read these terms carefully before accessing or using ResidentOne web and mobile applications.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-emerald-200/70">
            <span>Last Updated: October 2026</span>
            <span>&bull;</span>
            <span>Jurisdiction: India</span>
            <span>&bull;</span>
            <span>Applicable to: All Societies &amp; Residents</span>
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
                Terms Navigation
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
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-xs font-bold text-gray-800 mb-1">Related Policy</div>
                  <p className="text-xs text-gray-600 mb-2">Review how your digital personal data is handled under DPDP 2023.</p>
                  <Link
                    to="/privacy"
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1"
                  >
                    View Privacy Policy &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Detailed Terms Content */}
          <article className="lg:col-span-8 space-y-12 text-gray-700 text-sm md:text-base leading-relaxed">

            {/* Section 1 */}
            <section id="acceptance" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  1
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Acceptance of Terms
                </h2>
              </div>
              <p className="mb-4">
                These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;Resident&rdquo;, or &ldquo;Society Administrator&rdquo;) and <strong>ResidentOne Technologies Pvt. Ltd.</strong> (&ldquo;ResidentOne&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
              </p>
              <p className="text-gray-600 mb-2">
                By registering an account, linking your flat unit, downloading the mobile app, or using any feature on ResidentOne, you agree to comply with and be bound by these Terms and our <strong>Privacy Policy</strong>.
              </p>
            </section>

            {/* Section 2 */}
            <section id="accounts" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  2
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  User Accounts &amp; Society Roles
                </h2>
              </div>
              <p className="mb-3">
                ResidentOne operates on a role-based architectural hierarchy. Your access privileges correspond to your verified affiliation with your residential society:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                <li>
                  <strong>Society Administrators &amp; Managers:</strong> Authorized committee representatives responsible for verifying resident flats, approving house invite links, publishing circulars, and managing maintenance collections.
                </li>
                <li>
                  <strong>Residents (Owners &amp; Tenants):</strong> Verified occupants entitled to receive gate intercom alerts, pre-approve guests, pay maintenance dues, raise helpdesk complaints, and participate in community voting.
                </li>
                <li>
                  <strong>Security Guards:</strong> Stationed personnel authorized to operate the Gate Terminal interface to register walk-in visitors, take gate photos, and log vehicle check-ins.
                </li>
              </ul>
              <p className="text-xs text-gray-500 mt-4">
                Users must keep account login credentials strictly confidential and immediately report unauthorized account activity.
              </p>
            </section>

            {/* Section 3 */}
            <section id="visitor" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  3
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Gate Security &amp; Visitors Policy
                </h2>
              </div>
              <p className="mb-3">
                The Gate Terminal and Visitor Management features are provided to assist society security. By using these features:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                <li>
                  Residents acknowledge that approving a visitor or delivery agent grants authorization to entry into the society premises.
                </li>
                <li>
                  Security guards must ensure visitor data (name, mobile number, vehicle plate) entered into the Gate Terminal is truthful and accurate to the best of their knowledge.
                </li>
                <li>
                  ResidentOne provides the verification technology but does not physically police entry or guarantee third-party conduct on society premises.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="billing" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  4
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Maintenance Dues &amp; Payment Processing
                </h2>
              </div>
              <p className="mb-3">
                ResidentOne facilitates online payments through RBI-authorized payment aggregators (such as Razorpay) and enables administrators to record offline bank or cash payments:
              </p>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong>Settlement Destination:</strong> All maintenance fees, penalty charges, and event collections paid online settle directly into the registered bank account of your Housing Society / RWA.
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong>Receipt Issuance:</strong> Digital receipts generated by the system reflect the verified payment status. Offline records marked by admins are subject to the society&rsquo;s internal accounting checks.
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <strong>Refunds &amp; Disputes:</strong> Maintenance refund requests must be directed to your Society Management Committee, as funds reside in the society&rsquo;s official bank account.
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section id="conduct" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  5
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Community Code of Conduct
                </h2>
              </div>
              <p className="mb-3">
                Residents and staff agree not to use the helpdesk, notices, polls, or chat rooms to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600">
                <li>Harass, abuse, defame, or threaten any fellow resident, guard, or committee member.</li>
                <li>Post defamatory, obscene, or racially discriminatory content.</li>
                <li>Spam or post unauthorized commercial advertisements in community channels.</li>
                <li>Attempt to reverse engineer, hack, or overload the application servers.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section id="liability" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  6
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Limitation of Liability
                </h2>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                To the maximum extent permitted by applicable Indian laws:
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                ResidentOne is a SaaS technology enabler and shall not be liable for any indirect, incidental, or consequential damages resulting from society management disputes, physical gate security breaches, power/internet outages at the guard house, or disputes between unit owners and tenants.
              </p>
            </section>

            {/* Section 7 */}
            <section id="termination" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  7
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Account Termination &amp; Move-Out
                </h2>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                When a resident relocates, sells their flat, or concludes their tenancy, they may request an account de-linking or deletion via the Profile Settings screen or by contacting society administration. Past financial transactions are preserved as part of the society&rsquo;s statutory audit ledger.
              </p>
            </section>

            {/* Section 8 */}
            <section id="governing" className="scroll-mt-28 bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  8
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  Governing Law &amp; Jurisdiction
                </h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                These Terms are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of these Terms shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India.
              </p>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600">
                For questions regarding these Terms, contact our legal team at <a href="mailto:legal@residentone.app" className="text-emerald-700 font-bold underline">legal@residentone.app</a>.
              </div>
            </section>

          </article>

        </div>
      </div>
    </main>
  );
}
