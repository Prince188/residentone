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

  async exportExcel(req, res, next) {
    try {
      const buffer = await donationService.generateExcelBuffer(req.societyId, req.query);
      const { from, to } = req.query;
      const dateTag = from && to ? `${from}_to_${to}` : from ? `from_${from}` : to ? `to_${to}` : new Date().toISOString().slice(0, 10);
      const filename = `donations_${dateTag}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DonationController();
