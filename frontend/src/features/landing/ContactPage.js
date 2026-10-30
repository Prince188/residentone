import { useState } from "react";
import SEO from "../../components/SEO";

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact ResidentOne",
  description: "Reach out to the ResidentOne team for sales, support, inquiries, or custom society demonstrations.",
  url: "https://residentone.app/contact",
  mainEntity: {
    "@type": "Organization",
    name: "ResidentOne",
    email: "hello@residentone.in",
    telephone: "+91-98765-43210",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Surat",
      addressRegion: "Gujarat",
      addressCountry: "IN"
    }
  }
};

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col bg-surface min-h-screen">
      <SEO
        title="Contact Us & Request a Free Demo"
        description="Get in touch with ResidentOne. Contact our sales and support team or request a live demonstration for your residential society management committee."
        keywords={[
          "contact residentone",
          "society app support",
          "request society software demo",
          "apartment management sales inquiry",
        ]}
        canonicalPath="/contact"
        schema={contactSchema}
      />

      {/* 🍏 Hero */}
      <section className="w-full pt-28 pb-14 md:pt-36 md:pb-20 px-4 sm:px-margin-mobile md:px-margin-desktop text-center bg-gradient-to-b from-[#E8FDF2]/40 via-surface to-surface">
        <div className="max-w-[800px] mx-auto">
          <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary-light px-3.5 py-1 rounded-full border border-primary/15 inline-block mb-3">
            Direct Support & Sales
          </span>
          <h1 className="text-[34px] md:text-[46px] lg:text-[54px] leading-[1.08] tracking-tight font-bold text-on-surface mb-4 font-display">
            We'd Love to Hear From You
          </h1>
          <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-xl mx-auto leading-relaxed">
            Have questions about onboarding your society, scheduling an executive demo, or custom features? Our team responds within 24 hours.
          </p>
        </div>
      </section>

      {/* 🍏 Main Content Grid */}
      <section className="max-w-container mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop pb-20 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Contact Form Card */}
          <div className="md:col-span-7 lg:col-span-8 ios-card p-6 md:p-10">
            {!submitted ? (
              <>
                <h2 className="text-2xl font-bold text-on-surface mb-6 font-display">Send us a message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fullName">Full Name</label>
                      <input
                        className="ios-input"
                        id="fullName"
                        name="name"
                        type="text"
                        placeholder="Rahul Sharma"
                        value={form.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant" htmlFor="emailAddress">Email Address</label>
                      <input
                        className="ios-input"
                        id="emailAddress"
                        name="email"
                        type="email"
                        placeholder="rahul@example.com"
                        value={form.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="subject">Subject</label>
                    <div className="relative">
                      <select
                        className="ios-input appearance-none pr-10"
                        id="subject"
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        required
                      >
                        <option value="" disabled hidden>Select an inquiry topic</option>
                        <option value="demo">Request a Live Demonstration</option>
                        <option value="pricing">Society Pricing & Custom Quotes</option>
                        <option value="support">Technical Support for Residents</option>
                        <option value="partnership">Agency & Builder Partnership</option>
                        <option value="other">General Feedback</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="message">Message</label>
                    <textarea
                      className="ios-input resize-y"
                      id="message"
                      name="message"
                      placeholder="Tell us about your residential society or requirements..."
                      rows="5"
                      value={form.message}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="ios-btn-primary px-8 py-3.5 text-body-sm shadow-[0_4px_16px_rgba(0,105,72,0.25)]"
                  >
                    <span>Send Message</span>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 rounded-3xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <span className="material-symbols-outlined text-[32px]">check_circle</span>
                </div>
                <h2 className="text-2xl font-bold text-on-surface mb-2 font-display">Message Received!</h2>
                <p className="text-body-md text-on-surface-variant max-w-sm mx-auto">
                  Thank you for reaching out. A ResidentOne specialist will connect with you within 24 hours.
                </p>
              </div>
            )}
          </div>

          {/* Contact Info Pills & Cards */}
          <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-4">
            <div className="ios-card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[22px]">mail</span>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-on-surface-muted font-bold">Email Us</h3>
                <p className="text-body-sm text-on-surface font-semibold mt-0.5">hello@residentone.in</p>
              </div>
            </div>

            <div className="ios-card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[22px]">call</span>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-on-surface-muted font-bold">Phone Support</h3>
                <p className="text-body-sm text-on-surface font-semibold mt-0.5">+91 98765 43210</p>
              </div>
            </div>

            <div className="ios-card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[22px]">location_on</span>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-on-surface-muted font-bold">Headquarters</h3>
                <p className="text-body-sm text-on-surface font-semibold mt-0.5">Surat, Gujarat, India</p>
              </div>
            </div>

            <div className="ios-card p-5 bg-gradient-to-br from-[#004730] to-[#006948] text-white flex items-center gap-4 shadow-md">
              <div className="w-11 h-11 rounded-2xl bg-white/15 text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">timer</span>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider opacity-80 font-bold">Response Time</h3>
                <p className="text-body-sm font-semibold mt-0.5">Average reply in under 4 hours</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="w-full h-64 md:h-80 border-t border-black/[0.06] overflow-hidden">
        <iframe
          title="ResidentOne Office - Surat"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d235013.70717495973!2d72.74109999999999!3d21.1702401!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04e4d4b346e13%3A0x7f8c3b8c9c6b5b5b!2sSurat%2C%20Gujarat!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>
    </div>
  );
}