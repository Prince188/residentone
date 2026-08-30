const { Complaint } = require("./complaint.model");
const { AppError } = require("../../shared/utils/errors");
const { Society } = require("../society/society.model");
const { hasPermission } = require("../../shared/permissions");

async function hasComplaintPermission(societyId, role) {
  if (["super_admin", "society_admin"].includes(role)) return true;
  try {
    const society = await Society.findById(societyId).select("rolePermissions").lean();
    return hasPermission(role, "manage_complaints", society?.rolePermissions);
  } catch {
    return false;
  }
}

// Allowed status transitions for validation (admin can do any, resident limited)
const VALID_TRANSITIONS = {
  open: ["in_progress", "on_hold", "resolved", "closed"],
  in_progress: ["on_hold", "resolved", "closed"],
  on_hold: ["in_progress", "resolved", "closed"],
  resolved: ["closed", "reopened"],
  closed: ["reopened"],
  reopened: ["open", "in_progress", "on_hold", "resolved", "closed"],
};

function isAdminRole(role) {
  // Legacy sync check – kept for non-society contexts; prefer hasComplaintPermission
  return ["super_admin", "society_admin"].includes(role);
}

class ComplaintService {
  mapComplaint(doc) {
    const c = doc.toObject ? doc.toObject() : doc;
    return {
      id: c._id,
      title: c.title,
      description: c.description,
      category: c.category,
      priority: c.priority,
      status: c.status,
      isPublic: c.isPublic,
      raisedBy: c.raisedBy,
      raisedByName: c.raisedBy?.name || c.raisedByName || "Unknown",
      assignedTo: c.assignedTo,
      assignedToName: c.assignedTo?.name || null,
      unitId: c.unitId,
      unitLabel: c.unitId?.label || null,
      societyId: c.societyId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  _populateQuery(query) {
    return query
      .populate("raisedBy", "name phone")
      .populate("assignedTo", "name phone")
      .populate("unitId", "label block floor doorNo");
  }

  async create(societyId, userId, data) {
    const complaint = await Complaint.create({
      societyId,
      raisedBy: userId,
      title: data.title,
      description: data.description,
      category: data.category || "other",
      priority: data.priority || "medium",
      isPublic: Boolean(data.isPublic),
      unitId: data.unitId || null,
      status: "open",
    });

    // Populate for response
    await complaint.populate([
      { path: "raisedBy", select: "name phone" },
      { path: "unitId", select: "label block" },
    ]);

    return complaint;
  }

  async list(societyId, userId, role, filters = {}) {
    const isAdmin = await hasComplaintPermission(societyId, role);

    const baseFilter = {
      societyId,
      isActive: true,
    };

    // Non-admin: see own complaints + public complaints from others
    if (!isAdmin) {
      baseFilter.$or = [{ raisedBy: userId }, { isPublic: true }];
    }

    if (filters.status) baseFilter.status = filters.status;
    if (filters.category) baseFilter.category = filters.category;
    if (filters.priority) baseFilter.priority = filters.priority;
    if (typeof filters.isPublic === "boolean") {
      // If admin filters by isPublic, respect it; for residents, intersect with visibility
      if (isAdmin) {
        baseFilter.isPublic = filters.isPublic;
        delete baseFilter.$or;
      } else {
        // Residents filtering public: keep or logic but add isPublic condition
        // For residents, "public only" means isPublic true regardless of owner
        // For "private only" means raisedBy = userId and isPublic false
        if (filters.isPublic === true) {
          baseFilter.$or = [{ isPublic: true }];
          // Still restrict to society via baseFilter.societyId
        } else {
          baseFilter.$or = [{ raisedBy: userId, isPublic: false }];
        }
        // If filtering by isPublic, we already handled; remove other filters conflict
        // But also need to keep status etc.
        // No extra step
      }
    }

    // Text search on title/description
    if (filters.q && String(filters.q).trim()) {
      const regex = new RegExp(String(filters.q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      baseFilter.$and = baseFilter.$and || [];
      baseFilter.$and.push({
        $or: [{ title: regex }, { description: regex }],
      });
      // If we have both $or (visibility) and $and (search), Mongo handles both
    }

    let query = Complaint.find(baseFilter).sort({ createdAt: -1 });
    query = this._populateQuery(query);
    const docs = await query.lean();

    // Map to include derived names
    return docs.map((doc) => ({
      id: doc._id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      priority: doc.priority,
      status: doc.status,
      isPublic: doc.isPublic,
      raisedBy: doc.raisedBy?._id || doc.raisedBy,
      raisedByName: doc.raisedBy?.name || "Unknown",
      raisedByPhone: doc.raisedBy?.phone || null,
      assignedTo: doc.assignedTo?._id || doc.assignedTo || null,
      assignedToName: doc.assignedTo?.name || null,
      unitId: doc.unitId?._id || doc.unitId || null,
      unitLabel: doc.unitId?.label || null,
      societyId: doc.societyId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  async getById(societyId, complaintId, userId, role) {
    let query = Complaint.findOne({ _id: complaintId, societyId, isActive: true });
    query = this._populateQuery(query);
    const doc = await query.lean();
    if (!doc) throw new AppError("Complaint not found", 404);

    const isAdmin = await hasComplaintPermission(societyId, role);
    const isOwner = String(doc.raisedBy?._id || doc.raisedBy) === String(userId);
    const isPublic = doc.isPublic;

    if (!isAdmin && !isOwner && !isPublic) {
      throw new AppError("You do not have access to this complaint", 403);
    }

    return {
      id: doc._id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      priority: doc.priority,
      status: doc.status,
      isPublic: doc.isPublic,
      raisedBy: doc.raisedBy?._id || doc.raisedBy,
      raisedByName: doc.raisedBy?.name || "Unknown",
      raisedByPhone: doc.raisedBy?.phone || null,
      assignedTo: doc.assignedTo?._id || doc.assignedTo || null,
      assignedToName: doc.assignedTo?.name || null,
      unitId: doc.unitId?._id || doc.unitId || null,
      unitLabel: doc.unitId?.label || null,
      societyId: doc.societyId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async updateStatus(societyId, complaintId, userId, role, newStatus) {
    const complaint = await Complaint.findOne({ _id: complaintId, societyId, isActive: true });
    if (!complaint) throw new AppError("Complaint not found", 404);

    const isAdmin = await hasComplaintPermission(societyId, role);
    const isOwner = String(complaint.raisedBy) === String(userId);

    // Residents can only reopen their own resolved/closed complaints
    if (!isAdmin) {
      if (!isOwner) throw new AppError("Only the complaint owner or admin can update status", 403);
      if (newStatus !== "reopened") {
        throw new AppError("Residents can only reopen a resolved or closed complaint", 403);
      }
      if (!["resolved", "closed"].includes(complaint.status)) {
        throw new AppError("Only resolved or closed complaints can be reopened", 400);
      }
    }

    // Validate transition for admin (allow any valid transition, but not invalid like open -> reopened)
    const allowed = VALID_TRANSITIONS[complaint.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new AppError(`Cannot change status from ${complaint.status} to ${newStatus}`, 400);
    }

    complaint.status = newStatus;
    await complaint.save();
    await complaint.populate([
      { path: "raisedBy", select: "name phone" },
      { path: "assignedTo", select: "name phone" },
      { path: "unitId", select: "label block" },
    ]);
    return this.mapComplaint(complaint);
  }

  async assign(societyId, complaintId, assignedTo) {
    const complaint = await Complaint.findOne({ _id: complaintId, societyId, isActive: true });
    if (!complaint) throw new AppError("Complaint not found", 404);

    // assignedTo can be null (unassign) or userId string
    if (assignedTo) {
      // Basic existence check could be added with User model, but keep simple
      complaint.assignedTo = assignedTo;
    } else {
      complaint.assignedTo = null;
    }

    // If assigning and status is open, auto move to in_progress for convenience
    if (complaint.status === "open" && complaint.assignedTo) {
      complaint.status = "in_progress";
    }

    await complaint.save();
    await complaint.populate([
      { path: "raisedBy", select: "name phone" },
      { path: "assignedTo", select: "name phone" },
      { path: "unitId", select: "label block" },
    ]);
    return this.mapComplaint(complaint);
  }

  async getStats(societyId, userId, role) {
    const isAdmin = await hasComplaintPermission(societyId, role);
    const match = { societyId, isActive: true };
    if (!isAdmin) {
      match.$or = [{ raisedBy: userId }, { isPublic: true }];
    }
    const all = await Complaint.find(match).lean();
    const counts = { open: 0, in_progress: 0, on_hold: 0, resolved: 0, closed: 0, reopened: 0, total: all.length };
    all.forEach((c) => {
      if (counts[c.status] !== undefined) counts[c.status] += 1;
    });
    // Avg closure: for resolved/closed, diff createdAt vs updatedAt approx
    const closedDocs = all.filter((c) => ["resolved", "closed"].includes(c.status));
    let avgClosureHours = null;
    if (closedDocs.length) {
      const totalHours = closedDocs.reduce((sum, c) => {
        const diff = new Date(c.updatedAt) - new Date(c.createdAt);
        return sum + diff / (1000 * 60 * 60);
      }, 0);
      avgClosureHours = Math.round((totalHours / closedDocs.length) * 10) / 10;
    }
    return { ...counts, avgClosureHours };
  }
}

module.exports = new ComplaintService();
