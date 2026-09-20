const transferFeeService = require("./transferFee.service");

class TransferFeeController {
  async create(req, res, next) {
    try {
      const societyId = req.societyId;
      const userId = req.user.id || req.user._id;
      const record = await transferFeeService.create(societyId, userId, req.body);
      return res.status(201).json({
        success: true,
        message: "Transfer fee recorded successfully",
        data: record,
      });
    } catch (e) {
      next(e);
    }
  }

  async list(req, res, next) {
    try {
      const societyId = req.societyId;
      const records = await transferFeeService.list(societyId);
      return res.json({
        success: true,
        message: "Transfer fee records fetched successfully",
        data: records,
      });
    } catch (e) {
      next(e);
    }
  }

  async listMy(req, res, next) {
    try {
      const societyId = req.societyId;
      const membership = req.membership;
      const records = await transferFeeService.listMy(societyId, membership);
      return res.json({
        success: true,
        message: "My transfer fee records fetched successfully",
        data: records,
      });
    } catch (e) {
      next(e);
    }
  }

  async getReceipt(req, res, next) {
    try {
      const societyId = req.societyId;
      const { id } = req.params;
      const membership = req.membership;
      const receiptData = await transferFeeService.getReceipt(societyId, id, membership);
      return res.json({
        success: true,
        message: "Transfer fee receipt fetched successfully",
        data: receiptData,
      });
    } catch (e) {
      next(e);
    }
  }

  async exportExcel(req, res, next) {
    try {
      const societyId = req.societyId;
      const { from, to } = req.query;
      const buffer = await transferFeeService.generateExcelBuffer(societyId, { from, to });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Transfer_Fees_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      return res.send(buffer);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new TransferFeeController();
