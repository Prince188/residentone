const Expense = require("./expense.model");

class ExpenseService {
  async create(societyId, userId, data) {
    const expense = await Expense.create({
      societyId,
      createdById: userId,
      title: data.title,
      category: data.category || "others",
      amount: Number(data.amount),
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
      paymentMode: data.paymentMode || "cash",
      vendorName: data.vendorName || "",
      billUrl: data.billUrl || "",
      notes: data.notes || "",
    });
    return expense;
  }

  async list(societyId, query = {}) {
    const filter = { societyId };
    if (query.category && query.category !== "all") {
      filter.category = query.category;
    }
    if (query.search) {
      const q = String(query.search).trim();
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { vendorName: { $regex: q, $options: "i" } },
        { notes: { $regex: q, $options: "i" } },
      ];
    }
    if (query.from || query.to) {
      filter.expenseDate = {};
      if (query.from) filter.expenseDate.$gte = new Date(query.from);
      if (query.to) {
        const toDate = new Date(query.to);
        toDate.setHours(23, 59, 59, 999);
        filter.expenseDate.$lte = toDate;
      }
    }

    const expenses = await Expense.find(filter)
      .populate("createdById", "name email phone")
      .sort({ expenseDate: -1, createdAt: -1 });

    const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      expenses,
      totalExpense,
      count: expenses.length,
    };
  }

  async update(societyId, expenseId, data) {
    const expense = await Expense.findOne({ _id: expenseId, societyId });
    if (!expense) {
      throw new Error("Expense record not found");
    }

    if (data.title !== undefined) expense.title = data.title;
    if (data.category !== undefined) expense.category = data.category;
    if (data.amount !== undefined) expense.amount = Number(data.amount);
    if (data.expenseDate !== undefined) expense.expenseDate = new Date(data.expenseDate);
    if (data.paymentMode !== undefined) expense.paymentMode = data.paymentMode;
    if (data.vendorName !== undefined) expense.vendorName = data.vendorName;
    if (data.billUrl !== undefined) expense.billUrl = data.billUrl;
    if (data.notes !== undefined) expense.notes = data.notes;

    await expense.save();
    return expense;
  }

  async delete(societyId, expenseId) {
    const expense = await Expense.findOneAndDelete({ _id: expenseId, societyId });
    if (!expense) {
      throw new Error("Expense record not found");
    }
    return { success: true, message: "Expense deleted successfully" };
  }
}

module.exports = new ExpenseService();
