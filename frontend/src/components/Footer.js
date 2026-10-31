import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-white w-full py-16 md:py-20 border-t border-black/[0.06]">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 max-w-container-max mx-auto px-4 sm:px-margin-mobile md:px-margin-desktop">
        <div className="md:col-span-6 flex flex-col gap-4">
          <Link to="/" className="flex items-center gap-2 tracking-tight no-underline w-fit">
            <img src="/logo-transparent.png" alt="ResidentOne" className="h-8 md:h-9 w-auto object-contain" />
          </Link>
          <p className="text-body-sm text-on-surface-variant max-w-md leading-relaxed">
            Elevating modern residential societies with automated maintenance billing,
            instant digital visitor gate security, and seamless resident communication.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary border border-primary/15">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>Smart Society Platform</span>
            </span>
          </div>
          <p className="text-xs text-on-surface-muted mt-3">
            &copy; {new Date().getFullYear()} ResidentOne Society Management Platform. All rights reserved.
          </p>
        </div>
        <div className="md:col-span-3 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">Platform</h4>
          <Link to="/features" className="text-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Features & Modules</Link>
          <Link to="/pricing" className="text-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Transparent Pricing</Link>
          <Link to="/about" className="text-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">About ResidentOne</Link>
          <Link to="/contact" className="text-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Contact Sales & Support</Link>
          <div className="pt-2 flex flex-col gap-1.5 border-t border-black/[0.06] text-xs">
            <a href="tel:+919106269655" className="text-on-surface font-semibold hover:text-primary transition-colors flex items-center gap-1.5 no-underline">
              <span className="material-symbols-outlined text-[14px] text-primary">call</span>
              +91 91062 69655
            </a>
            <a href="mailto:residentone188@gmail.com" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 no-underline">
              <span className="material-symbols-outlined text-[14px] text-primary">mail</span>
              residentone188@gmail.com
            </a>
          </div>
        </div>
        <div className="md:col-span-3 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">Compliance & Trust</h4>
          <Link to="/privacy" className="text-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Privacy Policy</Link>
          <Link to="/terms" className="text-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Terms of Service</Link>
          <Link to="/privacy#rights" className="text-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">DPDP Resident Rights</Link>
          <span className="text-xs text-on-surface-muted flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-[15px] text-primary">shield</span>
            256-bit SSL Bank-Grade Encryption
          </span>
        </div>
      </div>
    </footer>
  );
}
