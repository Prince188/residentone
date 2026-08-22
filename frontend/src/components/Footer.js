import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-surface-container-lowest w-full py-20 border-t border-surface-variant">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="md:col-span-2 flex flex-col gap-6">
          <Link to="/" className="text-[24px] font-bold text-on-surface flex items-center gap-2 tracking-tight no-underline">
            <span className="material-symbols-outlined text-primary text-[32px]">apartment</span>
            ResidentOne
          </Link>
          <p className="font-body-sm text-on-surface-variant max-w-sm">
            Elevating community management through intelligent, transparent, and beautiful software solutions.
          </p>
          <p className="font-body-sm text-sm text-on-surface-variant opacity-60 mt-4">
            &copy; {new Date().getFullYear()} ResidentOne Society Management. All rights reserved.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="font-label-md font-bold text-on-surface uppercase tracking-widest mb-4">Platform</h4>
          <Link to="/features" className="font-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Features</Link>
          <Link to="/pricing" className="font-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Pricing</Link>
          <a href="#security" className="font-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Security</a>
          <a href="#changelog" className="font-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Changelog</a>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="font-label-md font-bold text-on-surface uppercase tracking-widest mb-4">Legal</h4>
          <a href="#privacy" className="font-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Privacy Policy</a>
          <a href="#terms" className="font-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Terms of Service</a>
          <a href="#cookies" className="font-body-sm text-on-surface-variant hover:text-primary transition-colors no-underline">Cookie Policy</a>
        </div>
      </div>
    </footer>
  );
}
