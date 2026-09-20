const ExcelJS = require("exceljs");
const { User } = require("../user/user.model");
const { Unit } = require("../unit/unit.model");
const { MaintenancePayment } = require("../maintenance/maintenance.model");
const { Donation } = require("../donations/donation.model");
const { Collection, CollectionPayment } = require("../collections/collection.model");
const { Booking } = require("../amenity/amenity.model");
const Expense = require("../expenses/expense.model");
const { SocietyEvent } = require("../events/event.model");
const { Society } = require("../society/society.model");

class ExcelReportService {
  async generateTreasuryReport(societyId) {
    const society = await Society.findById(societyId).lean();
    const societyName = society?.name || "Society Treasury";

    // 1. Fetch raw data across collections
    const [events, maintenancePayments, donations, collections, collectionPayments, bookings, expenses] = await Promise.all([
      SocietyEvent.find({ societyId, isActive: true }).lean(),
      MaintenancePayment.find({ societyId, isActive: { $ne: false }, gatewayStatus: { $in: ["paid", "cash"] } })
        .populate("unitId", "label unitNumber block")
        .lean(),
      Donation.find({ societyId, isActive: { $ne: false } })
        .populate("unitId", "label unitNumber block")
        .populate("eventId", "name")
        .lean(),
      Collection.find({ societyId, isActive: true }).populate("eventId", "name").lean(),
      CollectionPayment.find({ societyId, isActive: { $ne: false }, gatewayStatus: { $in: ["paid", "cash"] } })
        .populate("unitId", "label unitNumber block")
        .populate({ path: "collectionId", populate: { path: "eventId", select: "name" } })
        .lean(),
      Booking.find({ societyId, status: "booked", isActive: { $ne: false }, amount: { $gt: 0 } })
        .populate("amenityId", "name")
        .populate("userId", "name phone")
        .populate("unitId", "label unitNumber block")
        .lean(),
      Expense.find({ societyId, isActive: { $ne: false } })
        .populate("createdById", "name")
        .populate("eventId", "name")
        .lean(),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ResidentOne Platform";
    workbook.created = new Date();

    // =========================================================================
    // SHEET 1: MASTER OVERVIEW & CASHFLOW LEDGER
    // =========================================================================
    const masterSheet = workbook.addWorksheet("Master Overview");
    masterSheet.properties.defaultRowHeight = 20;

    // Header styling helper
    const applyHeader = (sheet, title, subtitle) => {
      sheet.mergeCells("A1:G1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = societyName.toUpperCase();
      titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "006948" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 32;

      sheet.mergeCells("A2:G2");
      const subCell = sheet.getCell("A2");
      subCell.value = `${title} — ${subtitle} (Generated on ${new Date().toLocaleDateString("en-IN")})`;
      subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "002116" } };
      subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E7FFF2" } };
      subCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(2).height = 22;
      sheet.addRow([]);
    };

    applyHeader(masterSheet, "MASTER FINANCIAL TREASURY STATEMENT", "All Income & Expense Ledger");

    // Master Aggregations
    const totalMaintenance = maintenancePayments.reduce((s, p) => s + (p.totalAmount || p.amount || 0), 0);
    const totalDonations = donations.reduce((s, d) => s + (d.amount || 0), 0);
    const totalCollections = collectionPayments.reduce((s, cp) => s + (cp.totalAmount || cp.amount || 0), 0);
    const totalAmenities = bookings.reduce((s, b) => s + (b.amount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalIncome = totalMaintenance + totalDonations + totalCollections + totalAmenities;
    const netBalance = totalIncome - totalExpenses;

    // Summary Card Table
    masterSheet.addRow(["FINANCIAL KPI OVERVIEW", "", "", "", "", "", ""]);
    masterSheet.getCell("A4").font = { name: "Arial", size: 11, bold: true, color: { argb: "006948" } };

    const kpiRow1 = masterSheet.addRow(["Total Income (All Sources)", `₹${totalIncome.toLocaleString("en-IN")}`, "", "Total Expenses Outflow", `₹${totalExpenses.toLocaleString("en-IN")}`, "", "Net Wallet Balance", `₹${netBalance.toLocaleString("en-IN")}`]);
    kpiRow1.font = { name: "Arial", size: 10, bold: true };

    masterSheet.addRow([]);

    // Master Transaction Table
    masterSheet.addRow(["CHRONOLOGICAL CASHFLOW LEDGER", "", "", "", "", "", ""]);
    masterSheet.getCell("A7").font = { name: "Arial", size: 11, bold: true, color: { argb: "006948" } };

    const ledgerHeader = masterSheet.addRow(["Date", "Type", "Source / Event", "Description / Flat", "Payment Mode", "Receipt / Ref #", "Amount (₹)"]);
    ledgerHeader.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "006948" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Build Chronological Stream
    const stream = [];

    maintenancePayments.forEach((p) => {
      const uLabel = p.unitId ? `Flat ${p.unitId.label || p.unitId.unitNumber}` : "Maintenance";
      stream.push({
        date: p.paidOn || p.createdAt,
        type: "INCOME (+)",
        source: "Maintenance Dues",
        desc: `Maintenance — ${uLabel}`,
        mode: p.method || "Cash",
        ref: p.receiptNo || "PAY-REC",
        amount: p.totalAmount || p.amount || 0,
      });
    });

    donations.forEach((d) => {
      const uLabel = d.unitLabel || (d.unitId ? `Flat ${d.unitId.label || d.unitId.unitNumber}` : "Resident");
      const eventName = d.eventId?.name || d.event || "General Donation";
      stream.push({
        date: d.collectedAt || d.createdAt,
        type: "INCOME (+)",
        source: `Donation (${eventName})`,
        desc: `Donation — ${uLabel} (${d.purpose || "Voluntary"})`,
        mode: d.method || "Cash",
        ref: d.receiptNo || "DON-REC",
        amount: d.amount || 0,
      });
    });

    collectionPayments.forEach((cp) => {
      const uLabel = cp.unitId ? `Flat ${cp.unitId.label || cp.unitId.unitNumber}` : "Resident";
      const colTitle = cp.collectionId?.title || "Special Collection";
      stream.push({
        date: cp.paidOn || cp.createdAt,
        type: "INCOME (+)",
        source: `Collection (${cp.collectionId?.eventId?.name || "Special Drive"})`,
        desc: `${colTitle} — ${uLabel}`,
        mode: cp.method || "Cash",
        ref: cp.receiptNo || "COL-REC",
        amount: cp.totalAmount || cp.amount || 0,
      });
    });

    bookings.forEach((b) => {
      const uLabel = b.unitId ? `Flat ${b.unitId.label || b.unitId.unitNumber}` : (b.userId?.name || "Resident");
      stream.push({
        date: b.createdAt || new Date(b.date),
        type: "INCOME (+)",
        source: "Amenity Booking",
        desc: `${b.amenityId?.name || "Amenity"} Booking — ${uLabel}`,
        mode: "Online/Cash",
        ref: "AMN-BOOK",
        amount: b.amount || 0,
      });
    });

    expenses.forEach((e) => {
      const eventName = e.eventId?.name || e.eventTag || "General Expense";
      stream.push({
        date: e.expenseDate || e.createdAt,
        type: "EXPENSE (-)",
        source: `Expense (${eventName})`,
        desc: `${e.title}${e.vendorName ? ` (Paid to: ${e.vendorName})` : ""}`,
        mode: (e.paymentMode || "cash").toUpperCase(),
        ref: e.category ? e.category.replace("_", " ").toUpperCase() : "EXPENSE",
        amount: -(e.amount || 0),
      });
    });

    stream.sort((a, b) => new Date(b.date) - new Date(a.date));

    stream.forEach((row) => {
      const isExpense = row.amount < 0;
      const r = masterSheet.addRow([
        new Date(row.date).toLocaleDateString("en-IN"),
        row.type,
        row.source,
        row.desc,
        row.mode,
        row.ref,
        Math.abs(row.amount),
      ]);
      r.getCell(2).font = { color: { argb: isExpense ? "DC2626" : "15803D" }, bold: true };
      r.getCell(7).font = { color: { argb: isExpense ? "DC2626" : "15803D" }, bold: true };
      r.getCell(7).numFmt = "₹#,##0.00";
    });

    masterSheet.columns = [
      { width: 14 },
      { width: 14 },
      { width: 28 },
      { width: 36 },
      { width: 16 },
      { width: 20 },
      { width: 18 },
    ];

    // =========================================================================
    // DYNAMIC EVENT-WISE WORKSHEETS (e.g. Navratri 2026, Ganesh Utsav 2026)
    // =========================================================================

    // Gather all distinct event tags (from SocietyEvent master + text tags)
    const eventMap = new Map();

    events.forEach((ev) => {
      eventMap.set(String(ev._id), { id: String(ev._id), name: ev.name, category: ev.category });
    });

    // Fallback text event tags from donations, collections, expenses
    donations.forEach((d) => {
      const tag = d.eventId?.name || d.event;
      if (tag && !eventMap.has(tag)) eventMap.set(tag, { id: tag, name: tag, category: "festival" });
    });
    collections.forEach((c) => {
      const tag = c.eventId?.name || c.title;
      if (tag && !eventMap.has(tag)) eventMap.set(tag, { id: tag, name: tag, category: "festival" });
    });
    expenses.forEach((e) => {
      const tag = e.eventId?.name || e.eventTag;
      if (tag && !eventMap.has(tag)) eventMap.set(tag, { id: tag, name: tag, category: "festival" });
    });

    // Track created worksheet names to ensure uniqueness
    const usedSheetNames = new Set(["master overview"]);

    for (const [key, evInfo] of eventMap.entries()) {
      // Filter records for this event
      const evDonations = donations.filter((d) => String(d.eventId?._id || d.eventId) === key || d.event === evInfo.name);
      const evCollections = collectionPayments.filter((cp) => String(cp.collectionId?.eventId?._id || cp.collectionId?.eventId) === key || cp.collectionId?.title?.toLowerCase().includes(evInfo.name.toLowerCase()));
      const evExpenses = expenses.filter((e) => String(e.eventId?._id || e.eventId) === key || (e.eventTag && e.eventTag.toLowerCase() === evInfo.name.toLowerCase()));

      // Only create tab if there is at least 1 record or active master event
      if (evDonations.length === 0 && evCollections.length === 0 && evExpenses.length === 0) continue;

      // Clean sheet name (Excel tab max 31 chars, no special chars : \ / ? * [ ]) and ensure uniqueness
      let baseSheetName = (evInfo.name || "Event").replace(/[:\\/?*\[\]]/g, "").trim().slice(0, 25) || "Event";
      let cleanSheetName = baseSheetName;
      let counter = 2;
      while (usedSheetNames.has(cleanSheetName.toLowerCase())) {
        cleanSheetName = `${baseSheetName.slice(0, 22)} (${counter})`;
        counter++;
      }
      usedSheetNames.add(cleanSheetName.toLowerCase());

      const sheet = workbook.addWorksheet(cleanSheetName);
      sheet.properties.defaultRowHeight = 20;

      applyHeader(sheet, `${evInfo.name.toUpperCase()} — EVENT FINANCIAL STATEMENT`, "Dedicated Inflow & Outflow Audit");

      // SECTION A: SPECIAL COLLECTIONS (Per-Flat Drive)
      sheet.addRow(["SECTION A: SPECIAL COLLECTIONS (PER-FLAT DRIVE)", "", "", "", "", "", ""]);
      sheet.getCell(`A4`).font = { name: "Arial", size: 11, bold: true, color: { argb: "006948" } };

      const colHeader = sheet.addRow(["Date", "Flat / Unit", "Resident Name", "Collection Drive Title", "Mode", "Receipt #", "Amount (₹)"]);
      colHeader.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "006948" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      let colSubtotal = 0;
      evCollections.forEach((cp) => {
        const amt = cp.totalAmount || cp.amount || 0;
        colSubtotal += amt;
        const uLabel = cp.unitId ? `Flat ${cp.unitId.label || cp.unitId.unitNumber}` : "Resident";
        const row = sheet.addRow([
          new Date(cp.paidOn || cp.createdAt).toLocaleDateString("en-IN"),
          uLabel,
          cp.unitId?.label || "Resident",
          cp.collectionId?.title || "Special Drive",
          cp.method || "Cash",
          cp.receiptNo || "COL-REC",
          amt,
        ]);
        row.getCell(7).numFmt = "₹#,##0.00";
      });

      const colSubRow = sheet.addRow(["", "", "", "", "", "SUBTOTAL COLLECTIONS:", colSubtotal]);
      colSubRow.getCell(6).font = { bold: true };
      colSubRow.getCell(7).font = { bold: true, color: { argb: "15803D" } };
      colSubRow.getCell(7).numFmt = "₹#,##0.00";

      sheet.addRow([]);

      // SECTION B: VOLUNTARY DONATIONS & SPONSORSHIPS
      sheet.addRow(["SECTION B: VOLUNTARY DONATIONS & SPONSORSHIPS", "", "", "", "", "", ""]);
      const donHeadLineNum = sheet.rowCount;
      sheet.getCell(`A${donHeadLineNum}`).font = { name: "Arial", size: 11, bold: true, color: { argb: "006948" } };

      const donHeader = sheet.addRow(["Date", "Flat / Unit", "Donor Name", "Sponsorship / Purpose Note", "Mode", "Receipt #", "Amount (₹)"]);
      donHeader.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "006948" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      let donSubtotal = 0;
      evDonations.forEach((d) => {
        const amt = d.amount || 0;
        donSubtotal += amt;
        const uLabel = d.unitLabel || (d.unitId ? `Flat ${d.unitId.label || d.unitId.unitNumber}` : "Resident");
        const row = sheet.addRow([
          new Date(d.collectedAt || d.createdAt).toLocaleDateString("en-IN"),
          uLabel,
          d.unitLabel || "Donor",
          d.purpose || d.event || "Voluntary Donation",
          d.method || "Cash",
          d.receiptNo || "DON-REC",
          amt,
        ]);
        row.getCell(7).numFmt = "₹#,##0.00";
      });

      const donSubRow = sheet.addRow(["", "", "", "", "", "SUBTOTAL DONATIONS:", donSubtotal]);
      donSubRow.getCell(6).font = { bold: true };
      donSubRow.getCell(7).font = { bold: true, color: { argb: "15803D" } };
      donSubRow.getCell(7).numFmt = "₹#,##0.00";

      sheet.addRow([]);

      // SECTION C: EVENT EXPENSES & BILL OUTFLOWS
      sheet.addRow(["SECTION C: EVENT EXPENSES & BILL OUTFLOWS", "", "", "", "", "", ""]);
      const expHeadLineNum = sheet.rowCount;
      sheet.getCell(`A${expHeadLineNum}`).font = { name: "Arial", size: 11, bold: true, color: { argb: "DC2626" } };

      const expHeader = sheet.addRow(["Date", "Expense Title", "Category", "Vendor / Payee", "Payment Mode", "Bill Ref #", "Amount (₹)"]);
      expHeader.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DC2626" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      let expSubtotal = 0;
      evExpenses.forEach((e) => {
        const amt = e.amount || 0;
        expSubtotal += amt;
        const row = sheet.addRow([
          new Date(e.expenseDate || e.createdAt).toLocaleDateString("en-IN"),
          e.title,
          e.category ? e.category.replace("_", " ").toUpperCase() : "EVENT",
          e.vendorName || "Vendor",
          (e.paymentMode || "cash").toUpperCase(),
          e.billUrl ? "BILL ATTACHED" : "EXP-BILL",
          amt,
        ]);
        row.getCell(7).font = { color: { argb: "DC2626" } };
        row.getCell(7).numFmt = "₹#,##0.00";
      });

      const expSubRow = sheet.addRow(["", "", "", "", "", "SUBTOTAL EXPENSES:", expSubtotal]);
      expSubRow.getCell(6).font = { bold: true };
      expSubRow.getCell(7).font = { bold: true, color: { argb: "DC2626" } };
      expSubRow.getCell(7).numFmt = "₹#,##0.00";

      sheet.addRow([]);

      // SECTION D: EVENT FINANCIAL SUMMARY & NET SURPLUS
      const totalEventIncome = colSubtotal + donSubtotal;
      const eventNetSurplus = totalEventIncome - expSubtotal;

      sheet.addRow(["SECTION D: EVENT SUMMARY & REMAINING SURPLUS BALANCE", "", "", "", "", "", ""]);
      const sumHeadLineNum = sheet.rowCount;
      sheet.getCell(`A${sumHeadLineNum}`).font = { name: "Arial", size: 11, bold: true, color: { argb: "006948" } };

      sheet.addRow(["1. Total Special Collections:", `₹${colSubtotal.toLocaleString("en-IN")}`, "", "", "", "", ""]);
      sheet.addRow(["2. Total Voluntary Donations:", `₹${donSubtotal.toLocaleString("en-IN")}`, "", "", "", "", ""]);
      sheet.addRow(["TOTAL EVENT INFLOW (A + B):", `₹${totalEventIncome.toLocaleString("en-IN")}`, "", "", "", "", ""]);
      sheet.addRow(["TOTAL EVENT OUTFLOW (C):", `₹${expSubtotal.toLocaleString("en-IN")}`, "", "", "", "", ""]);

      const netSurplusRow = sheet.addRow([
        "REMAINING EVENT SURPLUS BALANCE:",
        `₹${eventNetSurplus.toLocaleString("en-IN")}`,
        "",
        "",
        "",
        "",
        eventNetSurplus >= 0 ? "SURPLUS (+)" : "DEFICIT (-)",
      ]);

      netSurplusRow.font = { name: "Arial", size: 11, bold: true };
      netSurplusRow.getCell(2).font = { name: "Arial", size: 12, bold: true, color: { argb: eventNetSurplus >= 0 ? "15803D" : "DC2626" } };

      sheet.columns = [
        { width: 14 },
        { width: 24 },
        { width: 24 },
        { width: 34 },
        { width: 16 },
        { width: 18 },
        { width: 20 },
      ];
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}

module.exports = new ExcelReportService();
