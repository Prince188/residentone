const { User } = require("./user.model");

class UserService {
  async findByEmail(email) {
    return User.findOne({ email });
  }

  async findByEmailWithPassword(email) {
    return User.findOne({ email }).select("+passwordHash");
  }

  async findByPhoneWithPassword(phone) {
    return User.findOne({ phone }).select("+passwordHash");
  }

  async findByPhone(phone) {
    return User.findOne({ phone });
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
}

module.exports = new UserService();
