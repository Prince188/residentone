import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership } from "../../stores/society.store";
import FormField from "../../components/form/FormField";
import { createNotice, extractApiError } from "../../lib/notices";

const ADMIN_ROLES = ["super_admin", "society_admin"];

export default function CreateNoticePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeMembership = useSocietyStore(selectActiveMembership);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const isAdmin = ADMIN_ROLES.includes(activeMembership?.role);

  const mutation = useMutation({
    mutationFn: (payload) => createNotice(payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      navigate("/notices");
    },
    onError: (err) =>
      setError(extractApiError(err, "Failed to publish notice. Please try again.")),
  });

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-error text-[40px]">lock</span>
          <h1 className="mt-3 text-headline-sm text-on-surface">Admins only</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Only the society admin can publish notices.
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
    <div className="mx-auto max-w-2xl space-y-stack-lg">
      <section>
        <Link
          to="/notices"
          className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Notices
        </Link>
        <h1 className="mt-1 text-headline-md text-on-surface">Create Notice</h1>
        <p className="mt-1 text-body-sm text-on-surface-variant">
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
            onClick={() => navigate("/notices")}
            className="rounded-full border border-outline-variant px-5 py-2.5 text-label-md text-on-surface transition-colors hover:border-primary hover:text-primary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
