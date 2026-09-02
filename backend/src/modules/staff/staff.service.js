const bcrypt = require("bcryptjs");
const { Staff, STAFF_TYPES } = require("./staff.model");
const { User } = require("../user/user.model");
const { Membership } = require("../membership/membership.model");
const { AppError } = require("../../shared/utils/errors");
const { emitToSociety } = require("../../socket");

function normalizePhone(val) {
  return String(val || "").replace(/\D/g, "");
}

class StaffService {
  async lookupUserByPhone(phone) {
    const raw = normalizePhone(phone);
    if (!raw || raw.length < 5) return null;

    const user = await User.findOne({
      phone: new RegExp(`${raw}$`),
    }).select("name phone email avatar role").lean();

    if (!user) return null;

    return {
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
    };
  }

  async listStaff(societyId) {
    const list = await Staff.find({ societyId, isActive: true })
      .populate("userId", "name phone email avatar")
      .sort({ createdAt: -1 })
      .lean();

    const counts = {
      guards: list.filter((s) => s.staffType === "security_guard").length,
      technicians: list.filter((s) => s.staffType === "technician").length,
      housekeeping: list.filter((s) => s.staffType === "housekeeping").length,
      gardeners: list.filter((s) => s.staffType === "gardener").length,
      total: list.length,
    };

    return {
      staff: list,
      counts,
    };
  }

  async addStaff(societyId, data) {
    const rawPhone = String(data.phone || "").trim();
    const phone = normalizePhone(rawPhone);
    const name = String(data.name || "").trim();
    const staffType = STAFF_TYPES.includes(data.staffType) ? data.staffType : "security_guard";
    const gate = String(data.gate || "Main Gate").trim();
    const shift = String(data.shift || "Day Shift (8 AM - 8 PM)").trim();
    const department = String(data.department || (staffType === "security_guard" ? "Security & Gate" : "Facility")).trim();
    const notes = String(data.notes || "").trim();

    if (!name || name.length < 2) {
      throw new AppError("Staff name is required (min 2 characters)", 400);
    }
    if (!phone || phone.length < 5) {
      throw new AppError("Valid phone number is required", 400);
    }

    // 1. Find or create user account
    let user = await User.findOne({ phone: new RegExp(`${phone}$`) });
    if (!user) {
      const autoEmail = data.email?.trim()?.toLowerCase() || `staff_${phone}@residentone.local`;
      // In User model, passwordHash is hashed by pre-save hook
      user = await User.create({
        name,
        email: autoEmail,
        phone: rawPhone,
        passwordHash: "Guard@123",
        role: ["resident"],
        isActive: true,
      });
    } else {
      // Update name if changed
      if (name && user.name !== name) {
        user.name = name;
        await user.save();
      }
    }

    // 2. Ensure society membership without any house/unit requirement
    const societyRole = staffType === "security_guard" ? "security_guard" : "staff";
    let membership = await Membership.findOne({ userId: user._id, societyId });
    if (!membership) {
      membership = await Membership.create({
        userId: user._id,
        societyId,
        role: societyRole,
        additionalRoles: [],
        units: [], // Staff members do not require a flat in the society!
        isActive: true,
      });
    } else {
      membership.role = societyRole;
      membership.isActive = true;
      await membership.save();
    }

    // 3. Create or update Staff entry
    let staff = await Staff.findOne({ userId: user._id, societyId });
    if (staff) {
      staff.staffType = staffType;
      staff.gate = gate;
      staff.shift = shift;
      staff.department = department;
      staff.notes = notes;
      staff.isActive = true;
      await staff.save();
    } else {
      staff = await Staff.create({
        societyId,
        userId: user._id,
        staffType,
        gate,
        shift,
        department,
        notes,
        isActive: true,
      });
    }

    const populated = await Staff.findById(staff._id)
      .populate("userId", "name phone email avatar")
      .lean();

    try {
      emitToSociety(societyId, "staff:change", populated);
    } catch (_) {}

    return populated;
  }

  async updateStaff(societyId, staffId, data) {
    const staff = await Staff.findOne({ _id: staffId, societyId });
    if (!staff) throw new AppError("Staff record not found", 404);

    if (data.staffType && STAFF_TYPES.includes(data.staffType)) {
      staff.staffType = data.staffType;
      // Sync membership role
      const societyRole = data.staffType === "security_guard" ? "security_guard" : "staff";
      await Membership.findOneAndUpdate(
        { userId: staff.userId, societyId },
        { role: societyRole }
      );
    }

    if (data.gate !== undefined) staff.gate = String(data.gate).trim();
    if (data.shift !== undefined) staff.shift = String(data.shift).trim();
    if (data.department !== undefined) staff.department = String(data.department).trim();
    if (data.notes !== undefined) staff.notes = String(data.notes).trim();
    if (data.isActive !== undefined) staff.isActive = Boolean(data.isActive);

    await staff.save();

    const populated = await Staff.findById(staff._id)
      .populate("userId", "name phone email avatar")
      .lean();

    try {
      emitToSociety(societyId, "staff:change", populated);
    } catch (_) {}

    return populated;
  }

  async removeStaff(societyId, staffId) {
    const staff = await Staff.findOne({ _id: staffId, societyId });
    if (!staff) throw new AppError("Staff record not found", 404);

    staff.isActive = false;
    await staff.save();

    // Deactivate staff membership if they don't own any units in this society
    const membership = await Membership.findOne({ userId: staff.userId, societyId });
    if (membership && (!membership.units || membership.units.length === 0)) {
      membership.isActive = false;
      await membership.save();
    }

    try {
      emitToSociety(societyId, "staff:change", { id: staffId, isActive: false });
    } catch (_) {}

    return { message: "Staff member removed successfully" };
  }
}

module.exports = new StaffService();
