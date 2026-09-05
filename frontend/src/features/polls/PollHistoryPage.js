/* eslint-disable */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, { selectActiveMembership, selectActiveSociety } from "../../stores/society.store";
import { getPolls, deletePoll, extractApiError } from "../../lib/polls";
import api from "../../lib/api";
import { hasPermissionForMembership } from "../../lib/permissions";
import useBadgeSeen from "../../hooks/useBadgeSeen";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

function VotersModal({ poll, onClose }) {
  if (!poll) return null;
  const isSecret = poll.type === "secret";
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl sm:rounded-2xl bg-surface-container-lowest shadow-xl">
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <div>
            <h3 className="text-title-sm font-semibold text-on-surface">Poll Results Breakdown</h3>
            <p className="mt-0.5 line-clamp-1 text-label-sm text-on-surface-variant">{poll.question}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high cursor-pointer">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {isSecret ? (
            <div className="py-8 text-center text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px] text-outline mb-2">lock</span>
              <p>Votes were cast secretly. Individual voter names are protected and hidden.</p>
            </div>
          ) : poll.totalVotes === 0 ? (
            <p className="py-8 text-center text-body-sm text-on-surface-variant">No votes were cast in this poll.</p>
          ) : (
            poll.options.map((opt) => (
              <div key={opt.index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-body-md font-semibold text-on-surface">{opt.text}</p>
                  <span className="text-label-md font-semibold text-primary">{opt.votes} vote{opt.votes === 1 ? "" : "s"} · {opt.percent}%</span>
                </div>
                <div>
                  {opt.voters && opt.voters.length > 0 ? (
                    <div className="space-y-1.5">
                      {opt.voters.map((name, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg bg-surface-container-low px-3 py-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[12px] font-semibold text-on-primary-fixed">
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
          <button onClick={onClose} className="w-full rounded-full bg-primary py-2.5 text-label-md font-semibold text-on-primary cursor-pointer hover:opacity-90">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ClosedPollCard({ poll, onDelete, onViewVoters, canManage }) {
  const isSecret = poll.type === "secret";
  const isWing = poll.scope === "wing" && poll.wing;

  // Find winning option(s)
  const maxVotes = Math.max(...poll.options.map((o) => o.votes || 0), 0);
  const hasWinningOption = maxVotes > 0;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-zinc-400" />
      
      {/* Header Badges */}
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

          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 text-zinc-700 px-2.5 py-0.5 text-label-sm font-semibold">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Closed
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high text-on-surface-variant px-2.5 py-0.5 text-label-sm font-medium">
            <span className="material-symbols-outlined text-[13px]">{isSecret ? "lock" : "visibility"}</span>
            {isSecret ? "Secret Poll" : "Open Poll"}
          </span>
        </div>

        {poll.endDate && (
          <span className="text-[12px] font-medium text-outline flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">event_available</span>
            Ended {new Date(poll.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      {/* Question */}
      <h3 className="mt-3.5 pl-1 text-title-md font-bold text-on-surface">
        {poll.question}
      </h3>

      {/* Result options breakdown */}
      <div className="mt-4 space-y-2.5 pl-1">
        {poll.options.map((opt) => {
          const isWinner = hasWinningOption && opt.votes === maxVotes;
          const isUserVote = opt.isVoted;
          return (
            <div
              key={opt.index}
              className={`relative overflow-hidden rounded-xl border p-3.5 transition-all ${
                isWinner
                  ? "border-emerald-500/40 bg-emerald-50/30"
                  : isUserVote
                  ? "border-primary/40 bg-primary/5"
                  : "border-outline-variant/70 bg-surface-container-low/40"
              }`}
            >
              {/* Background progress fill */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                  isWinner ? "bg-emerald-500/15" : "bg-primary/10"
                }`}
                style={{ width: `${opt.percent}%` }}
              />

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {isWinner ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                      <span className="material-symbols-outlined text-[14px]">emoji_events</span>
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-[11px] text-outline font-semibold">
                      {opt.index + 1}
                    </span>
                  )}
                  <span className={`text-body-md truncate ${isWinner ? "font-bold text-emerald-950" : "font-medium text-on-surface"}`}>
                    {opt.text}
                  </span>
                  {isUserVote && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                      Your Vote
                    </span>
                  )}
                  {isWinner && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                      Winner
                    </span>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-body-sm font-bold ${isWinner ? "text-emerald-800" : "text-on-surface"}`}>
                    {opt.votes} {opt.votes === 1 ? "vote" : "votes"}
                  </span>
                  <span className={`rounded-md px-1.5 py-0.5 text-label-sm font-bold ${isWinner ? "bg-emerald-600 text-white" : "bg-surface-container-high text-on-surface-variant"}`}>
                    {opt.percent}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info & Actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/60 pt-3.5 pl-1">
        <div className="flex items-center gap-3 text-label-sm text-outline flex-wrap">
          <span className="flex items-center gap-1 font-medium text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary">how_to_vote</span>
            {poll.totalVotes} total {poll.totalVotes === 1 ? "vote" : "votes"}
          </span>
          <span>•</span>
          <span>Created by {poll.createdByName}</span>
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

          {canManage && (
            <button
              type="button"
              onClick={() => onDelete(poll)}
              className="inline-flex items-center gap-1 rounded-full border border-error/30 bg-surface-container-lowest px-3 py-1 text-label-sm font-semibold text-error hover:bg-error/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function PollHistoryPage() {
  useBadgeSeen("polls");
  const activeSociety = useSocietyStore(selectActiveSociety);
  const activeMembership = useSocietyStore(selectActiveMembership);
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: ["society-permissions", activeSociety?.id],
    queryFn: async () => (await api.get("/societies/permissions")).data.data,
    enabled: Boolean(activeSociety),
  });
  const canManage = hasPermissionForMembership(activeMembership, "create_poll", permissionsQuery.data);

  const [votersModalPoll, setVotersModalPoll] = useState(null);
  const [deletingPoll, setDeletingPoll] = useState(null);
  const [scopeFilter, setScopeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const pollsQuery = useQuery({
    queryKey: ["polls", activeSociety?.id],
    queryFn: async () => (await getPolls()).data.data,
    enabled: Boolean(activeSociety),
  });

  const deleteMutation = useMutation({
    mutationFn: (pollId) => deletePoll(pollId).then((r) => r.data.data),
    onSuccess: () => {
      setDeletingPoll(null);
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });

  const allPolls = pollsQuery.data || [];
  const closedPolls = useMemo(() => {
    return allPolls.filter((p) => p.isClosed || p.status === "closed");
  }, [allPolls]);

  const filteredPolls = useMemo(() => {
    return closedPolls.filter((p) => {
      if (scopeFilter === "society" && (p.wing || p.scope === "wing")) return false;
      if (scopeFilter === "wing" && p.scope !== "wing") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuestion = p.question?.toLowerCase().includes(q);
        const matchesOption = p.options?.some((o) => o.text?.toLowerCase().includes(q));
        return matchesQuestion || matchesOption;
      }
      return true;
    });
  }, [closedPolls, scopeFilter, searchQuery]);

  const totalVotesCast = useMemo(() => {
    return closedPolls.reduce((acc, p) => acc + (p.totalVotes || 0), 0);
  }, [closedPolls]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/polls" className="mb-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant no-underline hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Active Polls
          </Link>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">history_edu</span>
            Polls History & Results
          </h1>
          <p className="page-subtitle">
            {activeSociety ? `${activeSociety.name} · ` : ""}
            Archived and concluded community votes with final decisions.
          </p>
        </div>

        <Link
          to="/polls"
          className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-label-md font-semibold text-on-surface no-underline hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">how_to_vote</span>
          Active Polls
        </Link>
      </section>

      {/* Summary Banner */}
      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="bg-gradient-to-br from-primary via-primary-container to-on-primary-fixed p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-label-md uppercase tracking-[0.14em] text-white/70">Archive Overview</p>
              <h2 className="mt-1 text-headline-sm font-bold text-white">Closed Polls Record</h2>
              <p className="mt-1 text-label-md text-white/80">Historical archive of society decisions</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
              <span className="material-symbols-outlined text-[24px]">ballot</span>
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-headline-sm font-bold text-white">{closedPolls.length}</p>
              <p className="text-label-sm text-white/70">Concluded Polls</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-headline-sm font-bold text-white">{totalVotesCast}</p>
              <p className="text-label-sm text-white/70">Total Votes Cast</p>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
              <p className="text-headline-sm font-bold text-white">
                {allPolls.filter((p) => !p.isClosed && p.status === "active").length}
              </p>
              <p className="text-label-sm text-white/70">Currently Live</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Tabs */}
      {closedPolls.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setScopeFilter("all")}
              className={`rounded-full px-3.5 py-1.5 text-label-sm font-semibold border cursor-pointer transition-colors ${
                scopeFilter === "all"
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              All Closed ({closedPolls.length})
            </button>
            <button
              onClick={() => setScopeFilter("society")}
              className={`rounded-full px-3.5 py-1.5 text-label-sm font-semibold border cursor-pointer transition-colors ${
                scopeFilter === "society"
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              Society ({closedPolls.filter((p) => !p.wing && (p.scope === "society" || !p.scope)).length})
            </button>
            <button
              onClick={() => setScopeFilter("wing")}
              className={`rounded-full px-3.5 py-1.5 text-label-sm font-semibold border cursor-pointer transition-colors ${
                scopeFilter === "wing"
                  ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              Wing ({closedPolls.filter((p) => p.scope === "wing").length})
            </button>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search past polls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 rounded-full border border-outline-variant bg-surface-container-lowest py-1.5 pl-9 pr-3 text-body-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {pollsQuery.isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface-container-high" />
          ))}
        </div>
      )}

      {/* Error State */}
      {pollsQuery.isError && (
        <div className="rounded-2xl border border-error/30 bg-error-container/40 p-6 text-center text-body-md text-error">
          {extractApiError(pollsQuery.error, "Failed to load past polls.")}
        </div>
      )}

      {/* Empty State - No Closed Polls */}
      {pollsQuery.isSuccess && closedPolls.length === 0 && (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center shadow-xs">
          <span className="material-symbols-outlined text-[48px] text-outline">history</span>
          <h3 className="mt-3 text-title-md font-semibold text-on-surface">No closed polls yet</h3>
          <p className="mt-1 text-body-sm text-on-surface-variant max-w-md mx-auto">
            Polls will automatically move here once their voting period ends or when closed by society administration.
          </p>
          <Link
            to="/polls"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-label-md font-semibold text-on-primary no-underline hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">how_to_vote</span>
            Go to Active Polls
          </Link>
        </div>
      )}

      {/* Empty Search State */}
      {pollsQuery.isSuccess && closedPolls.length > 0 && filteredPolls.length === 0 && (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
          <span className="material-symbols-outlined text-[36px] text-outline">search_off</span>
          <p className="mt-2 text-body-md font-semibold text-on-surface">No matching past polls found</p>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">Try searching for a different keyword or changing filters.</p>
        </div>
      )}

      {/* Polls List */}
      <div className="space-y-4">
        {filteredPolls.map((poll) => (
          <ClosedPollCard
            key={poll.id}
            poll={poll}
            canManage={canManage}
            onDelete={setDeletingPoll}
            onViewVoters={setVotersModalPoll}
          />
        ))}
      </div>

      {/* Voters Modal */}
      {votersModalPoll && (
        <VotersModal poll={votersModalPoll} onClose={() => setVotersModalPoll(null)} />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deletingPoll)}
        title="Delete this past poll?"
        message="Are you sure you want to permanently delete this poll record? This action cannot be undone."
        confirmLabel="Delete Record"
        danger
        busy={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deletingPoll.id)}
        onClose={() => setDeletingPoll(null)}
      />
    </div>
  );
}
