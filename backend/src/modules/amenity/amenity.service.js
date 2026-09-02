const { Amenity, Booking } = require("./amenity.model");
const { MaintenanceCycle, MaintenancePayment } = require("../maintenance/maintenance.model");
const { AppError } = require("../../shared/utils/errors");
const { Society } = require("../society/society.model");
const { hasPermission } = require("../../shared/permissions");

class AmenityService {
  async list(societyId) {
    return Amenity.find({ societyId, isActive: true }).sort({ createdAt: -1 }).lean();
  }

  async getById(societyId, id) {
    const amenity = await Amenity.findOne({ _id: id, societyId }).lean();
    if (!amenity) throw new AppError("Amenity not found", 404);
    return amenity;
  }

  async create(societyId, userId, data) {
    const existing = await Amenity.findOne({ societyId, name: data.name, isActive: true });
    if (existing) throw new AppError("Amenity with this name already exists", 409);
    const isFullDay = data.bookingMode === "full_day";
    const amenity = await Amenity.create({
      societyId,
      name: data.name,
      description: data.description || "",
      category: data.category || "general",
      type: data.type || "free",
      capacity: data.capacity || 1,
      price: data.type === "paid" ? (data.price || 0) : 0,
      bookingMode: data.bookingMode || "slot",
      slots: isFullDay ? ["full_day"] : (data.slots && data.slots.length ? data.slots : ["06:00-07:00", "07:00-08:00", "08:00-09:00", "18:00-19:00", "19:00-20:00"]),
      openTime: data.openTime || "06:00",
      closeTime: data.closeTime || "22:00",
      createdBy: userId,
    });
    return amenity;
  }

  async update(societyId, id, data) {
    const amenity = await Amenity.findOneAndUpdate({ _id: id, societyId }, data, { new: true });
    if (!amenity) throw new AppError("Amenity not found", 404);
    return amenity;
  }

  async remove(societyId, id) {
    const amenity = await Amenity.findOneAndUpdate({ _id: id, societyId }, { isActive: false }, { new: true });
    if (!amenity) throw new AppError("Amenity not found", 404);
    return amenity;
  }

  // Check defaulter: if user has any overdue/late maintenance (like MyGate defaulter block)
  async isDefaulter(societyId, membership) {
    if (!membership || !membership.units || membership.units.length === 0) return false;
    const latest = await MaintenanceCycle.findOne({ societyId, isActive: true }).sort({ year: -1, month: -1 }).lean();
    if (!latest) return false;
    // For each unit of user, check payment
    for (const unitId of membership.units) {
      const payment = await MaintenancePayment.findOne({ societyId, cycleId: latest._id, unitId, isActive: true }).lean();
      const isOverdue = !payment && new Date(latest.dueDate) < new Date();
      if (isOverdue) return true;
      if (payment && new Date(payment.paidOn) > new Date(latest.dueDate)) {
        // late_paid still considered defaulter? For MVP treat overdue only
        continue;
      }
    }
    return false;
  }

  async getSlotsWithAvailability(societyId, amenityId, date) {
    const amenity = await this.getById(societyId, amenityId);
    if (amenity.bookingMode === "full_day") {
      const bookedCount = await Booking.countDocuments({ societyId, amenityId, date, status: "booked", isActive: true });
      return [{ slot: "full_day", booked: bookedCount, capacity: amenity.capacity, available: amenity.capacity - bookedCount, isFull: bookedCount >= amenity.capacity, label: "Whole Day" }];
    }
    const bookings = await Booking.find({ societyId, amenityId, date, status: "booked", isActive: true }).lean();
    const countBySlot = {};
    bookings.forEach((b) => {
      countBySlot[b.slot] = (countBySlot[b.slot] || 0) + 1;
    });
    return amenity.slots.map((slot) => ({
      slot,
      booked: countBySlot[slot] || 0,
      capacity: amenity.capacity,
      available: amenity.capacity - (countBySlot[slot] || 0),
      isFull: (countBySlot[slot] || 0) >= amenity.capacity,
    }));
  }

  async book(societyId, amenityId, userId, membership, data) {
    const amenity = await this.getById(societyId, amenityId);
    if (!amenity.isActive) throw new AppError("Amenity is not available", 400);
    const slot = amenity.bookingMode === "full_day" ? "full_day" : data.slot;
    if (amenity.bookingMode === "slot" && !amenity.slots.includes(slot)) throw new AppError("Invalid slot for this amenity", 400);

    // Date must be today or future, not past
    const today = new Date().toISOString().slice(0, 10);
    if (data.date < today) throw new AppError("Cannot book past dates", 400);

    // Defaulter check - block if overdue
    const defaulter = await this.isDefaulter(societyId, membership);
    if (defaulter) throw new AppError("Your maintenance is overdue. Clear dues to book amenities.", 403);

    // Capacity check
    const bookedCount = await Booking.countDocuments({ societyId, amenityId, date: data.date, slot, status: "booked", isActive: true });
    if (bookedCount >= amenity.capacity) throw new AppError(amenity.bookingMode === "full_day" ? "This date is fully booked" : "This slot is fully booked", 409);

    // Prevent double booking same user same amenity same slot same date
    const existing = await Booking.findOne({ societyId, amenityId, userId, date: data.date, slot, status: "booked", isActive: true });
    if (existing) throw new AppError(amenity.bookingMode === "full_day" ? "You already booked this date" : "You already booked this slot", 409);

    const unitId = membership.units && membership.units[0] ? membership.units[0] : null;

    const booking = await Booking.create({
      societyId,
      amenityId,
      userId,
      unitId,
      date: data.date,
      slot,
      status: "booked",
      amount: amenity.type === "paid" ? amenity.price : 0,
    });

    try {
      const { notificationService } = require("../notification/notification.service");
      notificationService.createNotification({
        societyId,
        userId,
        title: "Amenity Booking Confirmed",
        body: `Booking confirmed for ${amenity.name} on ${data.date} (${slot === "full_day" ? "Full Day" : slot}).`,
        type: "amenity",
        link: "/amenities/history",
        metadata: { bookingId: String(booking._id), amenityId: String(amenityId) },
      }).catch(() => {});
    } catch (_) {}

    return booking;
  }

  async cancel(societyId, bookingId, userId, role) {
    const booking = await Booking.findOne({ _id: bookingId, societyId, isActive: true });
    if (!booking) throw new AppError("Booking not found", 404);
    let isAdmin = ["super_admin", "society_admin"].includes(role);
    if (!isAdmin) {
      try {
        const society = await Society.findById(societyId).select("rolePermissions").lean();
        isAdmin = hasPermission(role, "manage_amenities", society?.rolePermissions);
      } catch {}
    }
    if (!isAdmin && String(booking.userId) !== String(userId)) {
      throw new AppError("You can only cancel your own bookings", 403);
    }
    if (booking.status === "cancelled") throw new AppError("Already cancelled", 400);

    booking.status = "cancelled";
    await booking.save();

    try {
      const { notificationService } = require("../notification/notification.service");
      notificationService.createNotification({
        societyId,
        userId: booking.userId,
        title: "Amenity Booking Cancelled",
        body: `Your booking for ${booking.date} (${booking.slot}) has been cancelled.`,
        type: "amenity",
        link: "/amenities/history",
        metadata: { bookingId: String(booking._id) },
      }).catch(() => {});
    } catch (_) {}

    return booking;
  }

  async myBookings(societyId, userId) {
    return Booking.find({ societyId, userId, isActive: true })
      .populate("amenityId", "name type price capacity")
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  async allBookings(societyId, amenityId, date) {
    const filter = { societyId, isActive: true };
    if (amenityId) filter.amenityId = amenityId;
    if (date) filter.date = date;
    return Booking.find(filter)
      .populate("amenityId", "name")
      .populate("userId", "name phone")
      .sort({ date: -1, slot: 1 })
      .lean();
  }

  mapAmenity(a) {
    return {
      id: a._id,
      name: a.name,
      description: a.description,
      category: a.category,
      type: a.type,
      capacity: a.capacity,
      price: a.price,
      slots: a.slots,
      bookingMode: a.bookingMode || "slot",
      openTime: a.openTime,
      closeTime: a.closeTime,
      isActive: a.isActive,
      createdAt: a.createdAt,
    };
  }
}

module.exports = new AmenityService();
