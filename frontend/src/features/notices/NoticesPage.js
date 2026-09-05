import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveMembership,
  selectActiveSociety,
} from "../../stores/society.store";
import { getNotices, updateNotice, deleteNotice, extractApiError, timeAgo } from "../../lib/notices";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

function NoticeCard({ notice, onOpen, canManage, onEdit, onDelete }) {
  return (
    <article
      onClick={() => onOpen(notice)}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 pl-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5 sm:pl-6 cursor-pointer ${
        notice.isLatest
          ? "border-primary bg-primary-fixed/40"
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

      <div>
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
          <div className="flex items-center gap-1 shrink-0">
            {notice.isLatest && (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-label-sm font-semibold text-on-primary mr-1">
                Latest
              </span>
            )}
            {canManage && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onEdit(notice)}
                  className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                  title="Edit Notice"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(notice)}
                  className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                  title="Delete Notice"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 line-clamp-3 text-body-sm leading-relaxed text-on-surface-variant">
          {notice.body}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-end gap-1 pt-2 text-label-md font-medium text-primary">
        Read full notice
        <span className="material-symbols-outlined text-[16px] transition-transform duration-200 group-hover:translate-x-1">
          arrow_forward
        </span>
      </div>
    </article>
  );
}

function NoticeDetailModal({ notice, onClose, canManage, onEdit, onDelete }) {
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
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2 text-label-sm text-outline">
            <span className="material-symbols-outlined text-[16px]">campaign</span>
            {timeAgo(notice.createdAt)}
          </div>
          <div className="flex items-center gap-1">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(notice);
                  }}
                  className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                  title="Edit"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(notice);
                  }}
                  className="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                  title="Delete"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        <h2 className="mt-2 pr-8 text-headline-sm font-semibold text-on-surface">
          {notice.title}
        </h2>
        <p className="mt-4 whitespace-pre-line text-body-md text-on-surface-variant leading-relaxed">
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

function EditNoticeModal({ notice, open, onClose, onSave, isSaving, error }) {
  const [title, setTitle] = useState(notice?.title || "");
  const [body, setBody] = useState(notice?.body || "");

  useEffect(() => {
    if (notice) {
      setTitle(notice.title || "");
      setBody(notice.body || "");
    }
  }, [notice, open]);

  if (!open || !notice) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    onSave({ id: notice.id, title: title.trim(), body: body.trim() });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={isSaving ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-title-md font-bold text-on-surface">Edit Notice</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && <p className="text-body-sm text-error">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-label-sm font-semibold text-on-surface mb-1">
              Title <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-outline-variant bg-white px-3.5 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface mb-1">
              Notice Content <span className="text-error">*</span>
            </label>
            <textarea
              required
              minLength={5}
              maxLength={2000}
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-outline-variant bg-white px-3.5 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-outline-variant px-4 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low cursor-pointer disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !body.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-label-md font-semibold text-on-primary hover:bg-primary/90 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NoticesPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canCreateNotice = hasPermission(activeMembership?.role, "create_notice", permissionsQuery.data);
  const queryClient = useQueryClient();

  const [selectedNotice, setSelectedNotice] = useState(null);
  const [editingNotice, setEditingNotice] = useState(null);
  const [deletingNotice, setDeletingNotice] = useState(null);
  const [actionError, setActionError] = useState("");

  const noticesQuery = useQuery({
    queryKey: ["notices", activeSociety?.id],
    queryFn: async () => (await getNotices()).data.data,
    enabled: Boolean(activeSociety),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title, body }) => updateNotice(id, { title, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      setEditingNotice(null);
      setActionError("");
    },
    onError: (err) => setActionError(extractApiError(err, "Failed to update notice")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteNotice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      setDeletingNotice(null);
      setSelectedNotice(null);
      setActionError("");
    },
    onError: (err) => setActionError(extractApiError(err, "Failed to delete notice")),
  });

  const notices = noticesQuery.data || [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/dashboard"
            className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Dashboard
          </Link>
          <h1 className="page-title">Notices</h1>
          <p className="page-subtitle">
            Announcements from your society admin.
          </p>
        </div>
        {canCreateNotice && (
          <Link
            to="/notices/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md text-on-primary no-underline transition-opacity hover:opacity-90 shadow-sm"
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
                {canCreateNotice && (
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
                canManage={canCreateNotice}
                onOpen={setSelectedNotice}
                onEdit={(n) => {
                  setActionError("");
                  setEditingNotice(n);
                }}
                onDelete={(n) => {
                  setActionError("");
                  setDeletingNotice(n);
                }}
              />
            ))
          )}
        </section>
      )}

      <NoticeDetailModal
        notice={selectedNotice}
        canManage={canCreateNotice}
        onClose={() => setSelectedNotice(null)}
        onEdit={(n) => {
          setActionError("");
          setEditingNotice(n);
        }}
        onDelete={(n) => {
          setActionError("");
          setDeletingNotice(n);
        }}
      />

      <EditNoticeModal
        notice={editingNotice}
        open={Boolean(editingNotice)}
        onClose={() => {
          setEditingNotice(null);
          setActionError("");
        }}
        onSave={(data) => updateMutation.mutate(data)}
        isSaving={updateMutation.isPending}
        error={actionError}
      />

      <ConfirmDialog
        open={Boolean(deletingNotice)}
        title={`Delete Notice "${deletingNotice?.title}"?`}
        message="Are you sure you want to delete this notice? It will be removed from the society notice board."
        confirmLabel="Delete Notice"
        danger
        busy={deleteMutation.isPending}
        error={actionError}
        onConfirm={() => deleteMutation.mutate(deletingNotice?.id)}
        onClose={() => {
          setDeletingNotice(null);
          setActionError("");
        }}
      />
    </div>
  );
}
