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
      features: [`${units} units`, ...featureSet[k]],
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
    <main className="flex-grow">
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
      {/* Hero */}
      <section className="py-16 md:py-24 px-margin-mobile md:px-margin-desktop max-w-container mx-auto text-center">
        <h1 className="text-[28px] md:text-[36px] lg:text-[44px] leading-tight font-bold text-on-surface mb-4 max-w-3xl mx-auto">
          Simple, Transparent Pricing for Every Society
        </h1>
        <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-8 leading-relaxed">
          Whether you're managing a small neighborhood or a sprawling residential complex,
          ResidentOne scales with your community's unique needs. No hidden fees.
        </p>

        {/* Unit Selector Slider */}
        <div className="mb-8 max-w-md mx-auto">
          <div className="text-label-sm font-semibold text-on-surface mb-3">Number of Units</div>
          
          {/* Buttons and Display */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              className="w-10 h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-xl font-semibold cursor-pointer flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setUnits((u) => Math.max(50, u - 10))}
              disabled={units <= 50}
            >
              −
            </button>
            <div className="text-[28px] font-bold text-primary min-w-[80px] text-center">{units}</div>
            <button
              className="w-10 h-10 rounded-lg border border-outline-variant bg-surface-container-lowest text-xl font-semibold cursor-pointer flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setUnits((u) => Math.min(3000, u + 10))}
              disabled={units >= 3000}
            >
              +
            </button>
          </div>

          {/* Range Input Slider */}
          <div className="px-4">
            <input
              type="range"
              min="50"
              max="3000"
              step="10"
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-label-sm text-outline mt-2">
              <span>Min: 50 units</span>
              <span>Max: 3,000 units</span>
            </div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="inline-flex gap-1 bg-surface-container rounded-lg p-1">
          <button
            className={`px-5 py-2 rounded-md text-body-sm font-medium cursor-pointer transition-colors ${
              billing === "monthly"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "bg-transparent text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            className={`px-5 py-2 rounded-md text-body-sm font-medium cursor-pointer transition-colors ${
              billing === "yearly"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "bg-transparent text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setBilling("yearly")}
          >
            Yearly
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-10 md:py-12 px-margin-mobile md:px-margin-desktop bg-surface-container-low">
        <div className="max-w-container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-surface-container-lowest rounded-xl p-6 md:p-8 flex flex-col ${
                  plan.popular
                    ? "border-2 border-primary relative shadow-[0px_4px_12px_rgba(30,41,59,0.05)] md:-translate-y-3"
                    : "border border-outline-variant"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary text-label-sm px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <h3 className="text-[20px] md:text-[24px] font-semibold text-on-surface mb-1">{plan.name}</h3>
                <p className="text-body-sm text-on-surface-variant mb-5 h-10">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-[36px] md:text-[42px] leading-none font-bold text-on-surface">₹{formatPrice(plan.price)}</span>
                  <span className="text-body-sm text-on-surface-variant ml-1">{plan.perUnit}</span>
                </div>
                {plan.save && (
                  <div className="text-label-sm text-tertiary font-semibold mb-3">{plan.save}</div>
                )}
                <ul className="space-y-2 mb-6 flex-grow">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center text-body-sm text-on-surface">
                      <span className="text-primary mr-2">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`w-full py-2.5 px-4 rounded-lg text-body-sm font-medium text-center no-underline transition-colors ${
                    plan.popular
                      ? "bg-primary text-on-primary hover:bg-on-primary-fixed-variant"
                      : "border border-outline-variant text-primary hover:bg-surface-container-low"
                  }`}
                >
                  {plan.btn}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-margin-mobile md:px-margin-desktop bg-inverse-surface text-on-primary text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-[24px] md:text-[32px] font-semibold mb-3">
            Ready to streamline your society?
          </h2>
          <p className="text-body-md md:text-body-lg text-on-primary/80 mb-6">
            Join thousands of communities already using ResidentOne for better management.
          </p>
          <Link
            to="/register"
            className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 hover:bg-white hover:text-on-surface transition-colors no-underline inline-block"
          >
            Get started today
          </Link>
        </div>
      </section>
    </main>
  );
}
