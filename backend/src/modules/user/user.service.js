const { User } = require("./user.model");

class UserService {
  async findByEmail(email) {
    return User.findOne({ email });
  }

  async findByEmailWithPassword(email) {
    return User.findOne({ email }).select("+passwordHash");
  }

  async findByPhoneWithPassword(phone) {
    const raw = String(phone || "").trim().replace(/\s+/g, "");
    const cleanDigits = raw.replace(/\D/g, "");
    const query = {
      $or: [
        { phone: raw },
        { phone: `+${raw.replace(/^\+/, "")}` },
        { phone: raw.replace(/^\+/, "") },
      ],
    };
    if (cleanDigits.length === 10) {
      query.$or.push({ phone: cleanDigits });
      query.$or.push({ phone: `+91${cleanDigits}` });
    }
    return User.findOne(query).select("+passwordHash");
  }

  async findByPhone(phone) {
    const raw = String(phone || "").trim().replace(/\s+/g, "");
    const cleanDigits = raw.replace(/\D/g, "");
    const query = {
      $or: [
        { phone: raw },
        { phone: `+${raw.replace(/^\+/, "")}` },
        { phone: raw.replace(/^\+/, "") },
      ],
    };
    if (cleanDigits.length === 10) {
      query.$or.push({ phone: cleanDigits });
      query.$or.push({ phone: `+91${cleanDigits}` });
    }
    return User.findOne(query);
  }

  async findById(id) {
    return User.findById(id);
  }

  async create(data) {
    return User.create(data);
  }

  async update(id, data) {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) {
      const { AppError } = require("../../shared/utils/errors");
      throw new AppError("User not found", 404);
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      const { AppError } = require("../../shared/utils/errors");
      throw new AppError("Current password does not match", 400);
    }
    user.passwordHash = newPassword;
    await user.save();
    return { message: "Password updated successfully" };
  }

  async validateUniqueVehiclesInSociety(userId, societyId, newVehicles) {
    if (!Array.isArray(newVehicles) || newVehicles.length === 0) return;

    const normalizePlate = (str) => String(str || "").toUpperCase().replace(/[\s\-_]/g, "");

    // 1. Check internal duplicates in submission
    const seen = new Set();
    for (const v of newVehicles) {
      const norm = normalizePlate(v);
      if (seen.has(norm)) {
        const { AppError } = require("../../shared/utils/errors");
        throw new AppError(`Duplicate vehicle number plate "${v}" in the submission.`, 400);
      }
      seen.add(norm);
    }

    const { Membership } = require("../membership/membership.model");
    let targetSocietyId = societyId;
    if (!targetSocietyId && userId) {
      const mem = await Membership.findOne({ userId, isActive: true }).select("societyId").lean();
      if (mem?.societyId) targetSocietyId = mem.societyId;
    }

    if (!targetSocietyId) return;

    // 2. Query all active units in the given society
    const { Unit } = require("../unit/unit.model");
    const [units, memberships] = await Promise.all([
      Unit.find({ societyId: targetSocietyId, isActive: true })
        .select("ownerId tenantId label")
        .lean(),
      Membership.find({ societyId: targetSocietyId, isActive: true })
        .select("userId")
        .lean(),
    ]);

    // 3. Gather all other resident user IDs in this society
    const otherUserIds = new Set();
    units.forEach((u) => {
      if (u.ownerId && String(u.ownerId) !== String(userId)) {
        otherUserIds.add(String(u.ownerId));
      }
      if (u.tenantId && String(u.tenantId) !== String(userId)) {
        otherUserIds.add(String(u.tenantId));
      }
    });
    memberships.forEach((m) => {
      if (m.userId && String(m.userId) !== String(userId)) {
        otherUserIds.add(String(m.userId));
      }
    });

    if (otherUserIds.size === 0) return;

    // 4. Find other users who have registered vehicles
    const otherUsers = await User.find({
      _id: { $in: Array.from(otherUserIds) },
      vehicles: { $exists: true, $ne: [] },
    }).select("name vehicles").lean();

    // 5. Compare normalized plates
    for (const other of otherUsers) {
      for (const existingPlate of (other.vehicles || [])) {
        const normExisting = normalizePlate(existingPlate);
        const matchingNew = newVehicles.find((v) => normalizePlate(v) === normExisting);
        if (matchingNew) {
          const unit = units.find(
            (u) => String(u.ownerId) === String(other._id) || String(u.tenantId) === String(other._id)
          );
          const houseLabel = unit?.label ? ` (House ${unit.label})` : "";
          const { AppError } = require("../../shared/utils/errors");
          throw new AppError(
            `Vehicle plate number "${matchingNew}" is already registered in this society${houseLabel}. The same vehicle cannot be registered twice in one society.`,
            409
          );
        }
      }
    }
  }

  async listAllUsersForAdmin({ search, role, status, page = 1, limit = 50 }) {
    const query = {};
    if (search && String(search).trim()) {
      const q = String(search).trim();
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }
    if (role && role !== "all") {
      query.role = role;
    }
    if (status === "active") {
      query.isActive = true;
    } else if (status === "frozen" || status === "inactive") {
      query.isActive = false;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    const userIds = users.map((u) => u._id);
    const { Membership } = require("../membership/membership.model");
    const memberships = await Membership.find({ userId: { $in: userIds }, isActive: true })
      .select("userId societyId role")
      .populate("societyId", "name")
      .lean();

    const membershipMap = new Map();
    memberships.forEach((m) => {
      const uId = String(m.userId);
      if (!membershipMap.has(uId)) membershipMap.set(uId, []);
      membershipMap.get(uId).push({
        societyId: m.societyId?._id || m.societyId,
        societyName: m.societyId?.name || "Society",
        role: m.role,
      });
    });

    const enrichedUsers = users.map((u) => ({
      ...u,
      id: u._id,
      societies: membershipMap.get(String(u._id)) || [],
    }));

    return {
      users: enrichedUsers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async adminUpdateUser(targetUserId, data) {
    const { AppError } = require("../../shared/utils/errors");
    const user = await User.findById(targetUserId).select("+passwordHash");
    if (!user) throw new AppError("User not found", 404);

    if (data.name !== undefined) user.name = String(data.name).trim();
    if (data.email !== undefined) user.email = String(data.email).trim().toLowerCase();
    if (data.phone !== undefined) user.phone = String(data.phone).trim();
    if (data.occupation !== undefined) user.occupation = String(data.occupation).trim();
    if (data.isActive !== undefined) user.isActive = Boolean(data.isActive);
    if (Array.isArray(data.role) && data.role.length > 0) user.role = data.role;

    if (data.password && String(data.password).trim()) {
      const pass = String(data.password).trim();
      if (pass.length < 6) {
        throw new AppError("Password must be at least 6 characters long", 400);
      }
      user.passwordHash = pass;
    }

    await user.save();
    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }

  async adminToggleFreezeUser(targetUserId) {
    const { AppError } = require("../../shared/utils/errors");
    const user = await User.findById(targetUserId);
    if (!user) throw new AppError("User not found", 404);

    user.isActive = !user.isActive;
    await user.save();
    return { id: user._id, isActive: user.isActive, name: user.name };
  }

  async adminDeleteUser(targetUserId) {
    const { AppError } = require("../../shared/utils/errors");
    const user = await User.findById(targetUserId);
    if (!user) throw new AppError("User not found", 404);

    await User.findByIdAndDelete(targetUserId);
    try {
      const { Membership } = require("../membership/membership.model");
      await Membership.deleteMany({ userId: targetUserId });
    } catch (_) {}

    return { id: targetUserId, message: "User deleted successfully" };
  }
}

module.exports = new UserService();
