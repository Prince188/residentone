const Expense = require("./expense.model");

class ExpenseService {
  async create(societyId, userId, data) {
    const { resolveCollectorSnapshot } = require("../../shared/utils/collector-snapshot");
    const creator = await resolveCollectorSnapshot(societyId, userId);

    const expense = await Expense.create({
      societyId,
      createdById: userId,
      createdByName: creator.name,
      createdByPhone: creator.phone,
      createdByRole: creator.role,
      title: data.title,
      category: data.category || "others",
      amount: Number(data.amount),
      expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
      paymentMode: data.paymentMode || "cash",
      vendorName: data.vendorName || "",
      billUrl: data.billUrl || "",
      notes: data.notes || "",
      eventId: data.eventId || null,
      eventTag: data.eventTag || data.event || "",
      event: data.event || data.eventTag || "",
    });
    return expense;
  }

  async list(societyId, query = {}) {
    const filter = { societyId };
    if (query.category && query.category !== "all") {
      filter.category = query.category;
    }
    if (query.eventId) {
      filter.eventId = query.eventId;
    }
    if (query.search) {
      const q = String(query.search).trim();
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { vendorName: { $regex: q, $options: "i" } },
        { notes: { $regex: q, $options: "i" } },
        { eventTag: { $regex: q, $options: "i" } },
        { event: { $regex: q, $options: "i" } },
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
      .populate("eventId", "name category status")
      .sort({ expenseDate: -1, createdAt: -1 });

    const totalExpense = expenses.reduce((sum, e) => sum + (e.isCancelled || e.isActive === false ? 0 : (e.amount || 0)), 0);

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
    if (data.eventId !== undefined) expense.eventId = data.eventId || null;
    if (data.eventTag !== undefined || data.event !== undefined) {
      const tagVal = data.eventTag || data.event || "";
      expense.eventTag = tagVal;
      expense.event = tagVal;
    }

    await expense.save();
    return expense;
  }

  async delete(societyId, expenseId, userId, reason = "Expense cancelled by admin") {
    const expense = await Expense.findOne({ _id: expenseId, societyId });
    if (!expense) {
      throw new Error("Expense record not found");
    }

    const { resolveCollectorSnapshot } = require("../../shared/utils/collector-snapshot");
    const adminSnapshot = userId ? await resolveCollectorSnapshot(societyId, userId) : {};

    expense.isActive = false;
    expense.isCancelled = true;
    expense.cancelledAt = new Date();
    expense.cancelledBy = userId || null;
    expense.cancelledByName = adminSnapshot.name || "Society Admin";
    expense.cancelledByPhone = adminSnapshot.phone || "";
    expense.cancelledByRole = adminSnapshot.role || "";
    expense.cancellationReason = reason || "Expense cancelled by admin";

    await expense.save();

    try {
      const auditLogService = require("../audit-log/audit-log.service");
      auditLogService.recordActivity({
        societyId,
        performedBy: userId,
        action: "EXPENSE_CANCELLED",
        entityType: "EXPENSE",
        entityId: expenseId,
        details: {
          title: expense.title,
          amount: expense.amount,
          vendorName: expense.vendorName,
          reason,
        },
      });
    } catch (_) {}

    return { success: true, message: "Expense cancelled successfully", expense };
  }

  async exportExcel(societyId, query = {}) {
    const ExcelJS = require("exceljs");
    const { Society } = require("../society/society.model");
    const { SocietyEvent } = require("../events/event.model");

    const society = await Society.findById(societyId).lean();
    const societyName = society?.name || "Society Expenses";

    const filter = { societyId, isActive: { $ne: false }, isCancelled: { $ne: true } };
    let eventTitle = "All Society Expenses";
    let eventSubtitle = "Complete Expense Ledger";

    if (query.eventId === "general") {
      eventTitle = "General Operations & Utilities";
      eventSubtitle = "Maintenance, Utilities, Staff & Operational Vouchers";
      filter.eventId = null;
      filter.$or = [{ eventTag: { $in: ["", null] } }, { eventTag: { $exists: false } }];
    } else if (query.eventId && query.eventId !== "all") {
      const eventDoc = await SocietyEvent.findById(query.eventId).lean();
      if (eventDoc) {
        eventTitle = eventDoc.name || "Society Event";
        eventSubtitle = `${eventDoc.category ? eventDoc.category.toUpperCase() : "EVENT"} · Status: ${eventDoc.status || "active"}`;
        filter.$or = [
          { eventId: query.eventId },
          { eventTag: eventDoc.name },
          { event: eventDoc.name },
        ];
      } else {
        filter.eventId = query.eventId;
      }
    }

    const expenses = await Expense.find(filter)
      .populate("createdById", "name")
      .populate("eventId", "name")
      .sort({ expenseDate: -1, createdAt: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ResidentOne Platform";
    workbook.created = new Date();

    const cleanSheetName = eventTitle.replace(/[\\/?*:[\]]/g, "_").slice(0, 30) || "Expenses";
    const sheet = workbook.addWorksheet(cleanSheetName);
    sheet.properties.defaultRowHeight = 20;

    // Header styling
    sheet.mergeCells("A1:H1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = societyName.toUpperCase();
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "006948" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 30;

    sheet.mergeCells("A2:H2");
    const subCell = sheet.getCell("A2");
    subCell.value = `${eventTitle.toUpperCase()} — ${eventSubtitle} (Generated on ${new Date().toLocaleDateString("en-IN")})`;
    subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "002116" } };
    subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E7FFF2" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(2).height = 22;

    sheet.addRow([]);

    // KPI Summary
    const totalSpent = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const avgVoucher = expenses.length > 0 ? Math.round(totalSpent / expenses.length) : 0;

    sheet.addRow(["SUMMARY METRICS", "", "", "", "", "", "", ""]);
    sheet.getCell("A4").font = { name: "Arial", size: 10, bold: true, color: { argb: "006948" } };

    const kpiRow = sheet.addRow([
      "Total Vouchers",
      `${expenses.length} Records`,
      "Total Amount Spent",
      `₹${totalSpent.toLocaleString("en-IN")}`,
      "Average per Voucher",
      `₹${avgVoucher.toLocaleString("en-IN")}`,
      "",
      "",
    ]);
    kpiRow.font = { name: "Arial", size: 10, bold: true };

    sheet.addRow([]);

    // Table Header
    const tableHeader = sheet.addRow([
      "S.No",
      "Date",
      "Expense Title",
      "Category",
      "Vendor / Payee",
      "Payment Mode",
      "Amount (₹)",
      "Notes / Ref",
    ]);
    tableHeader.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "006948" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    sheet.getRow(7).height = 24;

    // Rows
    expenses.forEach((exp, idx) => {
      const dateStr = exp.expenseDate
        ? new Date(exp.expenseDate).toLocaleDateString("en-IN")
        : "—";
      const catLabel = (exp.category || "others").replace(/_/g, " ").toUpperCase();
      const modeLabel = (exp.paymentMode || "cash").replace(/_/g, " ").toUpperCase();

      const r = sheet.addRow([
        idx + 1,
        dateStr,
        exp.title || "—",
        catLabel,
        exp.vendorName || "—",
        modeLabel,
        Number(exp.amount) || 0,
        exp.notes || "",
      ]);

      if (idx % 2 === 1) {
        r.eachCell((c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAF9" } };
        });
      }

      r.getCell(1).alignment = { horizontal: "center" };
      r.getCell(2).alignment = { horizontal: "center" };
      r.getCell(6).alignment = { horizontal: "center" };
      r.getCell(7).numFmt = "₹#,##0.00";
      r.getCell(7).alignment = { horizontal: "right" };
    });

    // Total Row
    sheet.addRow([]);
    const totalRow = sheet.addRow([
      "TOTAL",
      "",
      "",
      "",
      "",
      `${expenses.length} Vouchers`,
      totalSpent,
      "",
    ]);
    totalRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "002116" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "CEE9DB" } };
    });
    totalRow.getCell(7).numFmt = "₹#,##0.00";
    totalRow.getCell(7).alignment = { horizontal: "right" };

    // Set column widths
    sheet.columns = [
      { width: 8 },  // S.No
      { width: 14 }, // Date
      { width: 32 }, // Title
      { width: 18 }, // Category
      { width: 24 }, // Vendor
      { width: 16 }, // Payment Mode
      { width: 18 }, // Amount
      { width: 30 }, // Notes
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const cleanFilenameTitle = eventTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${cleanFilenameTitle}_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return { buffer, filename, eventTitle, totalSpent };
  }
}

module.exports = new ExpenseService();
