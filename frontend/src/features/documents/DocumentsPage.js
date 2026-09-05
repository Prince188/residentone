import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import { getDocuments, uploadDocument, updateDocument, downloadDocument, deleteDocument, extractApiError, formatFileSize, formatDate, DOCUMENT_CATEGORIES, getFileTypeMeta } from "../../lib/documents";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

function DocumentCard({ doc, canManage, onEdit, onDelete, onDownload, downloadingId }) {
  const cat = DOCUMENT_CATEGORIES.find((c) => c.value === doc.category) || DOCUMENT_CATEGORIES[4];
  const fileMeta = getFileTypeMeta(doc.fileType, doc.fileName);
  const isDownloading = downloadingId === doc.id;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Category colored left accent stripe */}
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${cat.stripe || "bg-primary"}`} />

      <div>
        {/* Top bar: Category badge & File Extension Pill */}
        <div className="flex items-center justify-between gap-2 pl-1">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-semibold border ${cat.pill || "bg-primary/10 text-primary border-primary/20"}`}>
            <span className="material-symbols-outlined text-[13px]">{cat.icon}</span>
            {cat.label}
          </span>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${fileMeta.badge}`}>
            {fileMeta.typeLabel}
          </span>
        </div>

        {/* File icon preview and title */}
        <div className="mt-3.5 flex items-start gap-3 pl-1">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${fileMeta.iconBox}`}>
            <span className="material-symbols-outlined text-[24px]">{fileMeta.icon}</span>
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 text-body-lg font-bold text-on-surface" title={doc.title}>
              {doc.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-label-sm text-outline">
              <span>{formatFileSize(doc.fileSize)}</span>
              <span>•</span>
              <span className="truncate">{formatDate(doc.createdAt)}</span>
            </p>
          </div>
        </div>

        {/* Optional Description */}
        {doc.description && (
          <p className="mt-2.5 line-clamp-2 pl-1 text-body-sm text-on-surface-variant bg-surface-container-low/50 p-2 rounded-lg border border-outline-variant/40">
            {doc.description}
          </p>
        )}

        <p className="mt-2.5 pl-1 truncate text-[11px] text-outline flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">person</span>
          Uploaded by <strong className="font-semibold text-on-surface-variant">{doc.uploadedByName || "Admin"}</strong>
        </p>
      </div>

      {/* Action Footer */}
      <div className="mt-4 flex items-center gap-2 border-t border-outline-variant/60 pt-3.5 pl-1">
        <button
          type="button"
          onClick={() => onDownload(doc)}
          disabled={isDownloading}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-label-md font-semibold text-on-primary shadow-xs hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">
            {isDownloading ? "hourglass_top" : "download"}
          </span>
          {isDownloading ? "Downloading..." : "Download"}
        </button>

        {canManage && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(doc)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
              title="Edit Details"
            >
              <span className="material-symbols-outlined text-[17px]">edit</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(doc)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-error/30 bg-surface-container-lowest text-error hover:bg-error/10 transition-colors cursor-pointer"
              title="Delete File"
            >
              <span className="material-symbols-outlined text-[17px]">delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditDocumentModal({ doc, open, onClose, onSave, isSaving, error }) {
  const [title, setTitle] = useState(doc?.title || "");
  const [category, setCategory] = useState(doc?.category || "other");
  const [description, setDescription] = useState(doc?.description || "");

  if (!open || !doc) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ id: doc.id, payload: { title: title.trim(), category, description: description.trim() } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={isSaving ? undefined : onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">edit_document</span>
            </span>
            <div>
              <h3 className="text-title-md font-bold text-on-surface">Edit Document Details</h3>
              <p className="text-[12px] text-outline">Update file name, classification or note</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-error/30 bg-error-container/50 p-3 text-label-md text-on-error-container">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-label-sm font-semibold text-on-surface">Document Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Navratri 2026 Expense Bill"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-label-sm font-semibold text-on-surface">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOCUMENT_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-label-sm font-semibold transition-all cursor-pointer ${
                    category === c.value
                      ? "border-primary bg-primary text-on-primary shadow-xs"
                      : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-label-sm font-semibold text-on-surface">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes or details for residents..."
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full border border-outline-variant px-4 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="rounded-full bg-primary px-5 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("bill");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (!title.trim()) {
        const nameWithoutExt = droppedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title.trim()) {
        const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }
    }
  };

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!title.trim() || title.trim().length < 3) throw new Error("Title must be at least 3 characters");
      if (!file) throw new Error("Select a PDF or image file (max 10MB)");
      if (file.size > 10 * 1024 * 1024) throw new Error("File too large. Maximum size is 10MB");
      const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
      const ext = file.name.toLowerCase().split(".").pop();
      const allowedExt = ["pdf", "jpg", "jpeg", "png", "webp"];
      if (!allowed.includes(file.type) && !allowedExt.includes(ext)) throw new Error("Only PDF and images (jpg, png, webp) are allowed");
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary">
              <span className="material-symbols-outlined text-[20px]">upload_file</span>
            </span>
            <div>
              <h3 className="text-title-md font-bold text-on-surface">Upload Document / Bill</h3>
              <p className="text-[12px] text-outline">Upload bills, vouchers, or statements (max 10MB)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-error/30 bg-error-container/50 p-3 text-label-md text-on-error-container">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Drag & Drop Zone */}
          <div>
            <label className="mb-1.5 block text-label-sm font-semibold text-on-surface">File *</label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                dragActive
                  ? "border-primary bg-primary/10"
                  : file
                  ? "border-emerald-400 bg-emerald-50/20"
                  : "border-outline-variant bg-surface-container-low/50 hover:border-primary/50 hover:bg-surface-container-low"
              }`}
            >
              <input
                id="doc-file-input"
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="sr-only"
              />

              {file ? (
                <div className="space-y-2">
                  <span className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <span className="material-symbols-outlined text-[28px]">
                      {file.type === "application/pdf" ? "picture_as_pdf" : "image"}
                    </span>
                  </span>
                  <div>
                    <p className="text-body-md font-bold text-on-surface truncate max-w-xs">{file.name}</p>
                    <p className="text-[12px] text-outline">{formatFileSize(file.size)}</p>
                  </div>
                  <label
                    htmlFor="doc-file-input"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Change File
                  </label>
                </div>
              ) : (
                <label htmlFor="doc-file-input" className="cursor-pointer space-y-2">
                  <span className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
                  </span>
                  <div>
                    <p className="text-body-md font-semibold text-on-surface">
                      <span className="text-primary font-bold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-[12px] text-outline mt-0.5">PDF or image (JPG, PNG, WEBP) up to 10MB</p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-label-sm font-semibold text-on-surface">Document Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Navratri Tent Bill, Lift AMC Receipt"
              maxLength={100}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Category Pill Buttons */}
          <div>
            <label className="mb-1.5 block text-label-sm font-semibold text-on-surface">Category *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOCUMENT_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-label-sm font-semibold transition-all cursor-pointer ${
                    category === c.value
                      ? "border-primary bg-primary text-on-primary shadow-xs"
                      : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-label-sm font-semibold text-on-surface">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or details for residents..."
              rows={2}
              maxLength={500}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/60">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-outline-variant px-4 py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => uploadMut.mutate()}
              disabled={uploadMut.isPending || !file}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              {uploadMut.isPending ? "Uploading..." : "Upload Document"}
            </button>
          </div>
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
  const [editingDoc, setEditingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
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

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateDocument(id, payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setEditingDoc(null);
      setMsg("Document details updated");
      setTimeout(() => setMsg(""), 2500);
    },
    onError: (e) => setErr(extractApiError(e, "Update failed")),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteDocument(id).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setDeletingDoc(null);
      setMsg("Document deleted");
      setTimeout(() => setMsg(""), 2000);
    },
    onError: (e) => setErr(extractApiError(e, "Delete failed")),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">folder_open</span>
            Documents & Bills
          </h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}
            Official bills, collection vouchers, expense statements, and society records.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">upload</span> Upload Document
          </button>
        )}
      </section>

      {/* Notifications */}
      {msg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/60 px-4 py-3 text-body-sm font-medium text-emerald-800 shadow-xs">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          {msg}
        </div>
      )}
      {err && (
        <div className="flex items-center gap-2 rounded-xl bg-error-container/50 border border-error/30 px-4 py-3 text-body-sm font-medium text-on-error-container">
          <span className="material-symbols-outlined text-[18px] text-error">error</span>
          {err}
        </div>
      )}

      {/* Overview Banner */}
      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-label-md uppercase tracking-[0.14em] text-white/70">Vault Overview</p>
              <h2 className="mt-1 text-headline-sm font-bold text-white">Society Document Vault</h2>
              <p className="mt-1 text-label-md text-white/80">Search, view and download financial records and invoices</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
              <span className="material-symbols-outlined text-[24px]">description</span>
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-headline-sm font-bold text-white">{docs.length}</p>
              <p className="text-label-sm text-white/70">Total Files</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-headline-sm font-bold text-white">
                {docs.filter((d) => d.fileType === "application/pdf" || d.fileName?.toLowerCase().endsWith(".pdf")).length}
              </p>
              <p className="text-label-sm text-white/70">PDF Documents</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-headline-sm font-bold text-white">
                {docs.filter((d) => d.category === "bill" || d.category === "expense").length}
              </p>
              <p className="text-label-sm text-white/70">Bills & Expenses</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-headline-sm font-bold text-white">
                {docs.filter((d) => d.category === "collection" || d.category === "navratri").length}
              </p>
              <p className="text-label-sm text-white/70">Collections</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`rounded-full px-3.5 py-1.5 text-label-sm font-semibold border transition-all cursor-pointer ${
              category === "all"
                ? "bg-primary text-on-primary border-primary shadow-xs"
                : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low"
            }`}
          >
            All Files
          </button>
          {DOCUMENT_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-label-sm font-semibold border transition-all cursor-pointer ${
                category === c.value
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80 sm:shrink-0">
          <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-outline">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by title..."
            className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-9 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-outline hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {docsQuery.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {/* Error state */}
      {docsQuery.isError && (
        <div className="rounded-2xl border border-error/30 bg-error-container/40 p-6 text-center text-body-md text-error">
          {extractApiError(docsQuery.error, "Failed to load documents.")}
        </div>
      )}

      {/* Empty State */}
      {docsQuery.isSuccess && docs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center shadow-xs">
          <span className="material-symbols-outlined text-[48px] text-outline">folder_open</span>
          <h3 className="mt-3 text-title-md font-semibold text-on-surface">No documents found</h3>
          <p className="mt-1 text-body-sm text-on-surface-variant max-w-md mx-auto">
            {search || category !== "all"
              ? "No files match your search criteria. Try changing filters or search keywords."
              : canManage
              ? "Upload bills, receipts, or festival collection sheets for residents to view."
              : "No documents have been uploaded to the society vault yet."}
          </p>
          {canManage && !search && category === "all" && (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-label-md font-semibold text-on-primary hover:opacity-90 shadow-sm transition-opacity cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span> Upload First Document
            </button>
          )}
        </div>
      )}

      {/* Documents Grid */}
      {docs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => (
            <DocumentCard
              key={d.id}
              doc={d}
              canManage={canManage}
              onEdit={(doc) => setEditingDoc(doc)}
              onDelete={(doc) => setDeletingDoc(doc)}
              onDownload={handleDownload}
              downloadingId={downloadingId}
            />
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => setMsg("Uploaded successfully")} />}

      <EditDocumentModal
        doc={editingDoc}
        open={Boolean(editingDoc)}
        onClose={() => setEditingDoc(null)}
        onSave={(data) => updateMut.mutate(data)}
        isSaving={updateMut.isPending}
        error={err}
      />

      <ConfirmDialog
        open={Boolean(deletingDoc)}
        title={`Delete Document "${deletingDoc?.title}"?`}
        message="Are you sure you want to delete this document? The file will be permanently removed from the society vault."
        confirmLabel="Delete File"
        danger
        busy={deleteMut.isPending}
        error={err}
        onConfirm={() => deleteMut.mutate(deletingDoc?.id)}
        onClose={() => setDeletingDoc(null)}
      />
    </div>
  );
}
