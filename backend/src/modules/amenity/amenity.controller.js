const amenityService = require("./amenity.service");

class AmenityController {
  async list(req, res, next) {
    try {
      const amenities = await amenityService.list(req.societyId);
      res.json({ success: true, data: amenities.map((a) => amenityService.mapAmenity(a)) });
    } catch (e) { next(e); }
  }

  async getById(req, res, next) {
    try {
      const a = await amenityService.getById(req.societyId, req.params.id);
      res.json({ success: true, data: amenityService.mapAmenity(a) });
    } catch (e) { next(e); }
  }

  async create(req, res, next) {
    try {
      const a = await amenityService.create(req.societyId, req.userId, req.body);
      res.status(201).json({ success: true, data: amenityService.mapAmenity(a) });
    } catch (e) { next(e); }
  }

  async update(req, res, next) {
    try {
      const a = await amenityService.update(req.societyId, req.params.id, req.body);
      res.json({ success: true, data: amenityService.mapAmenity(a) });
    } catch (e) { next(e); }
  }

  async remove(req, res, next) {
    try {
      const a = await amenityService.remove(req.societyId, req.params.id);
      res.json({ success: true, data: amenityService.mapAmenity(a) });
    } catch (e) { next(e); }
  }

  async slots(req, res, next) {
    try {
      const date = req.query.date || new Date().toISOString().slice(0, 10);
      const data = await amenityService.getSlotsWithAvailability(req.societyId, req.params.id, date);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async book(req, res, next) {
    try {
      const booking = await amenityService.book(req.societyId, req.params.id, req.userId, req.membership, req.body);
      res.status(201).json({ success: true, data: booking });
    } catch (e) { next(e); }
  }

  async cancel(req, res, next) {
    try {
      const booking = await amenityService.cancel(req.societyId, req.params.bookingId, req.userId, req.membership.role);
      res.json({ success: true, data: booking });
    } catch (e) { next(e); }
  }

  async myBookings(req, res, next) {
    try {
      const bookings = await amenityService.myBookings(req.societyId, req.userId);
      res.json({ success: true, data: bookings });
    } catch (e) { next(e); }
  }

  async allBookings(req, res, next) {
    try {
      const bookings = await amenityService.allBookings(req.societyId, req.query.amenityId, req.query.date);
      res.json({ success: true, data: bookings });
    } catch (e) { next(e); }
  }
}

module.exports = new AmenityController();
