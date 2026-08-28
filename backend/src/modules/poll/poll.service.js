const { Poll, PollVote } = require("./poll.model");
const { AppError } = require("../../shared/utils/errors");

class PollService {
  async create(societyId, userId, data) {
    const poll = await Poll.create({
      societyId,
      createdBy: userId,
      question: data.question.trim(),
      options: data.options.map((text) => ({ text: text.trim(), votes: 0 })),
      type: data.type || "open",
      endDate: new Date(data.endDate),
      status: "active",
    });
    return poll;
  }

  async autoCloseIfExpired(poll) {
    if (poll.status === "active" && poll.endDate && new Date() > new Date(poll.endDate)) {
      poll.status = "closed";
      await Poll.updateOne({ _id: poll._id }, { status: "closed" });
    }
    return poll;
  }

  async listForSociety(societyId, userId) {
    const polls = await Poll.find({ societyId, isActive: true })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Auto-close expired polls in background
    const now = new Date();
    const expiredIds = polls.filter((p) => p.status === "active" && new Date(p.endDate) <= now).map((p) => p._id);
    if (expiredIds.length) {
      await Poll.updateMany({ _id: { $in: expiredIds } }, { status: "closed" });
      polls.forEach((p) => {
        if (expiredIds.some((id) => String(id) === String(p._id))) p.status = "closed";
      });
    }

    const pollIds = polls.map((p) => p._id);
    // Fetch current user vote mapping
    const votes = userId
      ? await PollVote.find({ societyId, pollId: { $in: pollIds }, userId, isActive: true }).lean()
      : [];
    const voteMap = new Map(votes.map((v) => [String(v.pollId), v.selectedOptionIndex]));

    // Fetch all voters per option for open polls (for WhatsApp-style voter list)
    const allVotes = pollIds.length
      ? await PollVote.find({ societyId, pollId: { $in: pollIds }, isActive: true })
          .populate("userId", "name")
          .lean()
      : [];
    const votersGrouped = new Map(); // pollId -> optionIdx -> names[]
    for (const v of allVotes) {
      const pid = String(v.pollId);
      const idx = v.selectedOptionIndex;
      if (!votersGrouped.has(pid)) votersGrouped.set(pid, new Map());
      const optMap = votersGrouped.get(pid);
      if (!optMap.has(idx)) optMap.set(idx, []);
      const name = v.userId?.name || "Resident";
      optMap.get(idx).push(name);
    }

    return polls.map((p) => this.mapPoll(p, voteMap.get(String(p._id)), votersGrouped.get(String(p._id))));
  }

  async getById(societyId, pollId, userId) {
    let poll = await Poll.findOne({ _id: pollId, societyId, isActive: true })
      .populate("createdBy", "name")
      .lean();
    if (!poll) throw new AppError("Poll not found", 404);

    // Auto-close if expired
    if (poll.status === "active" && poll.endDate && new Date() > new Date(poll.endDate)) {
      await Poll.updateOne({ _id: poll._id }, { status: "closed" });
      poll.status = "closed";
    }

    let userVote = null;
    if (userId) {
      const vote = await PollVote.findOne({ societyId, pollId, userId, isActive: true }).lean();
      if (vote) userVote = vote.selectedOptionIndex;
    }

    // Voters per option for open polls
    const allVotes = await PollVote.find({ societyId, pollId, isActive: true })
      .populate("userId", "name")
      .lean();
    const votersGrouped = new Map();
    for (const v of allVotes) {
      const idx = v.selectedOptionIndex;
      if (!votersGrouped.has(idx)) votersGrouped.set(idx, []);
      const name = v.userId?.name || "Resident";
      votersGrouped.get(idx).push(name);
    }

    return this.mapPoll(poll, userVote, votersGrouped);
  }

  async vote(societyId, pollId, userId, selectedOptionIndex) {
    const poll = await Poll.findOne({ _id: pollId, societyId, isActive: true });
    if (!poll) throw new AppError("Poll not found", 404);

    // Check expired -> auto close
    if (poll.status === "closed" || (poll.endDate && new Date() > new Date(poll.endDate))) {
      if (poll.status !== "closed") {
        poll.status = "closed";
        await poll.save();
      }
      throw new AppError("Poll is closed", 400);
    }

    if (selectedOptionIndex < 0 || selectedOptionIndex >= poll.options.length) {
      throw new AppError("Invalid option", 400);
    }

    const existing = await PollVote.findOne({ societyId, pollId, userId, isActive: true });
    if (existing) throw new AppError("You have already voted", 409);

    // Atomic increment votes for selected option
    const updatePath = `options.${selectedOptionIndex}.votes`;
    await Poll.updateOne({ _id: pollId }, { $inc: { [updatePath]: 1 } });

    const vote = await PollVote.create({
      societyId,
      pollId,
      userId,
      selectedOptionIndex,
    });

    // Try emit socket update (non-blocking)
    try {
      const socketHelper = require("../../socket");
      socketHelper.emitToSociety(String(societyId), "poll:change", { id: pollId, action: "vote" });
    } catch (_) {}

    return vote;
  }

  async closePoll(societyId, pollId) {
    const poll = await Poll.findOne({ _id: pollId, societyId, isActive: true });
    if (!poll) throw new AppError("Poll not found", 404);
    if (poll.status === "closed") throw new AppError("Poll already closed", 400);

    poll.status = "closed";
    await poll.save();

    try {
      const socketHelper = require("../../socket");
      socketHelper.emitToSociety(String(societyId), "poll:change", { id: pollId, action: "close" });
    } catch (_) {}

    return poll;
  }

  async deletePoll(societyId, pollId) {
    const poll = await Poll.findOne({ _id: pollId, societyId, isActive: true });
    if (!poll) throw new AppError("Poll not found", 404);
    poll.isActive = false;
    await poll.save();
    return poll;
  }

  mapPoll(poll, userVoteIndex, votersGrouped) {
    const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes || 0), 0);
    const isClosed = poll.status === "closed" || (poll.endDate && new Date() > new Date(poll.endDate));
    const isSecret = poll.type === "secret";

    // For secret polls: hide votes and voters until closed, and never show voters even after closed
    const options = poll.options.map((opt, idx) => {
      const votes = isSecret && !isClosed ? 0 : opt.votes || 0;
      const percent = totalVotes > 0 && (!isSecret || isClosed) ? Math.round((votes / totalVotes) * 100) : 0;
      const voters = isSecret ? [] : (votersGrouped?.get?.(idx) || []);
      return {
        index: idx,
        text: opt.text,
        votes,
        percent,
        isVoted: userVoteIndex === idx,
        voters, // names who voted this option (only for open polls)
      };
    });

    return {
      id: poll._id,
      question: poll.question,
      options,
      type: poll.type,
      status: isClosed ? "closed" : poll.status,
      endDate: poll.endDate,
      createdAt: poll.createdAt,
      updatedAt: poll.updatedAt,
      createdByName: poll.createdBy?.name || "Admin",
      createdBy: poll.createdBy?._id || poll.createdBy,
      totalVotes: isSecret && !isClosed ? 0 : totalVotes,
      totalVotesHidden: isSecret && !isClosed,
      userVote: userVoteIndex !== undefined && userVoteIndex !== null ? userVoteIndex : null,
      hasVoted: userVoteIndex !== undefined && userVoteIndex !== null,
      isClosed,
      isExpired: poll.endDate ? new Date() > new Date(poll.endDate) : false,
    };
  }
}

module.exports = new PollService();
