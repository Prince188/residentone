const { Society } = require("./society.model");

class SocietyService {
  async findById(id) {
    return Society.findById(id);
  }

  async findAll(filters = {}) {
    const query = {};
    if (filters.city) query.city = filters.city;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    return Society.find(query);
  }

  async create(data) {
    return Society.create(data);
  }

  async update(id, data) {
    return Society.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async deactivate(id) {
    return Society.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }
}

module.exports = new SocietyService();
