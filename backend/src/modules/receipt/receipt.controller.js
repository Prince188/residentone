const receiptService = require("./receipt.service");

class ReceiptController {
  async verify(req, res, next) {
    try {
      const token = req.query.t || req.query.token || req.body?.t || req.body?.token;
      if (!token) {
        return res.status(400).json({ success: false, error: { code: "MISSING_TOKEN", message: "Missing verification token" } });
      }

      const requestedSocietyId = req.headers["x-society-id"] || req.query.societyId || null;
      const roles = req.roles || req.role || [];
      const rolesArr = Array.isArray(roles) ? roles : roles ? [roles] : [];
      const isSuperAdmin = rolesArr.includes("super_admin") || req.accountRole === "super_admin";

      const result = await receiptService.verifyReceipt(token, {
        requestedSocietyId,
        isSuperAdmin,
        userId: req.userId,
        roles: rolesArr,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      if (error.code === "WRONG_SOCIETY") {
        return res.status(403).json({ success: false, error: { code: "WRONG_SOCIETY", message: error.message } });
      }
      next(error);
    }
  }
}

module.exports = new ReceiptController();
