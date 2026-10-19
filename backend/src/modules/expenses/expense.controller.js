const expenseService = require("./expense.service");
const auditLogService = require("../audit-log/audit-log.service");

class ExpenseController {
  async create(req, res, next) {
    try {
      const expense = await expenseService.create(req.societyId, req.userId, req.body);

      auditLogService.recordActivity({
        societyId: req.societyId,
        userId: req.userId,
        req,
        action: "EXPENSE_RECORDED",
        entityType: "Expense",
        entityId: expense._id || expense.id,
        details: {
          title: expense.title,
          amount: expense.amount,
          category: expense.category,
          vendorName: expense.vendorName,
          paymentMode: expense.paymentMode,
        },
      });

      res.status(201).json({ success: true, data: expense });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const result = await expenseService.list(req.societyId, req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const expense = await expenseService.update(req.societyId, req.params.id, req.body);
      res.json({ success: true, data: expense });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await expenseService.delete(req.societyId, req.params.id);

      auditLogService.recordActivity({
        societyId: req.societyId,
        userId: req.userId,
        req,
        action: "EXPENSE_DELETED",
        entityType: "Expense",
        entityId: req.params.id,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExpenseController();
