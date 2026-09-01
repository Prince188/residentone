/* eslint-disable */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { getPolls, votePoll, updatePoll, closePoll, deletePoll, extractApiError, formatPollEndDate } from "../../lib/polls";
import api from "../../lib/api";
import { hasPermissionForMembership } from "../../lib/permissions";
import useBadgeSeen from "../../hooks/useBadgeSeen";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

function EditPollModal({ poll, open, onClose, onSave, isSaving, error }) {
  const [question, setQuestion] = useState(poll?.question || "");
  const [options, setOptions] = useState(poll?.options?.map((o) => o.text) || ["", ""]);
  const [endDate, setEndDate] = useState(
    poll?.endDate ? new Date(poll.endDate).toISOString().slice(0, 16) : ""
  );

  const hasVotes = (poll?.totalVotes || 0) > 0;

  useEffect(() => {
    if (poll) {
      setQuestion(poll.question || "");
      setOptions(poll.options?.map((o) => o.text) || ["", ""]);
      setEndDate(poll.endDate ? new Date(poll.endDate).toISOString().slice(0, 16) : "");
    }
  }, [poll, open]);

  if (!open || !poll) return null;

  const handleOptionChange = (idx, val) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleAddOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const handleRemoveOption = (idx) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const payload = {
      endDate: endDate ? new Date(endDate).toISOString() : null,
    };
    if (!hasVotes) {
      payload.question = question.trim();
      payload.options = options.filter((o) => o.trim().length > 0);
    }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={isSaving ? undefined : onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xl sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md font-bold text-on-surface">Edit Poll</h3>
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && <p className="rounded-lg bg-error-container p-3 text-label-md text-on-error-container">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-label-sm font-semibold text-on-surface mb-1 block">Question *</label>
            <input
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={hasVotes}
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none disabled:bg-surface-container-high disabled:text-outline"
            />
          </div>

          <div>
            <label className="text-label-sm font-semibold text-on-surface mb-1 block">Options</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    disabled={hasVotes}
                    placeholder={`Option ${i + 1}`}
                    className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none disabled:bg-surface-container-high disabled:text-outline"
                  />
                  {!hasVotes && options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="rounded-full p-1 text-error hover:bg-error-container"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!hasVotes && options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2 text-label-sm font-semibold text-primary hover:underline cursor-pointer"
              >
                + Add Option
              </button>
            )}
          </div>

          {hasVotes && (
            <p className="text-[12px] text-outline bg-surface-container-low p-2.5 rounded-lg">
              ℹ️ Question and options cannot be changed because votes have already been cast. You can still extend the deadline.
            </p>
          )}

          <div>
            <label className="text-label-sm font-semibold text-on-surface mb-1 block">Closing Date & Time</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-body-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-lg border border-outline-variant px-4 py-2 text-label-md text-on-surface hover:bg-surface-container-low cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !question.trim()}
              className="rounded-lg bg-primary px-5 py-2 text-label-md font-semibold text-on-primary hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VotersModal({ poll, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  if (!poll) return null;
  const isSecret = poll.type === "secret";
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl sm:rounded-2xl bg-surface-container-lowest shadow-xl">
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <div>
            <h3 className="text-title-sm font-semibold text-on-surface">Poll votes</h3>
            <p className="mt-0.5 line-clamp-1 text-label-sm text-on-surface-variant">{poll.question}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {isSecret ? (
            <p className="py-8 text-center text-body-sm text-on-surface-variant">Votes are secret — voters hidden until poll is closed. After close only counts shown, never names.</p>
          ) : poll.totalVotes === 0 ? (
            <p className="py-8 text-center text-body-sm text-on-surface-variant">No votes yet. Be first to vote.</p>
          ) : (
            poll.options.map((opt) => (
              <div key={opt.index}>
                <div className="flex items-center justify-between">
                  <p className="text-body-md font-semibold text-on-surface">{opt.text}</p>
                  <span className="text-label-md font-semibold text-primary">{opt.votes} vote{opt.votes === 1 ? "" : "s"} · {opt.percent}%</span>
                </div>
                <div className="mt-2">
                  {opt.voters && opt.voters.length > 0 ? (
                    <div className="space-y-2">
                      {opt.voters.map((name, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg bg-surface-container-low px-3 py-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md font-semibold text-on-primary-fixed">
                            {name?.[0]?.toUpperCase() || "?"}
                          </span>
                          <span className="text-body-sm text-on-surface">{name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-label-sm text-outline">No votes for this option</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-outline-variant px-5 py-3 text-center">
          <button onClick={onClose} className="w-full rounded-full bg-primary py-2.5 text-label-md font-semibold text-on-primary">Close</button>
        </div>
      </div>
    </div>
  );
}

function PollCard({ poll, onVote, votingId, onClose, closingId, onEdit, onDelete, onViewVoters }) {
  const hasVoted = poll.hasVoted;
  const isClosed = poll.isClosed || poll.status === "closed";
  const isSecret = poll.type === "secret";
  const isWing = poll.scope === "wing" && poll.wing;

  return (
    <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex-1 text-body-lg font-semibold text-on-surface">{poll.question}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {isWing && <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-label-sm font-bold">Wing {poll.wing}</span>}
          {!isWing && <span className="shrink-0 rounded-full bg-sky-100 text-sky-800 px-2.5 py-1 text-label-sm font-bold">Society</span>}
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-label-sm font-semibold ${isClosed ? "bg-outline-variant text-on-surface-variant" : "bg-primary-fixed text-on-primary-fixed"}`}>
            {isClosed ? "Closed" : "Active"}
          </span>
          <span className={`shrink-0 rounded-full px-2 py-1 text-label-sm ${isSecret ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-surface-container-high text-on-surface-variant"}`}>
            {isSecret ? "Secret" : "Open"}
          </span>
        </div>
      </div>

      <p className="mt-1 text-label-sm text-outline">
        {isWing ? `Wing ${poll.wing} • ` : ""}{formatPollEndDate(poll.endDate)} · {poll.totalVotesHidden ? "Results hidden till close" : `${poll.totalVotes} vote${poll.totalVotes === 1 ? "" : "s"}`} · by {poll.createdByName}
      </p>

      <div className="mt-4 space-y-2.5">
        {poll.options.map((opt) => {
          const isVoted = opt.isVoted;
          const showResult = !isSecret || isClosed;
          return (
            <button
              key={opt.index}
              onClick={() => !isClosed && !hasVoted && onVote(poll.id, opt.index)}
              disabled={isClosed || hasVoted}
              className={`relative w-full overflow-hidden rounded-lg border px-4 py-3 text-left transition-colors ${
                isVoted
                  ? "border-primary bg-primary-fixed/60"
                  : isClosed || hasVoted
                  ? "border-outline-variant bg-surface-container-low cursor-default"
                  : "border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:bg-surface-container-low cursor-pointer"
              }`}
            >
              {showResult && poll.totalVotes > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
                  style={{ width: `${opt.percent}%` }}
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className={`flex items-center gap-2 text-body-md ${isVoted ? "font-semibold text-on-surface" : "text-on-surface"}`}>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[12px] ${
                      isVoted ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest"
                    }`}
                  >
                    {isVoted ? "✓" : ""}
                  </span>
                  {opt.text}
                </span>
                {showResult && (
                  <span className="shrink-0 text-label-md font-semibold text-on-surface">
                    {opt.votes} · {opt.percent}%
                  </span>
                )}
                {!showResult && isSecret && <span className="text-label-sm text-outline">hidden</span>}
              </span>
            </button>
          );
        })}
      </div>

      {hasVoted && !isClosed && <p className="mt-3 text-label-sm font-medium text-primary">You voted {isSecret ? "(secret)" : `- ${poll.options.find((o) => o.isVoted)?.text}`}</p>}
      {votingId === poll.id && <p className="mt-2 text-label-sm text-outline">Submitting vote...</p>}

      {!isSecret && poll.totalVotes > 0 && (
        <button onClick={() => onViewVoters(poll)} className="mt-3 inline-flex items-center gap-1.5 text-label-md font-medium text-primary hover:underline cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          View votes ({poll.totalVotes})
        </button>
      )}
      {isSecret && !isClosed && <p className="mt-3 text-label-sm text-outline">Votes hidden until poll closes.</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3">
        {poll.isClosed ? (
          <span className="text-label-sm text-outline">Poll closed</span>
        ) : hasVoted ? (
          <span className="text-label-sm text-outline">Waiting for others to vote</span>
        ) : (
          <span className="text-label-sm text-outline">Tap an option to vote</span>
        )}
        <div className="ml-auto flex gap-2">
          <AdminActions poll={poll} onClose={onClose} closingId={closingId} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
    </article>
  );
}

function AdminActions({ poll, onClose, closingId, onEdit, onDelete }) {
  const membership = useSocietyStore(selectActiveMembership);
  const activeSociety = useSocietyStore(selectActiveSociety);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canCreatePoll = hasPermissionForMembership(membership, "create_poll", permissionsQuery.data);
  if (!canCreatePoll) return null;
  return (
    <>
      <button
        onClick={() => onEdit(poll)}
        className="rounded-full border border-outline-variant px-3 py-1.5 text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
      >
        Edit
      </button>
      {poll.status === "active" && !poll.isClosed && (
        <button
          onClick={() => onClose(poll)}
          disabled={closingId === poll.id}
          className="rounded-full border border-outline-variant px-3 py-1.5 text-label-sm font-medium text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 cursor-pointer"
        >
          {closingId === poll.id ? "Closing..." : "Close"}
        </button>
      )}
      <button
        onClick={() => onDelete(poll)}
        className="rounded-full border border-error/30 px-3 py-1.5 text-label-sm font-medium text-error hover:bg-error/10 cursor-pointer"
      >
        Delete
      </button>
    </>
  );
}

export default function PollsPage() {
  useBadgeSeen("polls");
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canCreatePoll = hasPermissionForMembership(activeMembership, "create_poll", permissionsQuery.data);
  const queryClient = useQueryClient();
  const [votingId, setVotingId] = useState(null);
  const [closingId, setClosingId] = useState(null);
  const [votersModalPoll, setVotersModalPoll] = useState(null);
  const [editingPoll, setEditingPoll] = useState(null);
  const [closingPoll, setClosingPoll] = useState(null);
  const [deletingPoll, setDeletingPoll] = useState(null);
  const [actionError, setActionError] = useState("");

  const pollsQuery = useQuery({
    queryKey: ["polls", activeSociety?.id],
    queryFn: async () => (await getPolls()).data.data,
    enabled: Boolean(activeSociety),
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, idx }) => votePoll(pollId, idx).then((r) => r.data.data),
    onMutate: ({ pollId }) => setVotingId(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      setVotingId(null);
    },
    onError: () => setVotingId(null),
  });

  const updateMutation = useMutation({
    mutationFn: ({ pollId, payload }) => updatePoll(pollId, payload).then((r) => r.data.data),
    onSuccess: () => {
      setEditingPoll(null);
      setActionError("");
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
    onError: (err) => setActionError(extractApiError(err, "Failed to update poll")),
  });

  const closeMutation = useMutation({
    mutationFn: (pollId) => closePoll(pollId).then((r) => r.data.data),
    onMutate: (pollId) => setClosingId(pollId),
    onSuccess: () => {
      setClosingPoll(null);
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      setClosingId(null);
    },
    onError: () => setClosingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (pollId) => deletePoll(pollId).then((r) => r.data.data),
    onSuccess: () => {
      setDeletingPoll(null);
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });

  const handleVote = (pollId, idx) => {
    voteMutation.mutate({ pollId, idx });
  };

  const [scopeFilter, setScopeFilter] = useState("all");
  const polls = pollsQuery.data || [];
  const scopeFiltered = polls.filter((p) => {
    if (scopeFilter === "society") return !p.wing && (p.scope === "society" || !p.scope);
    if (scopeFilter === "wing") return p.scope === "wing" && !!p.wing;
    return true;
  });
  const activePolls = scopeFiltered.filter((p) => !p.isClosed);
  const closedPolls = scopeFiltered.filter((p) => p.isClosed);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">how_to_vote</span>
            Polls & Voting
          </h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}
            {canCreatePoll ? "Create polls for society decisions." : "Vote on society decisions."}
          </p>
        </div>
        {canCreatePoll && (
          <Link to="/polls/new" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md text-on-primary no-underline hover:opacity-90">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Poll
          </Link>
        )}
      </section>

      {actionError && <p className="rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">{actionError}</p>}

      {pollsQuery.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {pollsQuery.isError && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 text-center text-body-md text-error">
          {extractApiError(pollsQuery.error, "Failed to load polls.")}
        </div>
      )}

      {pollsQuery.isSuccess && polls.length === 0 && (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-on-surface-variant">how_to_vote</span>
          <p className="mt-3 text-body-md font-semibold text-on-surface">No polls yet</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {canCreatePoll ? "Create the first poll for your society." : "Your admin has not created any polls."}
          </p>
          {canCreatePoll && (
            <Link to="/polls/new" className="mt-4 inline-flex items-center gap-1 text-label-md text-primary hover:underline">
              Create Poll →
            </Link>
          )}
        </div>
      )}

      {scopeFiltered.length > 0 && (
        <div className="flex gap-2">
          <button onClick={() => setScopeFilter("all")} className={`rounded-full px-3 py-1 text-label-sm font-semibold border cursor-pointer ${scopeFilter==="all" ? "bg-primary text-on-primary border-primary" : "bg-white text-on-surface-variant border-outline-variant"}`}>All ({polls.length})</button>
          <button onClick={() => setScopeFilter("society")} className={`rounded-full px-3 py-1 text-label-sm font-semibold border cursor-pointer ${scopeFilter==="society" ? "bg-primary text-on-primary border-primary" : "bg-white text-on-surface-variant border-outline-variant"}`}>Society ({polls.filter((p)=>!p.wing && (p.scope==="society"||!p.scope)).length})</button>
          <button onClick={() => setScopeFilter("wing")} className={`rounded-full px-3 py-1 text-label-sm font-semibold border cursor-pointer ${scopeFilter==="wing" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-on-surface-variant border-outline-variant"}`}>Wing ({polls.filter((p)=>p.scope==="wing").length})</button>
        </div>
      )}

      {polls.length > 0 && (
        <>
          {activePolls.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-title-sm font-semibold text-on-surface">Active ({activePolls.length})</h2>
              {activePolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onVote={handleVote}
                  votingId={votingId}
                  onClose={(p) => setClosingPoll(p)}
                  closingId={closingId}
                  onEdit={(p) => {
                    setActionError("");
                    setEditingPoll(p);
                  }}
                  onDelete={(p) => setDeletingPoll(p)}
                  onViewVoters={setVotersModalPoll}
                />
              ))}
            </section>
          )}

          {closedPolls.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-title-sm font-semibold text-on-surface">Closed ({closedPolls.length})</h2>
              {closedPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onVote={handleVote}
                  votingId={votingId}
                  onClose={(p) => setClosingPoll(p)}
                  closingId={closingId}
                  onEdit={(p) => {
                    setActionError("");
                    setEditingPoll(p);
                  }}
                  onDelete={(p) => setDeletingPoll(p)}
                  onViewVoters={setVotersModalPoll}
                />
              ))}
            </section>
          )}
          {votersModalPoll && <VotersModal poll={votersModalPoll} onClose={() => setVotersModalPoll(null)} />}
        </>
      )}

      <EditPollModal
        poll={editingPoll}
        open={Boolean(editingPoll)}
        onClose={() => {
          setEditingPoll(null);
          setActionError("");
        }}
        onSave={(payload) => updateMutation.mutate({ pollId: editingPoll.id, payload })}
        isSaving={updateMutation.isPending}
        error={actionError}
      />

      <ConfirmDialog
        open={Boolean(closingPoll)}
        title="Close this poll now?"
        message="No more votes will be accepted once the poll is closed."
        confirmLabel="Close Poll"
        busy={closeMutation.isPending}
        onConfirm={() => closeMutation.mutate(closingPoll.id)}
        onClose={() => setClosingPoll(null)}
      />

      <ConfirmDialog
        open={Boolean(deletingPoll)}
        title="Delete this poll?"
        message="Are you sure you want to delete this poll? This action cannot be undone."
        confirmLabel="Delete Poll"
        danger
        busy={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deletingPoll.id)}
        onClose={() => setDeletingPoll(null)}
      />
    </div>
  );
}
