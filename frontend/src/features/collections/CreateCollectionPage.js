import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCollection, extractApiError, COLLECTION_CATEGORIES } from "../../lib/collections";

export default function CreateCollectionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "festival",
    amount: "",
    dueDate: "",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (payload) => createCollection(payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      navigate("/collections/manage");
    },
    onError: (e) => setError(extractApiError(e, "Failed to create collection")),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || form.title.trim().length < 3) return setError("Title must be at least 3 characters");
    if (!form.amount || Number(form.amount) < 1) return setError("Amount must be at least ₹1");
    if (!form.dueDate) return setError("Due date is required");
    mutation.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      amount: Number(form.amount),
      dueDate: form.dueDate,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <Link to="/collections/manage" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Manage Collections
        </Link>
        <h1 className="page-title flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">volunteer_activism</span>
          Create Collection
        </h1>
        <p className="page-subtitle">One-time collection for festivals (Navratri, Diwali), events, repairs, welfare — per house amount</p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm">
        {error && <p className="rounded-lg bg-error-container px-3 py-2 text-body-sm text-on-error-container">{error}</p>}

        <div>
          <label className="text-label-md font-medium">Title *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g., Navratri Celebration 2026, Diwali Fund, Building Repair"
            maxLength={150}
            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-label-sm text-outline">This appears on dashboard & payment screen</p>
        </div>

        <div>
          <label className="text-label-md font-medium">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional details — purpose, what the fund covers..."
            rows={3}
            maxLength={1000}
            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-label-md font-medium">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
            >
              {COLLECTION_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-md font-medium">Amount per house (₹) *</label>
            <input
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g., 500"
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-label-md font-medium">Due date *</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-full bg-primary px-6 py-2.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
          >
            {mutation.isPending ? "Creating..." : "Create Collection"}
          </button>
          <Link to="/collections/manage" className="text-label-md text-on-surface-variant hover:text-primary">
            Cancel
          </Link>
        </div>

        <p className="text-label-sm text-outline">Residents will see this on Collections page and can pay via cash (admin) or Razorpay online.</p>
      </form>
    </div>
  );
}
