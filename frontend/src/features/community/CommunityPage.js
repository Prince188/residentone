import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useSocietyStore, {
  selectActiveSociety,
} from "../../stores/society.store";
import { getNotices, timeAgo } from "../../lib/notices";
import { getPolls, votePoll, formatPollEndDate } from "../../lib/polls";
import { getSocietyDirectory } from "../../lib/directory";

export default function CommunityPage() {
  const queryClient = useQueryClient();
  const activeSociety = useSocietyStore(selectActiveSociety);

  const societyId = activeSociety?.id || activeSociety?._id;
  const [activeTab, setActiveTab] = useState("notices"); // 'notices' | 'polls' | 'directory'
  const [search, setSearch] = useState("");
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [votingId, setVotingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Queries
  const { data: notices = [], isLoading: loadingNotices } = useQuery({
    queryKey: ["notices", societyId],
    queryFn: async () => {
      const res = await getNotices({ limit: 40 });
      return Array.isArray(res) ? res : res?.notices || res?.data || [];
    },
    enabled: Boolean(societyId),
  });

  const { data: pollsRes, isLoading: loadingPolls } = useQuery({
    queryKey: ["polls", societyId],
    queryFn: () => getPolls(),
    enabled: Boolean(societyId),
  });

  const polls = Array.isArray(pollsRes?.data?.data)
    ? pollsRes.data.data
    : Array.isArray(pollsRes?.data)
    ? pollsRes.data
    : [];

  const { data: dirRes, isLoading: loadingDir } = useQuery({
    queryKey: ["directory", societyId],
    queryFn: () => getSocietyDirectory(),
    enabled: Boolean(societyId),
  });

  const directory = Array.isArray(dirRes?.data?.data)
    ? dirRes.data.data
    : Array.isArray(dirRes?.data)
    ? dirRes.data
    : [];

  // Mutations
  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionIdx }) => votePoll(pollId, optionIdx),
    onSuccess: () => {
      queryClient.invalidateQueries(["polls", societyId]);
      setVotingId(null);
      setStatusMsg("Vote recorded successfully!");
      setTimeout(() => setStatusMsg(""), 3500);
    },
    onError: (err) => {
      setVotingId(null);
      setErrorMsg(err?.response?.data?.message || "Failed to submit vote");
      setTimeout(() => setErrorMsg(""), 3500);
    },
  });

  const handleVote = (pollId, optionIdx) => {
    setVotingId(pollId);
    voteMutation.mutate({ pollId, optionIdx });
  };

  // Filtered Notices
  const filteredNotices = useMemo(() => {
    if (!search.trim()) return notices;
    const q = search.toLowerCase();
    return notices.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.content || "").toLowerCase().includes(q) ||
        (n.category || "").toLowerCase().includes(q)
    );
  }, [notices, search]);

  // Filtered Polls
  const filteredPolls = useMemo(() => {
    if (!search.trim()) return polls;
    const q = search.toLowerCase();
    return polls.filter(
      (p) =>
        (p.question || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }, [polls, search]);

  // Filtered Directory
  const filteredDirectory = useMemo(() => {
    if (!search.trim()) return directory;
    const q = search.toLowerCase();
    return directory.filter(
      (m) =>
        (m.user?.name || m.name || "").toLowerCase().includes(q) ||
        (m.user?.phone || m.phone || "").toLowerCase().includes(q) ||
        (m.unit?.unitNumber || m.unitNumber || "").toLowerCase().includes(q) ||
        (m.wing?.name || m.wing || "").toLowerCase().includes(q)
    );
  }, [directory, search]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 space-y-6">
      {/* Toast Alert */}
      {statusMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-medium">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm font-medium">
          <span className="material-symbols-outlined text-red-600">error</span>
          {errorMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">forum</span>
            <h1 className="text-2xl font-bold text-on-surface">Community Hub</h1>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">
            Stay updated with society circulars, participate in active community polls, and find your neighbors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/notices/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-3.5 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[16px]">campaign</span>
            Post Notice
          </Link>
          <Link
            to="/polls/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[16px]">how_to_vote</span>
            Create Poll
          </Link>
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-surface-container p-1 text-xs font-bold">
            <button
              onClick={() => { setActiveTab("notices"); setSearch(""); }}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all ${
                activeTab === "notices"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              Circulars & Notices
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary">
                {notices.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("polls"); setSearch(""); }}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all ${
                activeTab === "polls"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">how_to_vote</span>
              Live Polls
              <span className="ml-1 rounded-full bg-purple-100 px-1.5 py-0.2 text-[10px] text-purple-700">
                {polls.filter((p) => p.status === "active").length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("directory"); setSearch(""); }}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all ${
                activeTab === "directory"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">group</span>
              Resident Directory
              <span className="ml-1 rounded-full bg-surface-container-high px-1.5 py-0.2 text-[10px] text-on-surface-variant">
                {directory.length}
              </span>
            </button>
          </div>

          {/* Search input */}
          <div className="relative flex-1 sm:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full rounded-xl border border-outline-variant bg-surface py-2 pl-9 pr-3 text-xs text-on-surface focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: NOTICES & CIRCULARS */}
      {activeTab === "notices" && (
        <div className="space-y-4">
          {loadingNotices ? (
            <div className="py-16 text-center text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
              <p className="mt-2 text-sm">Loading circulars...</p>
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[44px] text-outline">campaign</span>
              <h3 className="mt-2 text-base font-semibold text-on-surface">No notices found</h3>
              <p className="mt-1 text-sm">There are no circulars matching your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotices.map((notice) => (
                <div
                  key={notice._id || notice.id}
                  onClick={() => setSelectedNotice(notice)}
                  className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary capitalize">
                        {notice.category || "General Notice"}
                      </span>
                      <span className="text-xs text-on-surface-variant">{timeAgo(notice.createdAt)}</span>
                    </div>

                    <h3 className="text-base font-bold text-on-surface line-clamp-1">{notice.title}</h3>
                    <p className="text-xs text-on-surface-variant line-clamp-3 leading-relaxed">
                      {notice.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant text-xs text-on-surface-variant">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">person</span>
                      {notice.postedByName || notice.author?.name || "Society Committee"}
                    </span>
                    <span className="text-primary font-semibold hover:underline">Read Circular →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE POLLS & VOTING */}
      {activeTab === "polls" && (
        <div className="space-y-4">
          {loadingPolls ? (
            <div className="py-16 text-center text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
              <p className="mt-2 text-sm">Loading community polls...</p>
            </div>
          ) : filteredPolls.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[44px] text-outline">how_to_vote</span>
              <h3 className="mt-2 text-base font-semibold text-on-surface">No polls found</h3>
              <p className="mt-1 text-sm">There are no active or recent polls.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPolls.map((poll) => {
                const totalVotes = (poll.options || []).reduce(
                  (sum, opt) => sum + (Number(opt.votes) || 0),
                  0
                );
                const hasVoted = poll.userVoted !== undefined ? poll.userVoted : false;
                const isClosed = poll.status === "closed";

                return (
                  <div
                    key={poll._id || poll.id}
                    className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          isClosed ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {isClosed ? "Closed" : "Live Poll"}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {formatPollEndDate(poll.endDate)}
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-bold text-on-surface">{poll.question}</h3>
                      {poll.description && (
                        <p className="text-xs text-on-surface-variant mt-0.5">{poll.description}</p>
                      )}
                    </div>

                    {/* Poll Options */}
                    <div className="space-y-2">
                      {(poll.options || []).map((opt, idx) => {
                        const votes = Number(opt.votes) || 0;
                        const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        const isUserChoice = poll.userVoteIndex === idx;

                        return (
                          <div
                            key={idx}
                            onClick={() => !isClosed && !hasVoted && handleVote(poll._id || poll.id, idx)}
                            className={`relative overflow-hidden rounded-xl border p-3 transition-all ${
                              isClosed || hasVoted
                                ? "cursor-default border-outline-variant bg-surface-container-low"
                                : "cursor-pointer border-outline-variant hover:border-primary hover:bg-surface-container"
                            }`}
                          >
                            {/* Vote percentage fill bar */}
                            {(hasVoted || isClosed) && (
                              <div
                                className={`absolute inset-y-0 left-0 transition-all ${
                                  isUserChoice ? "bg-primary/20" : "bg-surface-container-high"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            )}

                            <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-on-surface flex items-center gap-1.5">
                                {isUserChoice && (
                                  <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                                )}
                                {opt.text}
                              </span>
                              {(hasVoted || isClosed) && (
                                <span className="font-bold text-on-surface-variant shrink-0">
                                  {pct}% ({votes})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-outline-variant">
                      <span>{totalVotes} total votes recorded</span>
                      {hasVoted && (
                        <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check</span> You Voted
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RESIDENT DIRECTORY */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          {loadingDir ? (
            <div className="py-16 text-center text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
              <p className="mt-2 text-sm">Loading directory...</p>
            </div>
          ) : filteredDirectory.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[44px] text-outline">group</span>
              <h3 className="mt-2 text-base font-semibold text-on-surface">No residents found</h3>
              <p className="mt-1 text-sm">No members match your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDirectory.map((m, idx) => {
                const name = m.user?.name || m.name || "Resident";
                const phone = m.user?.phone || m.phone || "";
                const flatLabel = m.unit?.unitNumber || m.unitNumber ? `Flat ${m.unit?.unitNumber || m.unitNumber}` : "Member";
                const wing = m.wing?.name || m.wing || "";
                const roleName = (m.role || "resident").replace(/_/g, " ");

                return (
                  <div
                    key={m._id || m.id || idx}
                    className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 font-bold text-primary text-base">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-on-surface text-sm line-clamp-1">{name}</h4>
                          <p className="text-xs text-on-surface-variant">
                            {flatLabel} {wing ? `(Wing ${wing})` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant capitalize">
                        {roleName}
                      </span>
                    </div>

                    {phone && (
                      <div className="pt-2 border-t border-outline-variant flex items-center justify-between text-xs">
                        <span className="font-mono text-on-surface-variant">{phone}</span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${phone}`}
                            className="rounded-lg bg-surface-container p-1.5 text-primary hover:bg-primary hover:text-on-primary transition"
                            title="Call resident"
                          >
                            <span className="material-symbols-outlined text-[16px]">call</span>
                          </a>
                          <a
                            href={`https://wa.me/91${phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-600 hover:text-white transition"
                            title="WhatsApp"
                          >
                            <span className="material-symbols-outlined text-[16px]">chat</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedNotice(null)}>
          <div className="w-full max-w-xl rounded-2xl bg-surface-container-lowest p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">
                {selectedNotice.category || "Notice"}
              </span>
              <button
                onClick={() => setSelectedNotice(null)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-on-surface">{selectedNotice.title}</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Posted by {selectedNotice.postedByName || selectedNotice.author?.name || "Society Admin"} · {timeAgo(selectedNotice.createdAt)}
              </p>
            </div>

            <div className="text-sm text-on-surface leading-relaxed whitespace-pre-line border-t border-b border-outline-variant py-4">
              {selectedNotice.content}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedNotice(null)}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
