const walletService = require("./wallet.service");

class WalletController {
  async getSummary(req, res, next) {
    try {
      const summary = await walletService.getSummary(req.societyId);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WalletController();
