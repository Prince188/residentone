import { useState } from "react";
import SEO from "../../components/SEO";

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Contact ResidentOne",
  "description": "Reach out to the ResidentOne team for sales, support, inquiries, or custom society demonstrations.",
  "url": "https://residentone.app/contact",
  "mainEntity": {
    "@type": "Organization",
    "name": "ResidentOne",
    "email": "hello@residentone.in",
    "telephone": "+91-98765-43210",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Mumbai",
      "addressRegion": "Maharashtra",
      "addressCountry": "IN"
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
    <div className="flex flex-col">
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
      {/* Hero */}
      <section className="w-full bg-on-surface pt-24 pb-16 md:pt-32 md:pb-24 px-margin-mobile md:px-margin-desktop text-center">
        <div className="max-w-[800px] mx-auto">
          <h1 className="text-[32px] md:text-[42px] lg:text-[52px] leading-[1.1] tracking-tight font-bold text-on-primary mb-stack-md">Get in Touch</h1>
          <p className="text-body-lg text-inverse-primary max-w-2xl mx-auto">
            Have a question, need a demo, or want to discuss a custom plan? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop py-16 md:py-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter lg:gap-[64px]">
          {/* Contact Form */}
          <div className="md:col-span-7 lg:col-span-8 bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-outline-variant shadow-[0px_4px_12px_rgba(30,41,59,0.05)]">
            {!submitted ? (
              <>
                <h2 className="text-headline-md font-body text-on-surface mb-stack-lg">Send us a message</h2>
                <form onSubmit={handleSubmit} className="space-y-stack-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                    <div className="flex flex-col gap-stack-sm">
                      <label className="text-label-sm text-on-surface-variant" htmlFor="fullName">Full Name</label>
                      <input
                        className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-sm"
                        id="fullName"
                        name="name"
                        type="text"
                        placeholder="Rahul Sharma"
                        value={form.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-stack-sm">
                      <label className="text-label-sm text-on-surface-variant" htmlFor="emailAddress">Email Address</label>
                      <input
                        className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-sm"
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
                  <div className="flex flex-col gap-stack-sm">
                    <label className="text-label-sm text-on-surface-variant" htmlFor="subject">Subject</label>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-sm"
                        id="subject"
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        required
                      >
                        <option value="" disabled hidden>Select a subject</option>
                        <option value="demo">Request a Demo</option>
                        <option value="pricing">Pricing Question</option>
                        <option value="support">Technical Support</option>
                        <option value="partnership">Partnership</option>
                        <option value="other">Other</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-stack-sm">
                    <label className="text-label-sm text-on-surface-variant" htmlFor="message">Message</label>
                    <textarea
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-sm resize-y"
                      id="message"
                      name="message"
                      placeholder="Tell us how we can help..."
                      rows="5"
                      value={form.message}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full md:w-auto px-8 py-3 bg-on-surface text-on-primary text-label-md rounded hover:bg-inverse-surface transition-colors mt-stack-md flex justify-center items-center gap-2 group"
                  >
                    Send Message
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-16 px-8">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                  <span className="material-symbols-outlined text-[32px] text-green-600">check_circle</span>
                </div>
                <h2 className="text-headline-md text-on-surface mb-2">Message Sent!</h2>
                <p className="text-body-md text-on-surface-variant">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-stack-md mt-8 md:mt-0">
            <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-brand text-[20px]">mail</span>
              </div>
              <div>
                <h3 className="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Email</h3>
                <p className="text-body-md text-on-surface font-medium">hello@residentone.in</p>
              </div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-brand text-[20px]">call</span>
              </div>
              <div>
                <h3 className="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Phone</h3>
                <p className="text-body-md text-on-surface font-medium">+91 98765 43210</p>
              </div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-brand text-[20px]">location_on</span>
              </div>
              <div>
                <h3 className="text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Office</h3>
                <p className="text-body-md text-on-surface font-medium">Mumbai, Maharashtra, India</p>
              </div>
            </div>
            <div className="bg-primary-container p-6 rounded-lg flex items-start gap-4 mt-auto">
              <div className="w-10 h-10 rounded-full bg-on-primary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-primary text-[20px]">schedule</span>
              </div>
              <div>
                <h3 className="text-label-sm text-on-primary-container mb-1 uppercase tracking-wider opacity-90">Response Time</h3>
                <p className="text-body-md text-on-primary-container font-medium">Within 24 hours on business days</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="w-full h-64 md:h-96 mt-auto">
        <div className="w-full h-full bg-surface-container border-y border-outline-variant overflow-hidden">
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
        </div>
      </section>
    </div>
  );
}
