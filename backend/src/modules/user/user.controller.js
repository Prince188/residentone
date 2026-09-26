const userService = require("./user.service");

class UserController {
  async getProfile(req, res, next) {
    try {
      const user = await userService.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        });
      }
      const userObj = user.toObject ? user.toObject() : { ...user };
      try {
        const { FamilyMember } = require("../family-member/family-member.model");
        const familyCount = await FamilyMember.countDocuments({ addedBy: user._id, isActive: true });
        userObj.familyMembers = familyCount;
      } catch (_) {}

      res.json({ success: true, data: userObj });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { name, email, phone, occupation, familyMembers, vehicles } = req.body;
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (occupation !== undefined) updateData.occupation = occupation;
      if (familyMembers !== undefined) updateData.familyMembers = familyMembers;
      if (vehicles !== undefined) {
        const cleanVehicles = Array.isArray(vehicles)
          ? vehicles.map((v) => String(v).trim().toUpperCase()).filter(Boolean)
          : [];
        const societyId = req.societyId || req.headers["x-society-id"] || req.query.societyId;
        await userService.validateUniqueVehiclesInSociety(req.userId, societyId, cleanVehicles);
        updateData.vehicles = cleanVehicles;
      }

      const user = await userService.update(req.userId, updateData);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await userService.changePassword(req.userId, currentPassword, newPassword);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updatePushToken(req, res, next) {
    try {
      const { pushToken } = req.body;
      if (!pushToken) {
        return res.status(400).json({
          success: false,
          error: { code: "BAD_REQUEST", message: "pushToken is required" },
        });
      }
      const { User } = require("./user.model");
      await User.findByIdAndUpdate(req.userId, {
        $set: { pushToken },
        $addToSet: { pushTokens: pushToken },
      });
      res.json({ success: true, message: "Push token registered successfully" });
    } catch (error) {
      next(error);
    }
  }

  async adminListUsers(req, res, next) {
    try {
      const { search, role, status, page, limit } = req.query;
      const data = await userService.listAllUsersForAdmin({ search, role, status, page, limit });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async adminUpdateUser(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await userService.adminUpdateUser(id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async adminFreezeUser(req, res, next) {
    try {
      const { id } = req.params;
      const result = await userService.adminToggleFreezeUser(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async adminDeleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const result = await userService.adminDeleteUser(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
