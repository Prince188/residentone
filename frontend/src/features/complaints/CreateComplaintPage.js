import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CATEGORIES, PRIORITIES, createComplaint, extractApiError } from "../../lib/complaints";

export default function CreateComplaintPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("medium");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (payload) => createComplaint(payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      navigate("/complaints");
    },
    onError: (err) => setError(extractApiError(err, "Failed to create complaint.")),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }
    mutation.mutate({ title: title.trim(), description: description.trim(), category, priority, isPublic });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
      <div>
        <Link
          to="/complaints"
          className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Complaints
        </Link>
        <h1 className="page-title">New Complaint</h1>
        <p className="page-subtitle">Choose Public or Private - who can see it.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 space-y-4">
        <div>
          <label htmlFor="c-title" className="mb-1 block text-label-md font-medium text-on-surface">
            Title *
          </label>
          <input
            id="c-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Water leak in Tower B"
            maxLength={150}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="c-desc" className="mb-1 block text-label-md font-medium text-on-surface">
            Description *
          </label>
          <textarea
            id="c-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={4}
            maxLength={2000}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-label-sm text-outline">{description.length}/2000</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="c-cat" className="mb-1 block text-label-md font-medium text-on-surface">
              Category
            </label>
            <select
              id="c-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-prio" className="mb-1 block text-label-md font-medium text-on-surface">
              Priority
            </label>
            <select
              id="c-prio"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4">
          <p className="text-label-md font-semibold text-on-surface">Who can see this complaint?</p>
          <p className="mt-1 text-label-sm text-on-surface-variant">Private = only you + Admin. Public = all members in your society can see.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-colors ${!isPublic ? "border-primary bg-primary/10" : "border-outline-variant bg-surface-container-lowest hover:border-outline"}`}
            >
              <span className="material-symbols-outlined text-[22px] text-primary">lock</span>
              <span className="text-label-md font-semibold text-on-surface">Private</span>
              <span className="text-center text-label-sm text-on-surface-variant">Only you + Admin</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-colors ${isPublic ? "border-primary bg-primary/10" : "border-outline-variant bg-surface-container-lowest hover:border-outline"}`}
            >
              <span className="material-symbols-outlined text-[22px] text-primary">public</span>
              <span className="text-label-md font-semibold text-on-surface">Public</span>
              <span className="text-center text-label-sm text-on-surface-variant">Everyone in society</span>
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-error-container px-3 py-2 text-label-md text-on-error-container">{error}</p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/complaints"
            className="rounded-full border border-outline-variant px-4 py-2 text-label-md text-on-surface no-underline hover:border-primary hover:text-primary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-label-md text-on-primary no-underline transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {mutation.isPending ? "Creating..." : "Create Complaint"}
          </button>
        </div>
      </form>
    </div>
  );
}
