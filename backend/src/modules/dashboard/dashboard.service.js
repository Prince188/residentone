const { BadgeSeen } = require("./dashboard.model");
const { Notice } = require("../notice/notice.model");
const { Complaint } = require("../complaint/complaint.model");
const { Poll, PollVote } = require("../poll/poll.model");
const { Survey, SurveyResponse } = require("../survey/survey.model");
const { ChatGroup, ChatMessage, DirectMessage } = require("../chat/chat.model");
const { MaintenanceCycle, MaintenancePayment } = require("../maintenance/maintenance.model");
const { Amenity } = require("../amenity/amenity.model");
const { Unit } = require("../unit/unit.model");
const { Membership } = require("../membership/membership.model");
const { Society } = require("../society/society.model");
const { hasPermission } = require("../../shared/permissions");
const { User } = require("../user/user.model");

const FEATURES = [
  "complaints",
  "polls",
  "surveys",
];

async function getLastSeenAt(userId, societyId, feature, membership) {
  const doc = await BadgeSeen.findOne({ userId, societyId: societyId || null, feature }).lean();
  if (doc && doc.lastSeenAt) return doc.lastSeenAt;
  // Fallback: membership joinedAt or user createdAt
  if (membership && membership.joinedAt) return new Date(membership.joinedAt);
  if (membership && membership.createdAt) return new Date(membership.createdAt);
  // Try fetch user
  try {
    const user = await User.findById(userId).select("createdAt").lean();
    if (user && user.createdAt) return new Date(user.createdAt);
  } catch (_) {}
  // Safe fallback: epoch? Use 0 to show historic? But prefer 30 days ago? Use epoch for now to show all as new until first visit will clear.
  return new Date(0);
}

async function setSeen(userId, societyId, features) {
  const now = new Date();
  const ops = features.map((feature) => ({
    updateOne: {
      filter: { userId, societyId: societyId || null, feature },
      update: { $set: { lastSeenAt: now } },
      upsert: true,
    },
  }));
  if (ops.length) await BadgeSeen.bulkWrite(ops);
  return now;
}

function toObjectId(id) {
  try {
    const mongoose = require("mongoose");
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
}

async function computeCounts({ societyId, userId, membership, rolePermissions }) {
  const userObjId = toObjectId(userId);
  const societyObjId = societyId ? toObjectId(societyId) : null;

  // Fetch lastSeen for all features in parallel
  const lastSeenMap = {};
  await Promise.all(
    FEATURES.map(async (f) => {
      // For global features, societyId is null
      const sid = ["pending_approvals", "societies"].includes(f) ? null : societyObjId;
      // Normalize to string for map key: but we need to fetch with actual societyId value
      // For global, soc null, else societyId
      const effectiveSid = sid;
      lastSeenMap[f] = await getLastSeenAt(userObjId, effectiveSid, f, membership);
    })
  );

  const counts = {};
  const tasks = [];

  if (societyId) {
    // Complaints
    tasks.push(
      (async () => {
        try {
          const last = lastSeenMap.complaints;
          const role = membership?.role;
          let hasComplaintPerm = false;
          if (["super_admin", "society_admin"].includes(role)) hasComplaintPerm = true;
          else {
            try {
              const society = await Society.findById(societyObjId).select("rolePermissions").lean();
              hasComplaintPerm = hasPermission(role, "manage_complaints", society?.rolePermissions);
            } catch {}
          }
          const filter = { societyId: societyObjId, isActive: true, createdAt: { $gt: last } };
          if (!hasComplaintPerm) {
            filter.$or = [{ raisedBy: userObjId }, { isPublic: true }];
          }
          const c = await Complaint.countDocuments(filter);
          counts.complaints = c;
        } catch {
          counts.complaints = 0;
        }
      })()
    );

    // Polls - wing-aware
    tasks.push(
      (async () => {
        try {
          const last = lastSeenMap.polls;
          let wingFilter = {};
          if (membership) {
            const roles = [membership.role, ...(membership.additionalRoles||[])].filter(Boolean);
            if (!roles.includes("society_admin") && !roles.includes("super_admin")) {
              let visibleWings = [];
              if (roles.includes("wing_admin")) visibleWings = (membership.assignedWings||[]).map((w)=>String(w).toUpperCase());
              else if (membership.units && membership.units.length) {
                const units = await Unit.find({ _id: { $in: membership.units }, societyId: societyObjId }).select("block").lean();
                visibleWings = [...new Set(units.map((u)=>String(u.block||"").toUpperCase()).filter(Boolean))];
              }
              if (visibleWings.length === 0) wingFilter = { $or: [{ scope: "society" }, { scope: { $exists: false } }, { scope: null }] };
              else wingFilter = { $or: [{ scope: "society" }, { scope: "wing", wing: { $in: visibleWings } }, { scope: { $exists: false } }] };
            }
          }
          const query = { societyId: societyObjId, isActive: true, createdAt: { $gt: last }, ...wingFilter };
          const polls = await Poll.find(query).select("_id").lean();
          counts.polls = polls.length;
        } catch {
          counts.polls = 0;
        }
      })()
    );

    // Surveys - wing-aware
    tasks.push(
      (async () => {
        try {
          const last = lastSeenMap.surveys;
          let wingFilter = {};
          if (membership) {
            const roles = [membership.role, ...(membership.additionalRoles||[])].filter(Boolean);
            if (!roles.includes("society_admin") && !roles.includes("super_admin")) {
              let visibleWings = [];
              if (roles.includes("wing_admin")) visibleWings = (membership.assignedWings||[]).map((w)=>String(w).toUpperCase());
              else if (membership.units && membership.units.length) {
                const units = await Unit.find({ _id: { $in: membership.units }, societyId: societyObjId }).select("block").lean();
                visibleWings = [...new Set(units.map((u)=>String(u.block||"").toUpperCase()).filter(Boolean))];
              }
              if (visibleWings.length === 0) wingFilter = { $or: [{ scope: "society" }, { scope: { $exists: false } }, { scope: null }] };
              else wingFilter = { $or: [{ scope: "society" }, { scope: "wing", wing: { $in: visibleWings } }, { scope: { $exists: false } }] };
            }
          }
          const s = await Survey.countDocuments({ societyId: societyObjId, isActive: true, createdAt: { $gt: last }, ...wingFilter });
          counts.surveys = s;
        } catch {
          counts.surveys = 0;
        }
      })()
    );
  } else {
    // No society context: set society-specific counts to 0
    counts.complaints = 0;
    counts.polls = 0;
    counts.surveys = 0;
  }

  await Promise.all(tasks);

  // Ensure all FEATURES have entry
  FEATURES.forEach((f) => {
    if (counts[f] === undefined) counts[f] = 0;
  });

  return counts;
}

module.exports = { computeCounts, setSeen, getLastSeenAt, FEATURES };
