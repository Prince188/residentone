import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveSociety, selectActiveMembership } from "../../stores/society.store";
import FormField from "../../components/form/FormField";
import { createNotice, extractApiError } from "../../lib/notices";
import api from "../../lib/api";
import { hasPermission } from "../../lib/permissions";

export default function CreateNoticePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canCreateNotice = hasPermission(activeMembership?.role, "create_notice", permissionsQuery.data);

  const mutation = useMutation({
    mutationFn: (payload) => createNotice(payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      navigate("/notices");
    },
    onError: (err) =>
      setError(extractApiError(err, "Failed to publish notice. Please try again.")),
  });

  if (!canCreateNotice) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="mt-3 text-headline-sm text-on-surface">No permission</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            You don’t have permission to publish notices. Ask your Society Admin to grant you <strong>Create Notice</strong> permission.
          </p>
          <Link
            to="/notices"
            className="mt-4 inline-block text-label-md text-primary no-underline hover:underline"
          >
            Back to Notices
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    if (!body.trim() || body.trim().length < 5) {
      setError("Notice body must be at least 5 characters.");
      return;
    }
    setError("");
    mutation.mutate({ title: title.trim(), body: body.trim() });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <section>
        <Link
          to="/dashboard"
          className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Dashboard
        </Link>
        <h1 className="page-title mt-1">Create Notice</h1>
        <p className="page-subtitle">
          This notice will be visible to every member of the society.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField id="notice-title" label="Title" required error="">
          <input
            id="notice-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            placeholder="e.g. Annual General Meeting"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </FormField>

        <FormField
          id="notice-body"
          label="Message"
          required
          hint={`${body.trim().length}/2000 characters`}
        >
          <textarea
            id="notice-body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            placeholder="Write the full notice here..."
            className="w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </FormField>

        {error && (
          <p className="rounded-lg bg-error-container px-4 py-2.5 text-label-md text-on-error-container">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-label-md text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            {mutation.isPending ? "Publishing..." : "Publish Notice"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-full border border-outline-variant px-5 py-2.5 text-label-md text-on-surface transition-colors hover:border-primary hover:text-primary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
