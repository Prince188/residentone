import { useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";

const RATE = { starter: 6, professional: 10, enterprise: 15 };
const YEARLY_MONTHS = 10;

function getPlans(units, billing) {
  const keys = ["starter", "professional", "enterprise"];
  const names = { starter: "Basic", professional: "Standard", enterprise: "Premium" };
  const descs = {
    starter: "Essential billing and resident directories for small societies.",
    professional: "Automated visitor security and amenity bookings for active communities.",
    enterprise: "Deep financial compliance, elections, and documents for large complexes.",
  };
  const featureSet = {
    starter: [
      "Maintenance billing & UPI payments",
      "Notice board & communications",
      "Complaint management helpdesk",
      "Masked resident directory",
      "Family & vehicle profiles",
    ],
    professional: [
      "All Basic features",
      "Visitor gate security tracking",
      "Companion guard app interface",
      "Amenity slot booking calendar",
      "Real-time group chat & DMs",
      "Live dashboard badges",
    ],
    enterprise: [
      "All Standard features",
      "Full ledgers & GST compliance exports",
      "Secret & open ballot polling",
      "Surveys & feedback analytics",
      "Secured flat document vault",
      "Priority setup & support manager",
    ],
  };

  return keys.map((k) => {
    const monthly = units * RATE[k];
    const isYearly = billing === "yearly";
    const price = isYearly ? monthly * YEARLY_MONTHS : monthly;

    return {
      name: names[k],
      desc: descs[k],
      price,
      perUnit: isYearly ? "/year" : "/mo",
      save: isYearly ? "2 months free" : undefined,
      popular: k === "professional",
      features: [`${units} units included`, ...featureSet[k]],
      btn: k === "enterprise" ? "Contact Sales" : `Start ${names[k]}`,
    };
  });
}

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "ResidentOne Society Management Plans",
  "description": "Affordable residential society and apartment complex management pricing plans.",
  "offers": [
    {
      "@type": "Offer",
      "name": "Basic Plan",
      "price": "6",
      "priceCurrency": "INR",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock",
      "description": "Essential billing and resident directories for small societies."
    },
    {
      "@type": "Offer",
      "name": "Standard Plan",
      "price": "10",
      "priceCurrency": "INR",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock",
      "description": "Automated visitor security and amenity bookings for active communities."
    },
    {
      "@type": "Offer",
      "name": "Premium Plan",
      "price": "15",
      "priceCurrency": "INR",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock",
      "description": "Deep financial compliance, elections, and documents for large complexes."
    }
  ]
};

export default function PricingPage() {
  const [billing, setBilling] = useState("monthly");
  const [units, setUnits] = useState(100);

  const plans = getPlans(units, billing);
  const formatPrice = (n) => n.toLocaleString("en-IN");

  return (
    <main className="flex-grow bg-surface">
      <SEO
        title="Affordable Society Management Pricing & Plans"
        description="Simple and transparent pricing plans for residential societies and apartments. Scale effortlessly with monthly or yearly billing and 2 months free."
        keywords={[
          "society software pricing",
          "apartment app plans",
          "housing society cost calculator",
          "society maintenance billing software price",
        ]}
        canonicalPath="/pricing"
        schema={pricingSchema}
      />
      {/* 🍏 Hero */}
      <section className="pt-28 pb-14 md:pt-36 md:pb-20 px-4 sm:px-margin-mobile md:px-margin-desktop max-w-container mx-auto text-center">
        <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15 inline-block mb-3">
          Transparent Investment
        </span>
        <h1 className="text-[32px] md:text-[44px] lg:text-[52px] leading-tight font-bold text-on-surface mb-4 max-w-3xl mx-auto font-display">
          Simple, Transparent Pricing for Every Society
        </h1>
        <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
          Whether you're managing a boutique apartment or a 1,000+ unit township,
          ResidentOne scales with your community. No hidden charges or setup fees.
        </p>

        {/* 🍏 Unit Selector Slider */}
        <div className="mb-10 max-w-md mx-auto ios-card p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-on-surface-muted mb-2">Number of Residential Units</div>
          
          {/* Buttons and Display */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <button
              className="w-10 h-10 rounded-full border border-black/[0.1] bg-surface-container text-xl font-semibold cursor-pointer flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setUnits((u) => Math.max(50, u - 10))}
              disabled={units <= 50}
            >
              −
            </button>
            <div className="text-[34px] font-bold text-primary min-w-[90px] text-center font-display">{units}</div>
            <button
              className="w-10 h-10 rounded-full border border-black/[0.1] bg-surface-container text-xl font-semibold cursor-pointer flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setUnits((u) => Math.min(3000, u + 10))}
              disabled={units >= 3000}
            >
              +
            </button>
          </div>

          {/* Range Input Slider */}
          <div className="px-2">
            <input
              type="range"
              min="50"
              max="3000"
              step="10"
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-on-surface-muted mt-2">
              <span>Min: 50 units</span>
              <span>Max: 3,000 units</span>
            </div>
          </div>
        </div>

        {/* 🍏 Billing Toggle (Apple Segmented Control) */}
        <div className="inline-flex gap-1 bg-surface-container p-1 rounded-full border border-black/[0.04]">
          <button
            className={`px-6 py-2 rounded-full text-body-sm font-semibold cursor-pointer transition-all ${
              billing === "monthly"
                ? "bg-white text-primary shadow-xs"
                : "bg-transparent text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            className={`px-6 py-2 rounded-full text-body-sm font-semibold cursor-pointer transition-all flex items-center gap-2 ${
              billing === "yearly"
                ? "bg-white text-primary shadow-xs"
                : "bg-transparent text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setBilling("yearly")}
          >
            <span>Yearly</span>
            <span className="text-[10px] bg-primary-light text-primary px-2 py-0.5 rounded-full font-bold">2 Mos Free</span>
          </button>
        </div>
      </section>

      {/* 🍏 Pricing Cards */}
      <section className="py-12 md:py-16 px-4 sm:px-margin-mobile md:px-margin-desktop bg-surface">
        <div className="max-w-container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`ios-card p-7 md:p-8 flex flex-col justify-between ${
                  plan.popular
                    ? "border-2 border-primary relative shadow-apple-hero md:-translate-y-2 ring-4 ring-primary/10"
                    : "border border-black/[0.06]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-on-surface mb-1 font-display">{plan.name}</h3>
                  <p className="text-body-sm text-on-surface-variant mb-5 h-10 leading-snug">{plan.desc}</p>
                  <div className="mb-6 pb-5 border-b border-black/[0.05]">
                    <span className="text-[36px] md:text-[44px] leading-none font-bold text-on-surface font-display">₹{formatPrice(plan.price)}</span>
                    <span className="text-body-sm text-on-surface-variant ml-1 font-medium">{plan.perUnit}</span>
                    {plan.save && (
                      <div className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">savings</span>
                        <span>{plan.save} applied</span>
                      </div>
                    )}
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center text-body-sm text-on-surface gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0 text-xs font-bold">✓</span>
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

      {/* 🍏 CTA */}
      <section className="py-16 md:py-24 px-4 sm:px-margin-mobile md:px-margin-desktop bg-white border-t border-black/[0.06] text-center">
        <div className="max-w-3xl mx-auto ios-card p-10 md:p-14 bg-surface-container">
          <h2 className="text-[26px] md:text-[34px] font-bold text-on-surface mb-3 font-display">
            Ready to streamline your society?
          </h2>
          <p className="text-body-md text-on-surface-variant mb-8 max-w-xl mx-auto leading-relaxed">
            Join hundreds of progressive communities already using ResidentOne for transparent accounting and smart security.
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