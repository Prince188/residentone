/**
 * Utility to capture point-in-time collector/recorder snapshots for financial records.
 * Ensures receipts, ledgers, and audit reports permanently retain collector identity
 * even if the user later changes their name, steps down, or leaves the society.
 */

async function resolveCollectorSnapshot(societyId, userId) {
  if (!userId) {
    return {
      id: null,
      name: "Society Office",
      phone: "",
      role: "admin",
      house: "Society Office",
    };
  }

  try {
    const { User } = require("../../modules/user/user.model");
    const { Membership } = require("../../modules/membership/membership.model");
    const { Unit } = require("../../modules/unit/unit.model");

    const [user, membership, ownedUnit] = await Promise.all([
      User.findById(userId).select("name phone role").lean(),
      societyId
        ? Membership.findOne({ societyId, userId, isActive: true })
            .populate("units", "label doorNo block")
            .lean()
        : null,
      societyId
        ? Unit.findOne({
            societyId,
            $or: [{ ownerId: userId }, { tenantId: userId }],
            isActive: true,
          })
            .sort({ unitNumber: 1, label: 1 })
            .lean()
        : null,
    ]);

    const name = user?.name || "Admin";
    const phone = user?.phone || "";
    const role =
      membership?.role ||
      (Array.isArray(user?.role) ? user.role[0] : user?.role) ||
      "society_admin";

    const firstUnit = (membership?.units || []).filter(Boolean)[0] || ownedUnit;
    let house = "Society Office";
    if (firstUnit) {
      house = firstUnit.label
        ? (/^(house|flat)\b/i.test(firstUnit.label)
            ? firstUnit.label
            : `House ${firstUnit.label}`)
        : firstUnit.doorNo
        ? `House ${firstUnit.doorNo}`
        : "Society Office";
    }

    return {
      id: user?._id || userId,
      name,
      phone,
      role,
      house,
    };
  } catch (_) {
    return {
      id: userId,
      name: "Admin",
      phone: "",
      role: "society_admin",
      house: "Society Office",
    };
  }
}

module.exports = { resolveCollectorSnapshot };
