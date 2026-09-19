const { MaintenancePayment } = require("../maintenance/maintenance.model");
const { Donation } = require("../donations/donation.model");
const { CollectionPayment } = require("../collections/collection.model");
const Expense = require("../expenses/expense.model");
const { Booking } = require("../amenity/amenity.model");
const { SocietyEvent } = require("../events/event.model");

class WalletService {
  async getSummary(societyId) {
    // 1. Maintenance Income
    const maintenancePayments = await MaintenancePayment.find({
      societyId,
      isActive: { $ne: false },
      gatewayStatus: { $in: ["paid", "cash"] },
    }).populate("unitId", "label unitNumber block");
    const totalMaintenanceIncome = maintenancePayments.reduce((sum, p) => sum + (p.totalAmount || p.amount || 0), 0);

    // 2. Donations Income
    const donations = await Donation.find({
      societyId,
      isActive: { $ne: false },
    })
      .populate("unitId", "label unitNumber block")
      .populate("eventId", "name");
    const totalDonationsIncome = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

    // 3. Special Collections Income
    const collectionPayments = await CollectionPayment.find({
      societyId,
      isActive: { $ne: false },
      gatewayStatus: { $in: ["paid", "cash"] },
    })
      .populate("unitId", "label unitNumber block")
      .populate({ path: "collectionId", populate: { path: "eventId", select: "name" } });
    const totalCollectionsIncome = collectionPayments.reduce((sum, cp) => sum + (cp.totalAmount || cp.amount || 0), 0);

    // 4. Paid Amenity Bookings Income
    const bookings = await Booking.find({
      societyId,
      status: "booked",
      isActive: { $ne: false },
      amount: { $gt: 0 },
    })
      .populate("amenityId", "name")
      .populate("userId", "name phone")
      .populate("unitId", "label unitNumber block");
    const totalAmenitiesIncome = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);

    // 5. Expenses Outflow
    const expenses = await Expense.find({
      societyId,
      isActive: { $ne: false },
    })
      .populate("createdById", "name")
      .populate("eventId", "name");
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 6. Master Events & Fund Breakdown
    const events = await SocietyEvent.find({ societyId, isActive: true }).lean();
    const eventBreakdownMap = new Map();

    events.forEach((ev) => {
      eventBreakdownMap.set(String(ev._id), { id: String(ev._id), name: ev.name, income: 0, expenses: 0, surplus: 0 });
    });

    donations.forEach((d) => {
      const evId = d.eventId?._id ? String(d.eventId._id) : null;
      if (evId && eventBreakdownMap.has(evId)) {
        const item = eventBreakdownMap.get(evId);
        item.income += d.amount || 0;
      }
    });

    collectionPayments.forEach((cp) => {
      const evId = cp.collectionId?.eventId?._id ? String(cp.collectionId.eventId._id) : null;
      if (evId && eventBreakdownMap.has(evId)) {
        const item = eventBreakdownMap.get(evId);
        item.income += cp.totalAmount || cp.amount || 0;
      }
    });

    expenses.forEach((e) => {
      const evId = e.eventId?._id ? String(e.eventId._id) : null;
      if (evId && eventBreakdownMap.has(evId)) {
        const item = eventBreakdownMap.get(evId);
        item.expenses += e.amount || 0;
      }
    });

    const eventSummaries = [];
    for (const item of eventBreakdownMap.values()) {
      item.surplus = item.income - item.expenses;
      eventSummaries.push(item);
    }

    // Total Income & Net Wallet Balance
    const totalIncome = totalMaintenanceIncome + totalDonationsIncome + totalCollectionsIncome + totalAmenitiesIncome;
    const netBalance = totalIncome - totalExpenses;

    // 7. Build Unified Transaction Stream
    const transactions = [];

    maintenancePayments.forEach((p) => {
      const unitLabel = p.unitId ? `Flat ${p.unitId.label || p.unitId.unitNumber}` : "Maintenance";
      transactions.push({
        id: p._id,
        type: "income",
        source: "Maintenance",
        title: `Maintenance Payment — ${unitLabel}`,
        amount: p.totalAmount || p.amount || 0,
        date: p.paidOn || p.createdAt,
        receiptNo: p.receiptNo || "PAY-REC",
        meta: { method: p.method || "Cash", unitLabel },
      });
    });

    donations.forEach((d) => {
      const unitLabel = d.unitLabel || (d.unitId ? `Flat ${d.unitId.label || d.unitId.unitNumber}` : "Resident");
      const eventName = d.eventId?.name || d.event;
      transactions.push({
        id: d._id,
        type: "income",
        source: "Donation",
        title: `Cash Donation — ${unitLabel}`,
        subtitle: eventName ? `Event: ${eventName}` : (d.purpose || "Donation"),
        amount: d.amount || 0,
        date: d.collectedAt || d.createdAt,
        receiptNo: d.receiptNo || "DON-REC",
        meta: { purpose: d.purpose, event: d.event, eventName },
      });
    });

    collectionPayments.forEach((cp) => {
      const unitLabel = cp.unitId ? `Flat ${cp.unitId.label || cp.unitId.unitNumber}` : "Resident";
      const eventName = cp.collectionId?.eventId?.name;
      transactions.push({
        id: cp._id,
        type: "income",
        source: "Collection",
        title: `Special Collection — ${unitLabel}`,
        subtitle: cp.collectionId?.title ? `${cp.collectionId.title}${eventName ? ` (${eventName})` : ''}` : "Collection",
        amount: cp.totalAmount || cp.amount || 0,
        date: cp.paidOn || cp.createdAt,
        receiptNo: cp.receiptNo || "COL-REC",
        meta: { method: cp.method || "Cash", unitLabel },
      });
    });

    bookings.forEach((b) => {
      const amenityName = b.amenityId?.name || "Amenity";
      const unitLabel = b.unitId ? `Flat ${b.unitId.label || b.unitId.unitNumber}` : (b.userId?.name || "Resident");
      transactions.push({
        id: b._id,
        type: "income",
        source: "Amenity",
        title: `${amenityName} Booking — ${unitLabel}`,
        subtitle: `Date: ${b.date} (${b.slot})`,
        amount: b.amount || 0,
        date: b.createdAt || new Date(b.date),
        receiptNo: "AMN-BOOK",
        meta: { amenityName, date: b.date, slot: b.slot },
      });
    });

    expenses.forEach((e) => {
      const eventName = e.eventId?.name || e.eventTag;
      transactions.push({
        id: e._id,
        type: "expense",
        source: "Expense",
        title: e.title,
        subtitle: eventName ? `Event: ${eventName}` : (e.category ? e.category.replace("_", " ").toUpperCase() : "Expense"),
        amount: e.amount || 0,
        date: e.expenseDate || e.createdAt,
        receiptNo: e.vendorName ? `Paid to: ${e.vendorName}` : "EXPENSE",
        meta: { category: e.category, paymentMode: e.paymentMode, vendorName: e.vendorName, billUrl: e.billUrl, eventName },
      });
    });

    // Sort transactions date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      wallet: {
        netBalance,
        totalIncome,
        totalExpenses,
        breakdown: {
          maintenance: totalMaintenanceIncome,
          donations: totalDonationsIncome,
          collections: totalCollectionsIncome,
          amenities: totalAmenitiesIncome,
          expenses: totalExpenses,
        },
        eventSummaries,
      },
      recentTransactions: transactions.slice(0, 50),
    };
  }
}

module.exports = new WalletService();
