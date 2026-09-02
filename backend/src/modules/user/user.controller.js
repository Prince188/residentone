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
      if (vehicles !== undefined) updateData.vehicles = vehicles;

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
}

module.exports = new UserController();
