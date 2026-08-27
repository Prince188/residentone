import { Link } from "react-router-dom";

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Dashboard
      </Link>
      <h1 className="page-title">Documents</h1>
    </div>
  );
}
