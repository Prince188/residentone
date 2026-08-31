import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getDocuments, uploadDocument, downloadDocument, deleteDocument, extractApiError, formatFileSize, formatDate, DOCUMENT_CATEGORIES } from "../../lib/documents";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

function DocumentCard({ doc, canManage, onDelete, onDownload, downloadingId }) {
  const isPdf = doc.fileType === "application/pdf" || doc.fileName?.toLowerCase().endsWith(".pdf");
  const cat = DOCUMENT_CATEGORIES.find((c) => c.value === doc.category) || DOCUMENT_CATEGORIES[4];
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isPdf ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700"}`}>
            <span className="material-symbols-outlined text-[22px]">{isPdf ? "picture_as_pdf" : "image"}</span>
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-body-md font-semibold text-on-surface">{doc.title}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-label-sm">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{cat.label}</span>
              <span className="text-outline">{formatFileSize(doc.fileSize)}</span>
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm font-medium ${isPdf ? "bg-red-50 text-red-700 border border-red-200" : "bg-sky-50 text-sky-700 border border-sky-200"}`}>
          {isPdf ? "PDF" : "Image"}
        </span>
      </div>

      {doc.description && <p className="mt-2 line-clamp-2 text-body-sm text-on-surface-variant">{doc.description}</p>}

      <p className="mt-2 truncate text-label-sm text-outline">by {doc.uploadedByName} · {formatDate(doc.createdAt)} · {doc.fileName}</p>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDownload(doc)}
          disabled={downloadingId === doc.id}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">{downloadingId === doc.id ? "hourglass_top" : "download"}</span>
          {downloadingId === doc.id ? "Downloading..." : "Download"}
        </button>
        {canManage && (
          <button
            type="button"
            onClick={() => { if (window.confirm(`Delete "${doc.title}"?`)) onDelete(doc.id); }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant text-outline hover:border-error hover:text-error hover:bg-error-container/50"
            title="Delete (requires Manage Documents)"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        )}
      </div>
    </div>
  );
}

function UploadModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("bill");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!title.trim() || title.trim().length < 3) throw new Error("Title must be at least 3 characters");
      if (!file) throw new Error("Select a PDF or image (max 10MB)");
      if (file.size > 10 * 1024 * 1024) throw new Error("File too large. Max 10MB");
      const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
      const ext = file.name.toLowerCase().split(".").pop();
      const allowedExt = ["pdf", "jpg", "jpeg", "png", "webp"];
      if (!allowed.includes(file.type) && !allowedExt.includes(ext)) throw new Error("Only PDF and images (jpg, png, webp) allowed");
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("category", category);
      fd.append("description", description.trim());
      fd.append("file", file);
      const res = await uploadDocument(fd);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      onSuccess();
      onClose();
    },
    onError: (e) => setError(extractApiError(e, e.message || "Upload failed")),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-body-lg font-semibold text-on-surface">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
                <span className="material-symbols-outlined text-[18px]">upload</span>
              </span>
              Upload Bill / Sheet
            </h3>
            <p className="mt-1 text-body-sm text-on-surface-variant">PDF or image, max 10MB. Everyone can download.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-label-md font-medium">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Navratri Collection Bill, Expense Sheet Aug"
              maxLength={100}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-label-md font-medium">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm focus:border-primary focus:outline-none">
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-label-md font-medium">File *</label>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1 file:text-label-sm file:text-on-primary hover:file:opacity-90"
              />
            </div>
          </div>

          {file && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-label-sm text-primary">
              Selected: {file.name} · {formatFileSize(file.size)} {file.size > 10*1024*1024 && <span className="text-error font-semibold">— too large (max 10MB)</span>}
            </p>
          )}

          <div>
            <label className="mb-1 block text-label-md font-medium">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note — e.g., Navratri 2026 expense, Aug maintenance bill"
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="rounded-lg bg-error-container px-3 py-2 text-label-sm text-on-error-container">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-outline-variant px-4 py-2 text-label-md text-on-surface hover:border-primary">Cancel</button>
            <button
              type="button"
              onClick={() => uploadMut.mutate()}
              disabled={uploadMut.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              {uploadMut.isPending ? "Uploading..." : "Upload"}
            </button>
          </div>
          <p className="text-label-sm text-outline text-center">Only PDF and images allowed. Max 10MB. Stored securely for this society.</p>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const activeSociety = useSocietyStore(selectActiveSociety);
  const membership = useSocietyStore(selectActiveMembership);
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [downloadingId, setDownloadingId] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManage = hasPermission(membership?.role, "manage_documents", permissionsQuery.data);

  const docsQuery = useQuery({
    queryKey: ["documents", activeSociety?.id, category, search],
    queryFn: async () => (await getDocuments({ category, search: search.trim() || undefined })).data.data,
    enabled: Boolean(activeSociety),
  });

  const docs = useMemo(() => docsQuery.data || [], [docsQuery.data]);

  const handleDownload = async (doc) => {
    try {
      setDownloadingId(doc.id);
      setErr("");
      const res = await downloadDocument(doc.id);
      const disposition = res.headers["content-disposition"] || res.headers["Content-Disposition"];
      let filename = doc.fileName || `${doc.title}.pdf`;
      if (disposition) {
        const m = disposition.match(/filename="?([^"]+)"?/);
        if (m && m[1]) filename = m[1];
      }
      const blob = new Blob([res.data], { type: doc.fileType || "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMsg(`Downloaded ${filename}`);
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      const m = extractApiError(e, "Download failed");
      if (e?.response?.data instanceof Blob) {
        try { const t = await e.response.data.text(); const j = JSON.parse(t); setErr(j?.error?.message || m); } catch { setErr(m); }
      } else setErr(m);
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteMut = useMutation({
    mutationFn: (id) => deleteDocument(id).then((r) => r.data.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); setMsg("Deleted"); setTimeout(()=>setMsg(""),2000); },
    onError: (e) => setErr(extractApiError(e, "Delete failed")),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">folder_open</span> Documents
          </h1>
          <p className="page-subtitle">{activeSociety ? `${activeSociety.name} · ` : ""}Bills, Navratri collections & expense sheets — everyone can download</p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-label-md text-on-primary hover:opacity-90">
            <span className="material-symbols-outlined text-[18px]">upload</span> Upload Bill
          </button>
        )}
      </section>

      {!canManage && (
        <div className="rounded-lg bg-surface-container-high px-3 py-2 text-label-sm text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">info</span>
          Only society admin and permission-given members can upload. You can view and download.
        </div>
      )}

      {msg && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-body-sm text-emerald-800">{msg}</div>}
      {err && <div className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">{err}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm">
            <option value="all">All categories</option>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <span className="text-label-sm text-outline hidden sm:inline">{docs.length} file{docs.length!==1?"s":""}</span>
        </div>
        <div className="relative w-full sm:w-72 sm:shrink-0">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bills..." className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-4 text-body-sm placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>

      {docsQuery.isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {docsQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(docsQuery.error, "Failed to load documents.")}
        </div>
      )}

      {docsQuery.isSuccess && docs.length === 0 && (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">folder_open</span>
          <p className="mt-3 text-body-md font-semibold text-on-surface">No bills yet</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">{canManage ? "Upload a Navratri collection or expense bill — PDF or image, max 10MB." : "No documents uploaded yet."}</p>
          {canManage && (
            <button type="button" onClick={() => setShowUpload(true)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md text-on-primary hover:opacity-90">
              <span className="material-symbols-outlined text-[18px]">upload</span> Upload First Bill
            </button>
          )}
        </div>
      )}

      {docs.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => (
            <DocumentCard key={d.id} doc={d} canManage={canManage} onDelete={(id) => deleteMut.mutate(id)} onDownload={handleDownload} downloadingId={downloadingId} />
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => setMsg("Uploaded successfully")} />}
    </div>
  );
}
