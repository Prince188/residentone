const donationService = require("./donation.service");

class DonationController {
  async create(req, res, next) {
    try {
      const donation = await donationService.create(req.societyId, req.userId, req.body);
      res.status(201).json({ success: true, data: donation });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const donations = await donationService.list(req.societyId);
      res.json({ success: true, data: donations });
    } catch (error) {
      next(error);
    }
  }

  async listMy(req, res, next) {
    try {
      const donations = await donationService.listMy(req.societyId, req.membership);
      res.json({ success: true, data: donations });
    } catch (error) {
      next(error);
    }
  }

  async getReceipt(req, res, next) {
    try {
      const receipt = await donationService.getReceipt(req.societyId, req.params.id, req.membership);
      res.json({ success: true, data: receipt });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DonationController();
