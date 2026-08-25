import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveMembership,
  selectActiveSociety,
} from "../../stores/society.store";
import { getNotices, extractApiError, timeAgo } from "../../lib/notices";

const ADMIN_ROLES = ["super_admin", "society_admin"];

function NoticeCard({ notice, onOpen }) {
  return (
    <article
      onClick={() => onOpen(notice)}
      className={`group relative flex h-40 cursor-pointer select-none flex-col overflow-hidden rounded-xl border p-4 pl-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:h-44 sm:p-5 sm:pl-6 ${
        notice.isLatest
          ? "border-primary bg-primary-fixed/50"
          : "border-outline-variant bg-surface-container-lowest hover:border-primary/40"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 transition-colors ${
          notice.isLatest
            ? "bg-primary"
            : "bg-outline-variant group-hover:bg-primary"
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`material-symbols-outlined flex shrink-0 items-center justify-center rounded-full p-2 text-[18px] ${
              notice.isLatest
                ? "bg-primary text-on-primary"
                : "bg-secondary-fixed text-primary"
            }`}
          >
            campaign
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-body-lg font-semibold text-on-surface">
              {notice.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-label-sm text-outline">
              <span className="shrink-0">{timeAgo(notice.createdAt)}</span>
              <span aria-hidden="true" className="text-outline-variant">·</span>
              <span className="truncate">{notice.authorName}</span>
            </p>
          </div>
        </div>
        {notice.isLatest && (
          <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-label-sm font-semibold text-on-primary">
            Latest
          </span>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-body-sm leading-relaxed text-on-surface-variant">
        {notice.body}
      </p>

      <div className="mt-auto flex items-center justify-end gap-1 pt-2 text-label-md font-medium text-primary">
        Read full notice
        <span className="material-symbols-outlined text-[16px] transition-transform duration-200 group-hover:translate-x-1">
          arrow_forward
        </span>
      </div>
    </article>
  );
}

function NoticeDetailModal({ notice, onClose }) {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!notice) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={notice.title}
        className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
        <div className="flex items-center gap-2 text-label-sm text-outline">
          <span className="material-symbols-outlined text-[16px]">campaign</span>
          {timeAgo(notice.createdAt)}
        </div>
        <h2 className="mt-2 pr-8 text-headline-sm font-semibold text-on-surface">
          {notice.title}
        </h2>
        <p className="mt-4 whitespace-pre-line text-body-md text-on-surface-variant">
          {notice.body}
        </p>
        <p className="mt-6 flex items-center gap-1 border-t border-outline-variant pt-3 text-label-sm text-outline">
          <span className="material-symbols-outlined text-[14px]">person</span>
          Posted by {notice.authorName}
        </p>
      </div>
    </div>
  );
}

export default function NoticesPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const isAdmin = ADMIN_ROLES.includes(activeMembership?.role);
  const [selectedNotice, setSelectedNotice] = useState(null);

  const noticesQuery = useQuery({
    queryKey: ["notices", activeSociety?.id],
    queryFn: async () => (await getNotices()).data.data,
    enabled: Boolean(activeSociety),
  });

  const notices = noticesQuery.data || [];

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Notices</h1>
          <p className="page-subtitle">
            Announcements from your society admin.
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/notices/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md text-on-primary no-underline transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Notice
          </Link>
        )}
      </section>

      {noticesQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {noticesQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(noticesQuery.error, "Failed to load notices.")}
        </div>
      )}

      {noticesQuery.isSuccess && (
        <section className="space-y-3">
          {notices.length === 0 ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
              <span className="material-symbols-outlined text-[40px] text-on-surface-variant">campaign</span>
              <p className="mt-3 text-body-md text-on-surface-variant">
                No notices yet.{" "}
                {isAdmin && (
                  <Link to="/notices/new" className="text-primary hover:underline">
                    Publish the first one.
                  </Link>
                )}
              </p>
            </div>
          ) : (
            notices.map((notice, index) => (
              <NoticeCard
                key={notice.id}
                notice={{ ...notice, isLatest: index === 0 }}
                onOpen={setSelectedNotice}
              />
            ))
          )}
        </section>
      )}

      <NoticeDetailModal
        notice={selectedNotice}
        onClose={() => setSelectedNotice(null)}
      />
    </div>
  );
}
