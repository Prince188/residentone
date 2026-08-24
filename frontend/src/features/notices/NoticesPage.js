import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveMembership,
  selectActiveSociety,
} from "../../stores/society.store";
import { getNotices, extractApiError, timeAgo } from "../../lib/notices";

const ADMIN_ROLES = ["super_admin", "society_admin"];

function NoticeCard({ notice }) {
  return (
    <article
      className={`rounded-xl border p-4 transition-colors sm:p-5 ${
        notice.isLatest
          ? "border-primary-fixed bg-primary-fixed/40"
          : "border-outline-variant bg-surface-container-lowest hover:border-outline"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-body-md font-semibold text-on-surface">{notice.title}</h3>
        <span className="shrink-0 text-label-sm text-outline">{timeAgo(notice.createdAt)}</span>
      </div>
      <p className="mt-1 text-body-sm text-on-surface-variant">{notice.body}</p>
      <p className="mt-2 flex items-center gap-1 text-label-sm text-outline">
        <span className="material-symbols-outlined text-[14px]">person</span>
        {notice.authorName}
      </p>
    </article>
  );
}

export default function NoticesPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const isAdmin = ADMIN_ROLES.includes(activeMembership?.role);

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
              <NoticeCard key={notice.id} notice={{ ...notice, isLatest: index === 0 }} />
            ))
          )}
        </section>
      )}
    </div>
  );
}
