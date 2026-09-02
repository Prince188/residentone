const { Poll, PollVote } = require("./poll.model");
const { Membership } = require("../membership/membership.model");
const { Unit } = require("../unit/unit.model");
const { AppError } = require("../../shared/utils/errors");

class PollService {
  async getPrimaryUnit(societyId, userId) {
    const membership = await Membership.findOne({ societyId, userId, isActive: true }).lean();
    if (!membership || !membership.units || membership.units.length === 0) return null;
    const unitId = membership.units[0];
    // Fetch unit label for display
    const unit = await Unit.findOne({ _id: unitId, societyId }).select("label").lean();
    return unit ? { unitId: unit._id, unitLabel: unit.label } : { unitId, unitLabel: null };
  }

  async getVisibleWings(societyId, userId) {
    const membership = await Membership.findOne({ societyId, userId, isActive: true }).lean();
    if (!membership) return [];
    const roles = [membership.role, ...(membership.additionalRoles || [])].filter(Boolean);
    if (roles.includes("society_admin") || roles.includes("super_admin")) return null; // null means all wings
    if (roles.includes("wing_admin")) {
      return (membership.assignedWings || []).map((w) => String(w).toUpperCase());
    }
    // resident: wings of their units
    if (membership.units && membership.units.length) {
      const units = await Unit.find({ _id: { $in: membership.units }, societyId }).select("block").lean();
      const wings = [...new Set(units.map((u) => String(u.block || "").toUpperCase()).filter(Boolean))];
      return wings;
    }
    return [];
  }

  async isWingVisible(societyId, userId, wing) {
    const visible = await this.getVisibleWings(societyId, userId);
    if (visible === null) return true;
    return visible.includes(String(wing).toUpperCase());
  }

  async create(societyId, userId, data) {
    const scope = data.scope === "wing" ? "wing" : "society";
    let wing = null;
    if (scope === "wing") {
      wing = String(data.wing || "").trim().toUpperCase();
      if (!wing) throw new AppError("Wing is required for wing poll", 400);
      if (!/^[A-Z0-9]{1,10}$/.test(wing)) throw new AppError("Invalid wing name", 400);
      // Authorize creator for wing
      const membership = await Membership.findOne({ societyId, userId, isActive: true }).lean();
      const roles = [membership?.role, ...(membership?.additionalRoles || [])].filter(Boolean);
      const isSocietyAdmin = roles.includes("society_admin") || roles.includes("super_admin");
      const isWingAdminForWing = roles.includes("wing_admin") && (membership.assignedWings || []).map((w)=>String(w).toUpperCase()).includes(wing);
      if (!isSocietyAdmin && !isWingAdminForWing) {
        // Check generic create_poll permission is already checked via middleware, but wing_admin scope extra
        throw new AppError(`Not authorized to create poll for Wing ${wing}`, 403);
      }
    }
    const poll = await Poll.create({
      societyId,
      createdBy: userId,
      question: data.question.trim(),
      options: data.options.map((text) => ({ text: text.trim(), votes: 0 })),
      type: data.type || "open",
      endDate: new Date(data.endDate),
      status: "active",
      scope,
      wing,
    });

    try {
      const { notificationService } = require("../notification/notification.service");
      notificationService.broadcastNotification({
        societyId,
        excludeUserId: userId,
        title: "New Community Poll",
        body: poll.question,
        type: "poll",
        link: `/polls/${poll._id}`,
        metadata: { pollId: String(poll._id) },
      }).catch(() => {});
    } catch (_) {}

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
    const visibleWings = userId ? await this.getVisibleWings(societyId, userId) : null;
    const baseQuery = { societyId, isActive: true };
    let wingFilter = {};
    if (visibleWings !== null && Array.isArray(visibleWings)) {
      wingFilter = {
        $or: [{ scope: "society" }, { scope: "wing", wing: { $in: visibleWings } }],
      };
      // Also include polls with missing scope (legacy)
      if (visibleWings.length === 0) {
        wingFilter = { $or: [{ scope: "society" }, { scope: { $exists: false } }, { scope: null }] };
      }
    }
    const query = visibleWings === null ? baseQuery : { ...baseQuery, ...wingFilter };
    const polls = await Poll.find(query)
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
    // Resolve primary unit for per-flat voting (MyGate style)
    let primaryUnit = null;
    if (userId) primaryUnit = await this.getPrimaryUnit(societyId, userId);

    // Fetch current user vote mapping - check by unitId if exists else userId
    let votes = [];
    if (userId) {
      if (primaryUnit?.unitId) {
        votes = await PollVote.find({ societyId, pollId: { $in: pollIds }, unitId: primaryUnit.unitId, isActive: true }).lean();
      } else {
        votes = await PollVote.find({ societyId, pollId: { $in: pollIds }, userId, isActive: true }).lean();
      }
    }
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
      const voterName = v.unitLabel ? `${v.unitLabel} · ${v.userId?.name || "Resident"}` : (v.userId?.name || "Resident");
      optMap.get(idx).push(voterName);
    }

    return polls.map((p) => this.mapPoll(p, voteMap.get(String(p._id)), votersGrouped.get(String(p._id))));
  }

  async getById(societyId, pollId, userId) {
    let poll = await Poll.findOne({ _id: pollId, societyId, isActive: true })
      .populate("createdBy", "name")
      .lean();
    if (!poll) throw new AppError("Poll not found", 404);
    if (poll.scope === "wing" && poll.wing && userId) {
      const visible = await this.isWingVisible(societyId, userId, poll.wing);
      if (!visible) throw new AppError("Not authorized to view this wing poll", 403);
    }

    // Auto-close if expired
    if (poll.status === "active" && poll.endDate && new Date() > new Date(poll.endDate)) {
      await Poll.updateOne({ _id: poll._id }, { status: "closed" });
      poll.status = "closed";
    }

    let primaryUnit = null;
    if (userId) primaryUnit = await this.getPrimaryUnit(societyId, userId);

    let userVote = null;
    if (userId) {
      let vote = null;
      if (primaryUnit?.unitId) {
        vote = await PollVote.findOne({ societyId, pollId, unitId: primaryUnit.unitId, isActive: true }).lean();
      } else {
        vote = await PollVote.findOne({ societyId, pollId, userId, isActive: true }).lean();
      }
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
      const voterName = v.unitLabel ? `${v.unitLabel} · ${v.userId?.name || "Resident"}` : (v.userId?.name || "Resident");
      votersGrouped.get(idx).push(voterName);
    }

    return this.mapPoll(poll, userVote, votersGrouped);
  }

  async vote(societyId, pollId, userId, selectedOptionIndex) {
    const poll = await Poll.findOne({ _id: pollId, societyId, isActive: true });
    if (!poll) throw new AppError("Poll not found", 404);
    if (poll.scope === "wing" && poll.wing) {
      const visible = await this.isWingVisible(societyId, userId, poll.wing);
      if (!visible) throw new AppError("Not authorized to vote on this wing poll", 403);
    }

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

    // Per-flat check: one vote per unit (MyGate style). If no unit, fallback to per-user.
    const primaryUnit = await this.getPrimaryUnit(societyId, userId);
    let existing = null;
    if (primaryUnit?.unitId) {
      existing = await PollVote.findOne({ societyId, pollId, unitId: primaryUnit.unitId, isActive: true });
      if (existing) throw new AppError("Your flat has already voted (one vote per flat)", 409);
    } else {
      existing = await PollVote.findOne({ societyId, pollId, userId, isActive: true });
      if (existing) throw new AppError("You have already voted", 409);
    }

    // Atomic increment votes for selected option
    const updatePath = `options.${selectedOptionIndex}.votes`;
    await Poll.updateOne({ _id: pollId }, { $inc: { [updatePath]: 1 } });

    const vote = await PollVote.create({
      societyId,
      pollId,
      userId,
      unitId: primaryUnit?.unitId || null,
      unitLabel: primaryUnit?.unitLabel || null,
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
      scope: poll.scope || "society",
      wing: poll.wing || null,
      totalVotes: isSecret && !isClosed ? 0 : totalVotes,
      totalVotesHidden: isSecret && !isClosed,
      userVote: userVoteIndex !== undefined && userVoteIndex !== null ? userVoteIndex : null,
      hasVoted: userVoteIndex !== undefined && userVoteIndex !== null,
      isClosed,
      isExpired: poll.endDate ? new Date() > new Date(poll.endDate) : false,
    };
  }

  async update(societyId, pollId, data) {
    const poll = await Poll.findOne({ _id: pollId, societyId, isActive: true });
    if (!poll) throw new AppError("Poll not found", 404);

    const votesCount = await PollVote.countDocuments({ pollId, societyId, isActive: true });

    if (data.options !== undefined || data.question !== undefined) {
      if (votesCount > 0) {
        throw new AppError(
          "Cannot modify poll question or options after votes have been submitted. You can still adjust the deadline.",
          400
        );
      }
      if (data.question !== undefined) poll.question = data.question.trim();
      if (data.options !== undefined) {
        poll.options = data.options.map((text) => ({ text: text.trim(), votes: 0 }));
      }
    }

    if (data.endDate !== undefined) {
      poll.endDate = data.endDate ? new Date(data.endDate) : null;
    }

    await poll.save();
    try {
      const s = require("../../socket");
      if (s.emitToSociety) s.emitToSociety(String(societyId), "poll:change", { action: "update", id: poll._id });
    } catch (_) {}
    return poll;
  }
}

module.exports = new PollService();
