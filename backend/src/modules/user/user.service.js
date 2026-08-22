const { User } = require("./user.model");

class UserService {
  async findByEmail(email) {
    return User.findOne({ email });
  }

  async findByEmailWithPassword(email) {
    return User.findOne({ email }).select("+passwordHash");
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
}

module.exports = new UserService();
