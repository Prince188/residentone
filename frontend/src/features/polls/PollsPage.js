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
  const isSubmitting = votingId === poll.id;
  const endFormatted = formatPollEndDate(poll.endDate);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1.5 ${
          isClosed ? "bg-zinc-400" : hasVoted ? "bg-emerald-500" : "bg-primary"
        }`}
      />

      {/* Badges Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
        <div className="flex items-center gap-2 flex-wrap">
          {isWing ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 py-0.5 text-label-sm font-semibold">
              <span className="material-symbols-outlined text-[14px]">domain</span>
              Wing {poll.wing}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200/60 px-2.5 py-0.5 text-label-sm font-semibold">
              <span className="material-symbols-outlined text-[14px]">apartment</span>
              Society
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-semibold ${
              isClosed
                ? "bg-zinc-100 text-zinc-700"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isClosed ? "check_circle" : "radio_button_checked"}
            </span>
            {isClosed ? "Closed" : "Active"}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high text-on-surface-variant px-2.5 py-0.5 text-label-sm font-medium">
            <span className="material-symbols-outlined text-[13px]">{isSecret ? "lock" : "visibility"}</span>
            {isSecret ? "Secret Poll" : "Open Poll"}
          </span>
        </div>

        {endFormatted && (
          <span className={`text-[12px] font-medium flex items-center gap-1 ${
            isClosed ? "text-outline" : "text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50"
          }`}>
            <span className="material-symbols-outlined text-[14px]">
              {isClosed ? "event_available" : "schedule"}
            </span>
            {endFormatted}
          </span>
        )}
      </div>

      {/* Question */}
      <h3 className="mt-3.5 pl-1 text-title-md font-bold text-on-surface">
        {poll.question}
      </h3>

      {/* Options */}
      <div className="mt-4 space-y-2.5 pl-1">
        {poll.options.map((opt) => {
          const isVoted = opt.isVoted;
          const showResult = !isSecret || isClosed;
          const canClick = !isClosed && !hasVoted && !isSubmitting;

          return (
            <button
              key={opt.index}
              type="button"
              onClick={() => canClick && onVote(poll.id, opt.index)}
              disabled={!canClick}
              className={`group/opt relative w-full overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-150 ${
                isVoted
                  ? "border-primary bg-primary-fixed/30 ring-1 ring-primary/40"
                  : canClick
                  ? "border-outline-variant/80 bg-surface-container-lowest hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                  : "border-outline-variant/60 bg-surface-container-low/50 cursor-default"
              }`}
            >
              {/* Animated Progress background */}
              {showResult && poll.totalVotes > 0 && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    isVoted ? "bg-primary/15" : "bg-primary/8"
                  }`}
                  style={{ width: `${opt.percent}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] transition-colors ${
                      isVoted
                        ? "border-primary bg-primary text-on-primary font-bold shadow-xs"
                        : "border-outline-variant bg-surface-container-lowest group-hover/opt:border-primary"
                    }`}
                  >
                    {isVoted ? "✓" : opt.index + 1}
                  </span>
                  <span className={`text-body-md truncate ${isVoted ? "font-bold text-primary" : "font-medium text-on-surface"}`}>
                    {opt.text}
                  </span>
                  {isVoted && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                      Your Vote
                    </span>
                  )}
                </div>

                {showResult && (
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-body-sm font-semibold text-on-surface">
                      {opt.votes} {opt.votes === 1 ? "vote" : "votes"}
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-label-sm font-bold ${
                      isVoted ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
                    }`}>
                      {opt.percent}%
                    </span>
                  </div>
                )}

                {!showResult && isSecret && (
                  <span className="shrink-0 rounded-md bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-outline">
                    Votes hidden
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Submitting indicator */}
      {isSubmitting && (
        <p className="mt-2 pl-1 text-label-sm text-primary flex items-center gap-1.5 font-medium animate-pulse">
          <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
          Recording your vote...
        </p>
      )}

      {/* Footer Info & Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/60 pt-3.5 pl-1">
        <div className="flex items-center gap-3 text-label-sm text-outline flex-wrap">
          <span className="flex items-center gap-1 font-medium text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary">how_to_vote</span>
            {poll.totalVotesHidden ? "Results hidden till close" : `${poll.totalVotes} total ${poll.totalVotes === 1 ? "vote" : "votes"}`}
          </span>
          <span>•</span>
          <span>By {poll.createdByName}</span>
        </div>

        <div className="flex items-center gap-2">
          {!isSecret && poll.totalVotes > 0 && (
            <button
              type="button"
              onClick={() => onViewVoters(poll)}
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-label-sm font-semibold text-primary hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">group</span>
              View Voters
            </button>
          )}

          <AdminActions
            poll={poll}
            onClose={onClose}
            closingId={closingId}
            onEdit={onEdit}
            onDelete={onDelete}
          />
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
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onEdit(poll)}
        className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-label-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
      >
        Edit
      </button>
      {poll.status === "active" && !poll.isClosed && (
        <button
          type="button"
          onClick={() => onClose(poll)}
          disabled={closingId === poll.id}
          className="rounded-full border border-amber-300 bg-amber-50/50 px-3 py-1 text-label-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {closingId === poll.id ? "Closing..." : "Close Poll"}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDelete(poll)}
        className="rounded-full border border-error/30 bg-surface-container-lowest px-3 py-1 text-label-sm font-semibold text-error hover:bg-error/10 transition-colors cursor-pointer"
      >
        Delete
      </button>
    </div>
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
  const activePollsList = polls.filter((p) => !p.isClosed && p.status === "active");
  const closedPollsList = polls.filter((p) => p.isClosed || p.status === "closed");

  const scopeFilteredActive = activePollsList.filter((p) => {
    if (scopeFilter === "society") return !p.wing && (p.scope === "society" || !p.scope);
    if (scopeFilter === "wing") return p.scope === "wing" && !!p.wing;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/dashboard" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Dashboard
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">how_to_vote</span>
            Polls & Voting
          </h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}
            {canCreatePoll ? "Create community polls and view live voting progress." : "Vote on community proposals and view live progress."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/polls/history"
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md font-semibold text-on-surface no-underline hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">history_edu</span>
            Polls History
            {closedPollsList.length > 0 && (
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-bold text-on-surface-variant">
                {closedPollsList.length}
              </span>
            )}
          </Link>

          {canCreatePoll && (
            <Link
              to="/polls/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-label-md font-semibold text-on-primary no-underline hover:opacity-90 shadow-sm transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create Poll
            </Link>
          )}
        </div>
      </section>

      {actionError && (
        <div className="rounded-xl border border-error/30 bg-error-container/40 p-4 text-body-sm text-error">
          {actionError}
        </div>
      )}

      {pollsQuery.isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {pollsQuery.isError && (
        <div className="rounded-2xl border border-error/30 bg-error-container/40 p-6 text-center text-body-md text-error">
          {extractApiError(pollsQuery.error, "Failed to load polls.")}
        </div>
      )}

      {pollsQuery.isSuccess && activePollsList.length === 0 && (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center shadow-xs">
          <span className="material-symbols-outlined text-[48px] text-outline">
            {closedPollsList.length > 0 ? "done_all" : "how_to_vote"}
          </span>
          <h3 className="mt-3 text-title-md font-semibold text-on-surface">
            {closedPollsList.length > 0 ? "No active polls right now" : "No polls yet"}
          </h3>
          <p className="mt-1 text-body-sm text-on-surface-variant max-w-md mx-auto">
            {closedPollsList.length > 0
              ? "All previous community polls have concluded and moved to Polls History."
              : canCreatePoll
              ? "Create the first poll to make decisions together with residents."
              : "Your society committee has not published any polls yet."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {closedPollsList.length > 0 && (
              <Link
                to="/polls/history"
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md font-semibold text-primary hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">history_edu</span>
                View Polls History ({closedPollsList.length})
              </Link>
            )}
            {canCreatePoll && (
              <Link
                to="/polls/new"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-label-md font-semibold text-on-primary no-underline hover:opacity-90"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create Poll
              </Link>
            )}
          </div>
        </div>
      )}

      {activePollsList.length > 0 && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => setScopeFilter("all")}
              className={`rounded-full px-3.5 py-1.5 text-label-sm font-semibold border cursor-pointer transition-colors ${
                scopeFilter === "all"
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              All Active ({activePollsList.length})
            </button>
            <button
              onClick={() => setScopeFilter("society")}
              className={`rounded-full px-3.5 py-1.5 text-label-sm font-semibold border cursor-pointer transition-colors ${
                scopeFilter === "society"
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              Society ({activePollsList.filter((p) => !p.wing && (p.scope === "society" || !p.scope)).length})
            </button>
            <button
              onClick={() => setScopeFilter("wing")}
              className={`rounded-full px-3.5 py-1.5 text-label-sm font-semibold border cursor-pointer transition-colors ${
                scopeFilter === "wing"
                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              Wing ({activePollsList.filter((p) => p.scope === "wing").length})
            </button>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Polls ({scopeFilteredActive.length})
              </h2>
              <span className="text-label-sm text-outline">Tap an option to cast your vote</span>
            </div>
            {scopeFilteredActive.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
                <p className="text-body-sm text-on-surface-variant">No active polls found for this filter.</p>
              </div>
            ) : (
              scopeFilteredActive.map((poll) => (
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
              ))
            )}
          </section>

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
