const walletService = require("./wallet.service");
const excelService = require("./excel.service");

class WalletController {
  async getSummary(req, res, next) {
    try {
      const summary = await walletService.getSummary(req.societyId);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req, res, next) {
    try {
      const buffer = await excelService.generateTreasuryReport(req.societyId);
      const filename = `Society_Financial_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WalletController();
