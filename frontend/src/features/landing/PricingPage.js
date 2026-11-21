import { useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

export const INCLUDED_FEATURES = [
  "Full Society Management & Admin Portal",
  "Gatekeeper & Instant Visitor Passes",
  "Automated Maintenance Invoicing & Ledger",
  "Cashfree UPI, Card & Netbanking Collection",
  "Complaints & Helpdesk Ticketing",
  "Amenity Booking & Notice Broadcasts",
  "Resident Directory & Multi-Wing Admin Matrix",
  "Emergency SOS & Guard Patrol Logging",
];

function calculatePricing(units, billing) {
  const isSemiAnnual = billing === "semi_annual";
  const months = isSemiAnnual ? 6 : 12;
  const basePrice = isSemiAnnual ? 2100 : 4000;
  const baseUnits = 200;
  const extraUnits = Math.max(0, units - baseUnits);
  const overage = extraUnits * 2 * months;
  const total = basePrice + overage;
  const monthlyEffective = Math.round(total / months);

  return {
    isSemiAnnual,
    months,
    basePrice,
    extraUnits,
    overage,
    total,
    monthlyEffective,
  };
}

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "ResidentOne Society Management Plans",
  "description": "Transparent society management pricing: 6 Months (₹2,100) and 12 Months (₹4,000) covering up to 200 units.",
  "offers": [
    {
      "@type": "Offer",
      "name": "6 Months Plan",
      "price": "2100",
      "priceCurrency": "INR",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock",
      "description": "Semi-annual society management access covering up to 200 units, then ₹2/unit/mo."
    },
    {
      "@type": "Offer",
      "name": "12 Months (Annual) Plan",
      "price": "4000",
      "priceCurrency": "INR",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock",
      "description": "Annual uninterrupted society management access covering up to 200 units, then ₹2/unit/mo."
    }
  ]
};

export default function PricingPage() {
  const [billing, setBilling] = useState("yearly"); // "semi_annual" | "yearly"
  const [units, setUnits] = useState(150);

  const semiAnnual = calculatePricing(units, "semi_annual");
  const annual = calculatePricing(units, "yearly");
  const formatPrice = (n) => n.toLocaleString("en-IN");

  const plans = [
    {
      id: "semi_annual",
      name: "6 Months Access",
      desc: "Semi-annual full access for societies looking for flexible commitments.",
      price: semiAnnual.total,
      period: "per 6 months",
      effective: `₹${semiAnnual.monthlyEffective}/mo effective`,
      popular: false,
      calc: semiAnnual,
      save: null,
      btn: "Start 6 Months",
    },
    {
      id: "yearly",
      name: "12 Months (Annual)",
      desc: "Full year uninterrupted coverage with maximum annual savings for the society.",
      price: annual.total,
      period: "per year",
      effective: `₹${annual.monthlyEffective}/mo effective`,
      popular: true,
      calc: annual,
      save: "Save ₹200 vs semi-annual",
      btn: "Start Annual Plan",
    },
  ];

  return (
    <main className="flex-grow bg-surface">
      <SEO
        title="Affordable Society Management Pricing & Plans"
        description="Simple and transparent pricing plans for residential societies and apartments: ₹2,100 for 6 months and ₹4,000 for 12 months with up to 200 units included."
        keywords={[
          "society software pricing",
          "apartment app plans",
          "housing society cost calculator",
          "society maintenance billing software price",
        ]}
        canonicalPath="/pricing"
        schema={pricingSchema}
      />

      {/* Hero */}
      <section className="pt-28 pb-14 md:pt-36 md:pb-20 px-4 sm:px-margin-mobile md:px-margin-desktop max-w-container mx-auto text-center">
        <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15 inline-block mb-3">
          Transparent Investment
        </span>
        <h1 className="text-[32px] md:text-[44px] lg:text-[52px] leading-tight font-bold text-on-surface mb-4 max-w-3xl mx-auto font-display">
          Simple, Transparent Pricing for Every Society
        </h1>
        <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
          Base flat rate includes up to <strong>200 units</strong> and unlocks <strong>all platform features</strong>. 
          Societies with more than 200 units pay only ₹2 / extra unit / month. No setup fees or hidden surprises.
        </p>

        {/* Unit Selector Slider */}
        <div className="mb-10 max-w-md mx-auto ios-card p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-on-surface-muted mb-2">
            Number of Residential Units
          </div>
          
          {/* Buttons and Display */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <button
              className="w-10 h-10 rounded-full border border-black/[0.1] bg-surface-container text-xl font-semibold cursor-pointer flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setUnits((u) => Math.max(10, u - 10))}
              disabled={units <= 10}
            >
              −
            </button>
            <div className="text-[34px] font-bold text-primary min-w-[90px] text-center font-display">
              {units}
            </div>
            <button
              className="w-10 h-10 rounded-full border border-black/[0.1] bg-surface-container text-xl font-semibold cursor-pointer flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setUnits((u) => Math.min(2000, u + 10))}
              disabled={units >= 2000}
            >
              +
            </button>
          </div>

          {/* Range Input Slider */}
          <div className="px-2">
            <input
              type="range"
              min="10"
              max="1000"
              step="5"
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-on-surface-muted mt-2">
              <span>Min: 10 units</span>
              <span>200 Base Allowance</span>
              <span>1,000+ units</span>
            </div>
          </div>

          {/* Units Allowance Message */}
          <div className="mt-4 pt-3 border-t border-black/[0.06] text-xs">
            {units <= 200 ? (
              <span className="text-emerald-700 font-semibold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                All {units} units covered under base allowance (up to 200 units included)
              </span>
            ) : (
              <span className="text-amber-800 font-semibold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">info</span>
                200 units base included + {units - 200} extra units @ ₹2/unit/month
              </span>
            )}
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="inline-flex gap-1 bg-surface-container p-1 rounded-full border border-black/[0.04]">
          <button
            className={`px-6 py-2 rounded-full text-body-sm font-semibold cursor-pointer transition-all ${
              billing === "semi_annual"
                ? "bg-white text-primary shadow-xs"
                : "bg-transparent text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setBilling("semi_annual")}
          >
            6 Months
          </button>
          <button
            className={`px-6 py-2 rounded-full text-body-sm font-semibold cursor-pointer transition-all flex items-center gap-2 ${
              billing === "yearly"
                ? "bg-white text-primary shadow-xs"
                : "bg-transparent text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setBilling("yearly")}
          >
            <span>12 Months (Annual)</span>
            <span className="text-[10px] bg-primary-light text-primary px-2 py-0.5 rounded-full font-bold">Save ₹200</span>
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 md:py-16 px-4 sm:px-margin-mobile md:px-margin-desktop bg-surface">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`ios-card p-7 md:p-8 flex flex-col justify-between ${
                  plan.popular
                    ? "border-2 border-primary relative shadow-apple-hero md:-translate-y-2 ring-4 ring-primary/10"
                    : "border border-black/[0.06]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Best Value · Annual
                  </div>
                )}
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-on-surface mb-1 font-display">
                    {plan.name}
                  </h3>
                  <p className="text-body-sm text-on-surface-variant mb-5 h-10 leading-snug">
                    {plan.desc}
                  </p>
                  <div className="mb-6 pb-5 border-b border-black/[0.05]">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[38px] md:text-[46px] leading-none font-bold text-on-surface font-display">
                        ₹{formatPrice(plan.price)}
                      </span>
                      <span className="text-body-sm text-on-surface-variant font-medium">
                        {plan.period}
                      </span>
                    </div>
                    <div className="text-xs text-primary font-bold mt-1.5">
                      {plan.effective}
                    </div>
                    {plan.save && (
                      <div className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">savings</span>
                        <span>{plan.save}</span>
                      </div>
                    )}
                    {plan.calc.extraUnits > 0 && (
                      <div className="text-[11px] text-amber-800 font-medium mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        Base ₹{plan.calc.basePrice.toLocaleString("en-IN")} + {plan.calc.extraUnits} extra units @ ₹2/unit/mo (₹{plan.calc.overage.toLocaleString("en-IN")})
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
                    All Platform Features Included:
                  </p>
                  <ul className="space-y-2.5 mb-6">
                    {INCLUDED_FEATURES.map((f) => (
                      <li key={f} className="flex items-center text-body-sm text-on-surface gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                          ✓
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  to="/register"
                  className={`w-full py-3 px-4 rounded-full text-body-sm font-semibold text-center no-underline transition-all active:scale-[0.98] ${
                    plan.popular
                      ? "bg-primary text-white shadow-[0_2px_12px_rgba(0,105,72,0.25)] hover:bg-primary-hover"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {plan.btn}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
