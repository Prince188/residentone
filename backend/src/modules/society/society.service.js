const mongoose = require("mongoose");
const crypto = require("crypto");
const { Society } = require("./society.model");
const { User } = require("../user/user.model");
const { Membership } = require("../membership/membership.model");
const { AppError } = require("../../shared/utils/errors");

class SocietyService {
  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Society.findById(id).populate("approvedBy", "name email");
  }

  async findAll(filters = {}) {
    const query = {};
    if (filters.city) query.city = filters.city;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    return Society.find(query);
  }

  async listForAdmin(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      const rx = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ name: rx }, { city: rx }];
    }
    return Society.find(query).sort({ createdAt: -1 });
  }

  async countByStatus(status) {
    const query = status ? { status } : {};
    return Society.countDocuments(query);
  }

  async stats() {
    const [total, pending, active, rejected, suspended] = await Promise.all([
      Society.countDocuments({}),
      Society.countDocuments({ status: "pending" }),
      Society.countDocuments({ status: "active" }),
      Society.countDocuments({ status: "rejected" }),
      Society.countDocuments({ status: "suspended" }),
    ]);
    return { total, pending, active, rejected, suspended };
  }

  mapRegistrationPayload(data) {
    const {
      societyName,
      contactName,
      contactMobile,
      ...rest
    } = data;
    return {
      ...rest,
      name: societyName,
      contactPersonName: contactName,
      contactPhone: contactMobile,
    };
  }

  async registerPublic(data) {
    const mapped = this.mapRegistrationPayload(data);
    const existing = await Society.findOne({
      name: mapped.name.trim(),
      city: mapped.city.trim(),
      status: { $in: ["pending", "active"] },
    });
    if (existing) {
      throw new AppError(
        "A society with this name is already registered or awaiting review",
        409
      );
    }
    return Society.create({
      ...mapped,
      status: "pending",
      source: "public_registration",
    });
  }

  async createByAdmin(data, adminId) {
    const society = await Society.create({
      ...this.mapRegistrationPayload(data),
      status: "active",
      isActive: true,
      source: "manual",
      approvedAt: new Date(),
      approvedBy: adminId,
      updatedBy: adminId,
    });
    let adminAccount = null;
    try {
      adminAccount = await this.onboardContactAsSocietyAdmin(society);
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError(
          "A user with this email or phone already exists. Use a different contact.",
          409
        );
      }
      throw error;
    }
    return { society, adminAccount };
  }

  normalizePhoneDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  async onboardContactAsSocietyAdmin(society) {
    const email = String(society.contactEmail || "").toLowerCase().trim();
    const phoneDigits = this.normalizePhoneDigits(society.contactPhone);

    const conditions = [];
    if (email) conditions.push({ email });
    if (phoneDigits) conditions.push({ phone: new RegExp(`${phoneDigits}$`) });
    if (conditions.length === 0) return null;

    let user = await User.findOne({ $or: conditions });
    let temporaryPassword = null;

    if (!user) {
      temporaryPassword = crypto.randomBytes(9).toString("base64url");
      user = await User.create({
        name: society.contactPersonName || "Society Admin",
        email,
        phone: society.contactPhone,
        passwordHash: temporaryPassword,
      });
    }

    await Membership.findOneAndUpdate(
      { userId: user._id, societyId: society._id },
      {
        $set: { role: "society_admin", isActive: true, isPrimary: true },
        $setOnInsert: { joinedAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: "society_admin",
      isPrimary: true,
      accountCreated: Boolean(temporaryPassword),
      temporaryPassword,
    };
  }

  async approve(id, adminId) {
    const current = await this.findRawById(id);
    if (!current) throw new AppError("Society not found", 404);
    if (current.status !== "pending") {
      throw new AppError("Only pending societies can be approved", 409);
    }

    let adminAccount = null;
    if (current.source === "public_registration") {
      adminAccount = await this.onboardContactAsSocietyAdmin(current);
    }

    const society = await Society.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        $set: {
          status: "active",
          isActive: true,
          approvedAt: new Date(),
          approvedBy: adminId,
          updatedBy: adminId,
          rejectionReason: null,
        },
      },
      { new: true }
    );
    if (!society) {
      throw new AppError("Society is no longer pending", 409);
    }
    return { society, adminAccount };
  }

  async reject(id, adminId, reason) {
    const society = await Society.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        $set: {
          status: "rejected",
          isActive: false,
          rejectionReason: reason,
          updatedBy: adminId,
        },
      },
      { new: true }
    );
    if (!society) {
      const exists = await Society.findById(id);
      if (!exists) throw new AppError("Society not found", 404);
      throw new AppError("Only pending societies can be rejected", 409);
    }
    return society;
  }

  async updateStatus(id, adminId, status) {
    const allowedTransitions = {
      suspend: ["active"],
      activate: ["suspended"],
    };
    const current = await this.findRawById(id);
    if (!current) throw new AppError("Society not found", 404);
    if (status === "suspend" && !allowedTransitions.suspend.includes(current.status)) {
      throw new AppError("Only active societies can be suspended", 409);
    }
    if (status === "activate" && !allowedTransitions.activate.includes(current.status)) {
      throw new AppError("Only suspended societies can be activated", 409);
    }
    return Society.findByIdAndUpdate(
      id,
      {
        $set:
          status === "suspend"
            ? { status: "suspended", isActive: false, updatedBy: adminId }
            : { status: "active", isActive: true, updatedBy: adminId },
      },
      { new: true }
    );
  }

  async findRawById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Society.findById(id);
  }

  async create(data) {
    return Society.create(data);
  }

  async update(id, data) {
    return Society.findByIdAndUpdate(
      id,
      { ...data, updatedBy: data.updatedBy },
      { new: true, runValidators: true }
    );
  }

  async deactivate(id) {
    return Society.findByIdAndUpdate(
      id,
      { isActive: false, status: "suspended" },
      { new: true }
    );
  }
}

module.exports = new SocietyService();
