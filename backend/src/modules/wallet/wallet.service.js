const { MaintenancePayment } = require("../maintenance/maintenance.model");
const Donation = require("../donations/donation.model");
const Expense = require("../expenses/expense.model");
const { Booking } = require("../amenity/amenity.model");

class WalletService {
  async getSummary(societyId) {
    // 1. Maintenance Income
    const maintenancePayments = await MaintenancePayment.find({ societyId }).populate("unitId", "label unitNumber block");
    const totalMaintenanceIncome = maintenancePayments.reduce((sum, p) => sum + (p.totalAmount || p.amount || 0), 0);

    // 2. Donations Income
    const donations = await Donation.find({ societyId }).populate("unitId", "label unitNumber block");
    const totalDonationsIncome = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

    // 3. Paid Amenity Bookings Income
    const bookings = await Booking.find({ societyId, status: "booked", amount: { $gt: 0 } })
      .populate("amenityId", "name")
      .populate("userId", "name phone")
      .populate("unitId", "label unitNumber block");
    const totalAmenitiesIncome = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);

    // 4. Expenses Outflow
    const expenses = await Expense.find({ societyId }).populate("createdById", "name");
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Total Income & Net Wallet Balance
    const totalIncome = totalMaintenanceIncome + totalDonationsIncome + totalAmenitiesIncome;
    const netBalance = totalIncome - totalExpenses;

    // 5. Build Unified Transaction Stream
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
      transactions.push({
        id: d._id,
        type: "income",
        source: "Donation",
        title: `Cash Donation — ${unitLabel}`,
        subtitle: d.purpose || d.event || "Donation",
        amount: d.amount || 0,
        date: d.collectedAt || d.createdAt,
        receiptNo: d.receiptNo || "DON-REC",
        meta: { purpose: d.purpose, event: d.event },
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
      transactions.push({
        id: e._id,
        type: "expense",
        source: "Expense",
        title: e.title,
        subtitle: e.category ? e.category.replace("_", " ").toUpperCase() : "Expense",
        amount: e.amount || 0,
        date: e.expenseDate || e.createdAt,
        receiptNo: e.vendorName ? `Paid to: ${e.vendorName}` : "EXPENSE",
        meta: { category: e.category, paymentMode: e.paymentMode, vendorName: e.vendorName, billUrl: e.billUrl },
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
          amenities: totalAmenitiesIncome,
          expenses: totalExpenses,
        },
      },
      recentTransactions: transactions.slice(0, 50),
    };
  }
}

module.exports = new WalletService();
