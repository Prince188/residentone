const mongoose = require("mongoose");
const crypto = require("crypto");
const { Society } = require("./society.model");
const { SubscriptionPayment } = require("./subscription-payment.model");
const { User } = require("../user/user.model");
const { Membership } = require("../membership/membership.model");
const { AppError } = require("../../shared/utils/errors");
const { PLAN_RATES, SUBSCRIPTION_PLANS } = require("../../shared/types");
const unitService = require("../unit/unit.service");

class SocietyService {
  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Society.findById(id).populate("approvedBy", "name email");
  }

  async findAll(filters = {}) {
    const query = {};
    if (filters.city) query.city = filters.city;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    return Society.find(query);
  }

  async listForAdmin(filters = {}) {
    const query = {};
    if (filters.status) {
      if (filters.status === "active_paid") {
        query.status = "active";
        query.isSubscriptionPaid = true;
      } else if (filters.status === "approved") {
        query.status = "active";
      } else if (filters.status === "unpaid") {
        query.status = "active";
        query.isSubscriptionPaid = { $ne: true };
      } else if (filters.status === "churned" || filters.status === "freeze") {
        query.status = { $in: ["churned", "archived"] };
      } else {
        query.status = filters.status;
      }
    }

    if (filters.paid === "true") {
      query.isSubscriptionPaid = true;
    } else if (filters.paid === "false") {
      query.isSubscriptionPaid = { $ne: true };
    }

    if (filters.search) {
      const rx = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ name: rx }, { city: rx }];
    }
    return Society.find(query).sort({ createdAt: -1 });
  }

  async countByStatus(status) {
    const query = status ? { status } : {};
    return Society.countDocuments(query);
  }

  async stats() {
    const { Unit } = require("../unit/unit.model");
    const { User } = require("../user/user.model");
    const { Membership } = require("../membership/membership.model");
    const { Visitor } = require("../visitor/visitor.model");
    const { Notice } = require("../notice/notice.model");
    const { Complaint } = require("../complaint/complaint.model");
    const { Notification } = require("../notification/notification.model");
    const { MaintenancePayment } = require("../maintenance/maintenance.model");
    const { OtpLog } = require("../otp/otp.model");
    const { SubscriptionPayment } = require("./subscription-payment.model");

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalSocieties,
      activeSocieties,
      pendingSocieties,
      trialSocieties,
      suspendedSocieties,
      churnedSocieties,
      archivedSocieties,
      rejectedSocieties,
      newSocietiesThisMonth,
      newSocietiesLastMonth,
      totalUnits,
      newUnitsThisMonth,
      totalRegisteredUsers,
      activeUsersCount,
      dau,
      mau,
      residentMemberships,
      newResidentsThisMonth,
      supportTickets,
      reportedIssues,
      failedPayments,
      overduePayments,
      visitorsLogged,
      deliveriesLogged,
      complaintsCreated,
      maintenanceTransactions,
      notificationsSent,
      paymentTotalsAgg,
      recentSocietiesRaw,
      recentComplaintsRaw,
      recentPaymentsRaw,
      allSocietiesRaw,
      monthlyPaymentsRaw,
      pendingAdminsCount,
      otpEmailSent,
      otpSmsSent,
      otpTotalSent,
      activeLinkedUsers,
      newSubscriptionsThisMonth,
      subscriptionTotalsAgg,
      monthlySubscriptionPaymentsRaw,
      paidSocietiesRaw,
    ] = await Promise.all([
      Society.countDocuments({}),
      Society.countDocuments({ status: "active" }),
      Society.countDocuments({ status: "pending" }),
      Society.countDocuments({ status: "trial" }),
      Society.countDocuments({ status: "suspended" }),
      Society.countDocuments({ status: { $in: ["churned", "archived"] } }),
      Society.countDocuments({ status: "archived" }),
      Society.countDocuments({ status: "rejected" }),
      Society.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
      Society.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Unit.countDocuments({ isActive: true }).catch(() => 0),
      Unit.countDocuments({ createdAt: { $gte: startOfThisMonth } }).catch(() => 0),
      User.countDocuments({}).catch(() => 0),
      User.countDocuments({ isActive: true }).catch(() => 0),
      User.countDocuments({ updatedAt: { $gte: last24h } }).catch(() => 0),
      User.countDocuments({ updatedAt: { $gte: last30d } }).catch(() => 0),
      Membership.distinct("userId", { role: { $in: ["owner", "tenant"] }, isActive: true }).catch(() => []),
      Membership.distinct("userId", { role: { $in: ["owner", "tenant"] }, joinedAt: { $gte: startOfThisMonth } }).catch(() => []),
      Complaint.countDocuments({ status: { $in: ["open", "in_progress"] } }).catch(() => 0),
      Complaint.countDocuments({ priority: { $in: ["high", "urgent"] }, status: { $in: ["open", "in_progress"] } }).catch(() => 0),
      MaintenancePayment.countDocuments({ gatewayStatus: "failed" }).catch(() => 0),
      MaintenancePayment.countDocuments({
        gatewayStatus: "created",
        createdAt: { $lte: sevenDaysAgo },
      }).catch(() => 0),
      Visitor.countDocuments({ visitorType: { $ne: "delivery" } }).catch(() => 0),
      Visitor.countDocuments({ visitorType: "delivery" }).catch(() => 0),
      Complaint.countDocuments({}).catch(() => 0),
      MaintenancePayment.countDocuments({}).catch(() => 0),
      Notification.countDocuments({}).catch(() => 0),
      MaintenancePayment.aggregate([
        { $match: { gatewayStatus: { $in: ["paid", "cash"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).catch(() => []),
      Society.find({}).sort({ createdAt: -1 }).limit(5).lean().catch(() => []),
      Complaint.find({ status: { $in: ["open", "in_progress"] } })
        .populate("societyId", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
        .catch(() => []),
      MaintenancePayment.find({})
        .populate("societyId", "name")
        .sort({ paidOn: -1 })
        .limit(5)
        .lean()
        .catch(() => []),
      Society.find({}, "name status city totalUnits subscriptionPlan subscriptionBilling subscriptionStartedAt subscriptionExpiresAt isSubscriptionPaid createdAt").lean().catch(() => []),
      MaintenancePayment.aggregate([
        { $match: { gatewayStatus: { $in: ["paid", "cash"] } } },
        {
          $group: {
            _id: {
              year: { $year: { $ifNull: ["$paidOn", "$createdAt"] } },
              month: { $month: { $ifNull: ["$paidOn", "$createdAt"] } },
            },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]).catch(() => []),
      Society.countDocuments({
        status: "active",
        $or: [{ societyAdmin: null }, { societyAdmin: { $exists: false } }],
      }).catch(() => 0),
      OtpLog.countDocuments({ channel: "email" }).catch(() => 0),
      OtpLog.countDocuments({ channel: "sms" }).catch(() => 0),
      OtpLog.countDocuments({}).catch(() => 0),
      Membership.distinct("userId", { isActive: true }).catch(() => []),
      Society.countDocuments({ status: "active", createdAt: { $gte: startOfThisMonth } }).catch(() => 0),
      SubscriptionPayment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).catch(() => []),
      SubscriptionPayment.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: {
              year: { $year: { $ifNull: ["$paidAt", "$createdAt"] } },
              month: { $month: { $ifNull: ["$paidAt", "$createdAt"] } },
            },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]).catch(() => []),
      SubscriptionPayment.distinct("societyId", { status: "paid" }).catch(() => []),
    ]);

    const totalResidents = residentMemberships.length;
    const newResidentsCount = newResidentsThisMonth.length;
    const activeLinkedUsersCount = activeLinkedUsers.length;

    // Platform Growth Rate calculation
    const societyGrowthRate =
      newSocietiesLastMonth > 0
        ? Math.round(((newSocietiesThisMonth - newSocietiesLastMonth) / newSocietiesLastMonth) * 100)
        : newSocietiesThisMonth > 0
        ? 100
        : 0;

    // 3 Subscription Plans Breakdown (Starter/Basic, Professional/Standard, Enterprise/Premium)
    const plansBreakdown = {
      starter: {
        plan: "starter",
        label: "Basic",
        rate: PLAN_RATES.starter || 6,
        description: "Essential billing & resident directories",
        societiesCount: 0,
        activeSocietiesCount: 0,
        totalUnits: 0,
        estimatedMRR: 0,
        societies: [],
      },
      professional: {
        plan: "professional",
        label: "Standard",
        rate: PLAN_RATES.professional || 10,
        description: "Automated gate security & amenity booking",
        societiesCount: 0,
        activeSocietiesCount: 0,
        totalUnits: 0,
        estimatedMRR: 0,
        societies: [],
      },
      enterprise: {
        plan: "enterprise",
        label: "Premium",
        rate: PLAN_RATES.enterprise || 15,
        description: "Deep compliance, ballots, vaults & dedicated manager",
        societiesCount: 0,
        activeSocietiesCount: 0,
        totalUnits: 0,
        estimatedMRR: 0,
        societies: [],
      },
    };

    // Filter strictly to societies that have paid their subscription
    const paidSocietyIdSet = new Set((paidSocietiesRaw || []).map((id) => String(id)));
    const paidSocietiesOnly = (allSocietiesRaw || []).filter(
      (soc) => soc.isSubscriptionPaid === true || paidSocietyIdSet.has(String(soc._id))
    );

    let calculatedMRR = 0;
    const effectiveUnits = totalUnits > 0 ? totalUnits : (allSocietiesRaw || []).reduce((acc, s) => acc + (s.totalUnits || 0), 0);

    // Only populate plansBreakdown and calculate subscription MRR for paid societies
    paidSocietiesOnly.forEach((soc) => {
      const planKey = plansBreakdown[soc.subscriptionPlan] ? soc.subscriptionPlan : "starter";
      const planInfo = plansBreakdown[planKey];
      const units = soc.totalUnits || 0;
      const rate = planInfo.rate;
      const monthlyFee = units * rate;

      planInfo.societiesCount += 1;
      planInfo.totalUnits += units;
      if (soc.status === "active") {
        planInfo.activeSocietiesCount += 1;
        planInfo.estimatedMRR += monthlyFee;
        calculatedMRR += monthlyFee;
      }

        planInfo.societies.push({
          _id: soc._id,
          name: soc.name,
          city: soc.city,
          status: soc.status,
          totalUnits: units,
          monthlyFee,
          subscriptionBilling: soc.subscriptionBilling || "monthly",
          subscriptionStartedAt: soc.subscriptionStartedAt,
          subscriptionExpiresAt: soc.subscriptionExpiresAt,
          createdAt: soc.createdAt,
        });
      });

    // Real dynamic calculation of expiring subscriptions within 14 days (only for active paid societies)
    const expiringSubscriptions = paidSocietiesOnly.filter((soc) => {
      if (soc.status !== "active") return false;
      let renewalDate;
      if (soc.subscriptionExpiresAt) {
        renewalDate = new Date(soc.subscriptionExpiresAt);
      } else {
        const started = soc.subscriptionStartedAt ? new Date(soc.subscriptionStartedAt) : new Date(soc.createdAt);
        const isYearly = soc.subscriptionBilling === "yearly";
        renewalDate = new Date(started);
        if (isYearly) {
          while (renewalDate <= now) {
            renewalDate.setFullYear(renewalDate.getFullYear() + 1);
          }
        } else {
          while (renewalDate <= now) {
            renewalDate.setMonth(renewalDate.getMonth() + 1);
          }
        }
      }
      const daysToRenewal = (renewalDate - now) / (1000 * 60 * 60 * 24);
      return daysToRenewal >= 0 && daysToRenewal <= 14;
    }).length;

    // Genuine subscription revenue mapping
    const monthlySubscriptionMap = new Map();
    (monthlySubscriptionPaymentsRaw || []).forEach((p) => {
      if (p._id?.year && p._id?.month) {
        const key = `${p._id.year}-${p._id.month}`;
        monthlySubscriptionMap.set(key, p.total || 0);
      }
    });

    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const revenueThisMonth = monthlySubscriptionMap.get(currentMonthKey) || 0;
    const totalPlatformRevenue = subscriptionTotalsAgg?.[0]?.total || 0;
    const activePaidCount = (paidSocietiesOnly || []).filter((s) => s.status === "active").length;
    const unpaidApprovedCount = Math.max(0, activeSocieties - activePaidCount);
    const trialSocietiesCount = trialSocieties;

    // Index DB monthly maintenance payments for resident operations tracking
    const monthlyPaymentsMap = new Map();
    (monthlyPaymentsRaw || []).forEach((p) => {
      if (p._id?.year && p._id?.month) {
        const key = `${p._id.year}-${p._id.month}`;
        monthlyPaymentsMap.set(key, p.total || 0);
      }
    });

    // Build 12-Month Dynamic Arrays strictly from genuine DB records
    const revenueLast12Months = [];
    const societyGrowthLast12Months = [];

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short" });
      const year = monthDate.getFullYear();
      const monthNum = monthDate.getMonth() + 1; // 1-12

      // Genuine subscription sales revenue collected in this month
      const actualSubscriptionForMonth = monthlySubscriptionMap.get(`${year}-${monthNum}`) || 0;
      const actualDbMaintenanceForMonth = monthlyPaymentsMap.get(`${year}-${monthNum}`) || 0;

      // Societies registered on or before this month end
      const societiesUpToMonth = (allSocietiesRaw || []).filter(
        (s) => new Date(s.createdAt) <= monthEnd
      );
      const cumulativeCount = societiesUpToMonth.length;

      // Societies registered specifically within this month
      const newSocietiesInMonth = (allSocietiesRaw || []).filter(
        (s) => new Date(s.createdAt) >= monthDate && new Date(s.createdAt) <= monthEnd
      ).length;

      revenueLast12Months.push({
        label: `${monthLabel} '${String(year).slice(-2)}`,
        month: monthLabel,
        year,
        revenue: actualSubscriptionForMonth,
        saasRevenue: actualSubscriptionForMonth,
        maintenanceRevenue: actualDbMaintenanceForMonth,
      });

      societyGrowthLast12Months.push({
        label: `${monthLabel} '${String(year).slice(-2)}`,
        month: monthLabel,
        year,
        newSocieties: newSocietiesInMonth,
        cumulative: cumulativeCount,
      });
    }

    const totalMaintenancePayments = paymentTotalsAgg?.[0]?.total || 0;

    // Build Combined Recent Platform Activity Feed
    const recentActivity = [];

    (recentSocietiesRaw || []).forEach((soc) => {
      recentActivity.push({
        id: `soc-${soc._id}`,
        type: soc.status === "active" ? "society_approved" : "society_registered",
        societyName: soc.name || "Society",
        title: soc.status === "active" ? "Society Approved & Operational" : "New Society Registration",
        description: `${soc.city || "India"} · ${soc.totalUnits || 0} Units · Contact: ${soc.contactPersonName || "Admin"}`,
        status: soc.status,
        timestamp: soc.approvedAt || soc.createdAt || new Date(),
      });
    });

    (recentComplaintsRaw || []).forEach((c) => {
      recentActivity.push({
        id: `comp-${c._id}`,
        type: "reported_issue",
        societyName: c.societyId?.name || "Residential Society",
        title: `Helpdesk: ${c.title || "Complaint Logged"}`,
        description: `Priority: ${c.priority?.toUpperCase()} · Category: ${c.category}`,
        status: c.status,
        timestamp: c.createdAt || new Date(),
      });
    });

    (recentPaymentsRaw || []).forEach((p) => {
      recentActivity.push({
        id: `pay-${p._id}`,
        type: "payment_recorded",
        societyName: p.societyId?.name || "Residential Society",
        title: `Payment Received: ₹${(p.amount || 0).toLocaleString("en-IN")}`,
        description: `Method: ${p.method || "Online Gateway"} · Status: ${p.gatewayStatus?.toUpperCase() || "PAID"}`,
        status: p.gatewayStatus === "failed" ? "failed" : "success",
        timestamp: p.paidOn || p.createdAt || new Date(),
      });
    });

    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const topRecentActivity = recentActivity.slice(0, 8);

    return {
      // 1. Top-Level Platform Overview
      overview: {
        totalSocieties,
        totalUnits: effectiveUnits,
        totalResidents,
        activeUsers: activeLinkedUsersCount,
        registeredUsers: totalRegisteredUsers,
      },

      // 2. Society Overview (Aligning with user-defined lifecycle categories)
      societies: {
        total: totalSocieties,
        active: activePaidCount, // who paid money
        approved: activeSocieties, // all paid + approved operational societies
        pending: pendingSocieties,
        unpaid: unpaidApprovedCount, // approved but not paid
        suspended: suspendedSocieties,
        rejected: rejectedSocieties,
        churned: churnedSocieties, // freeze/churned (churned or archived)
        trial: trialSocieties,
        newThisMonth: newSocietiesThisMonth,
      },
      // Top-level aliases for direct component access
      total: totalSocieties,
      active: activePaidCount,
      approved: activeSocieties,
      pending: pendingSocieties,
      unpaid: unpaidApprovedCount,
      suspended: suspendedSocieties,
      rejected: rejectedSocieties,
      churned: churnedSocieties,
      trial: trialSocieties,

      // 3. Action Required
      actionRequired: {
        pendingSocieties,
        pendingAdmins: pendingAdminsCount,
        pendingKyc: pendingSocieties,
        supportTickets,
        reportedIssues,
        paymentIssues: failedPayments,
      },

      // 4. Financial & Subscription Overview
      financials: {
        mrr: activePaidCount > 0 ? calculatedMRR : 0,
        projectedMrr: calculatedMRR,
        revenueThisMonth,
        totalRevenue: totalPlatformRevenue,
        activeSubscriptions: activePaidCount,
        trialSubscriptions: trialSocietiesCount,
        expiringSubscriptions: activePaidCount > 0 ? expiringSubscriptions : 0,
        overduePayments,
        failedPayments,
        revenueLast12Months,
        plansBreakdown,
        societyMaintenanceVolume: totalMaintenancePayments,
      },

      // 5. Platform Growth
      growth: {
        newSocietiesThisMonth,
        newResidentsThisMonth: newResidentsCount,
        newUnitsThisMonth,
        newSubscriptions: newSubscriptionsThisMonth,
        churnedSocieties,
        societyGrowthRate,
        societyGrowthLast12Months,
      },

      // 6. Platform Usage
      usage: {
        activeResidents: totalResidents,
        registeredUsers: totalRegisteredUsers,
        activeLinkedUsers: activeLinkedUsersCount,
        dau,
        mau,
        visitorsLogged,
        deliveriesLogged,
        complaintsCreated,
        maintenanceTransactions,
        societyMaintenanceVolume: totalMaintenancePayments,
        notificationsSent,
        otpEmailSent,
        otpSmsSent,
        otpTotalSent,
      },

      // 7. Recent Platform Activity
      recentActivity: topRecentActivity,

      // Backward compatibility top-level fields
      total: totalSocieties,
      pending: pendingSocieties,
      active: activeSocieties,
      rejected: rejectedSocieties,
      suspended: suspendedSocieties,
      archived: archivedSocieties,
      totalUnits: effectiveUnits,
      totalUsers: totalRegisteredUsers,
    };
  }

  mapRegistrationPayload(data) {
    const {
      societyName,
      contactName,
      contactMobile,
      ...rest
    } = data;
    return {
      ...rest,
      name: societyName,
      contactPersonName: contactName,
      contactPhone: contactMobile,
    };
  }

  async registerPublic(data) {
    const { structure, ...restData } = data;
    const mapped = this.mapRegistrationPayload(restData);
    const existing = await Society.findOne({
      name: mapped.name.trim(),
      city: mapped.city.trim(),
      status: { $in: ["pending", "active"] },
    });
    if (existing) {
      throw new AppError(
        "A society with this name is already registered or awaiting review",
        409
      );
    }
    // If detailed wing structure provided, derive totalUnits from it to avoid mismatch (G=2, rest=4 cases)
    let effectiveMapped = { ...mapped };
    if (structure && Array.isArray(structure.wings) && structure.wings.length > 0) {
      let computed = 0;
      for (const w of structure.wings) {
        const hasGround = Boolean(w.hasGround);
        const groundFlats = Number.isInteger(w.groundFlats) ? w.groundFlats : (hasGround ? 2 : 0);
        const defaultPerFloor = Number.isInteger(w.defaultPerFloor) ? w.defaultPerFloor : 4;
        const floors = Number(w.floors) || 0;
        const perFloorMap = w.perFloorMap || {};
        for (let f = hasGround ? 0 : 1; f <= floors; f += 1) {
          if (f === 0) computed += groundFlats;
          else {
            const v = perFloorMap[String(f)];
            computed += v !== undefined ? Number(v) : defaultPerFloor;
          }
        }
      }
      if (computed > 0) effectiveMapped.totalUnits = computed;
    }
    const society = await Society.create({
      ...effectiveMapped,
      status: "pending",
      source: "public_registration",
    });
    if (structure && Array.isArray(structure.wings) && structure.wings.length > 0) {
      try {
        await unitService.bulkGenerateFromStructure(society._id, structure);
      } catch (e) {
        // Non-fatal: keep society, log
        console.error("bulkGenerateFromStructure failed", e.message);
      }
    }
    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange("create", society);
      else if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "create", society, id: society._id });
    } catch (_) {}
    return society;
  }

  async createByAdmin(data, adminId) {
    const society = await Society.create({
      ...this.mapRegistrationPayload(data),
      status: "active",
      isActive: true,
      source: "manual",
      approvedAt: new Date(),
      approvedBy: adminId,
      updatedBy: adminId,
    });
    let adminAccount = null;
    try {
      adminAccount = await this.onboardContactAsSocietyAdmin(society);
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError(
          "A user with this email or phone already exists. Use a different contact.",
          409
        );
      }
      throw error;
    }
    await unitService.ensureUnitsForSociety(society._id);
    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange("create", society);
      else if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "create", society, id: society._id });
      if (adminAccount?.userId && s.emitToUser) {
        s.emitToUser(String(adminAccount.userId), "society:change", { action: "create", society, id: society._id });
      }
    } catch (_) {}
    return { society, adminAccount };
  }

  normalizePhoneDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  async onboardContactAsSocietyAdmin(society) {
    const email = String(society.contactEmail || "").toLowerCase().trim();
    const phoneDigits = this.normalizePhoneDigits(society.contactPhone);

    const conditions = [];
    if (email) conditions.push({ email });
    if (phoneDigits) conditions.push({ phone: new RegExp(`${phoneDigits}$`) });
    if (conditions.length === 0) return null;

    let user = await User.findOne({ $or: conditions });
    let temporaryPassword = null;

    if (!user) {
      temporaryPassword = crypto.randomBytes(9).toString("base64url");
      user = await User.create({
        name: society.contactPersonName || "Society Admin",
        email,
        phone: society.contactPhone,
        passwordHash: temporaryPassword,
      });
    }

    const roles = Array.isArray(user.role) ? [...user.role] : user.role ? [user.role] : [];
    if (!roles.includes("society_admin")) roles.push("society_admin");
    await User.findByIdAndUpdate(user._id, { role: roles });

    // Enforce max 2 society_admin per society
    const existingMem = await Membership.findOne({ userId: user._id, societyId: society._id, isActive: true });
    const isAlreadyAdmin = existingMem && existingMem.role === "society_admin";
    if (!isAlreadyAdmin) {
      const adminCount = await Membership.countDocuments({ societyId: society._id, role: "society_admin", isActive: true });
      if (adminCount >= 2) {
        throw new AppError("Maximum 2 Society Admins allowed per society", 400);
      }
    }

    await Membership.findOneAndUpdate(
      { userId: user._id, societyId: society._id },
      {
        $set: { role: "society_admin", isActive: true, isPrimary: true },
        $setOnInsert: { joinedAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Society.findByIdAndUpdate(society._id, {
      societyAdmin: user._id,
    });

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: "society_admin",
      isPrimary: true,
      accountCreated: Boolean(temporaryPassword),
      temporaryPassword,
    };
  }

  async approve(id, adminId) {
    const current = await this.findRawById(id);
    if (!current) throw new AppError("Society not found", 404);
    if (!["pending", "rejected"].includes(current.status)) {
      throw new AppError("Only pending or rejected societies can be approved", 409);
    }

    let adminAccount = null;
    if (current.source === "public_registration" || !current.societyAdmin) {
      adminAccount = await this.onboardContactAsSocietyAdmin(current);
    }

    const society = await Society.findOneAndUpdate(
      { _id: id, status: { $in: ["pending", "rejected"] } },
      {
        $set: {
          status: "active",
          isActive: true,
          approvedAt: new Date(),
          approvedBy: adminId,
          updatedBy: adminId,
          rejectionReason: null,
        },
      },
      { new: true }
    );
    if (!society) {
      throw new AppError("Society could not be updated to active", 409);
    }

    // Ensure society admin membership is active if previously marked inactive
    if (society.societyAdmin) {
      await Membership.updateMany(
        { societyId: society._id, userId: society.societyAdmin },
        { $set: { isActive: true, role: "society_admin" } }
      );
    }

    await unitService.ensureUnitsForSociety(society._id);
    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange("approve", society);
      else if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "approve", society, id: society._id });
      // Real-time for the newly onboarded society admin (not in society room yet)
      if (adminAccount?.userId && s.emitToUser) {
        s.emitToUser(String(adminAccount.userId), "society:change", { action: "approve", society, id: society._id });
      }
    } catch (_) {}
    return { society, adminAccount };
  }

  async reject(id, adminId, reason) {
    const society = await Society.findOneAndUpdate(
      { _id: id, status: { $in: ["pending", "rejected"] } },
      {
        $set: {
          status: "rejected",
          isActive: false,
          rejectionReason: reason,
          updatedBy: adminId,
        },
      },
      { new: true }
    );
    if (!society) {
      const exists = await Society.findById(id);
      if (!exists) throw new AppError("Society not found", 404);
      throw new AppError("Only pending societies can be rejected", 409);
    }
    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange("reject", society);
      else if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "reject", society, id: society._id });
    } catch (_) {}
    return society;
  }

  async updateStatus(id, adminId, status) {
    const allowedTransitions = {
      suspend: ["active"],
      activate: ["suspended", "rejected"],
      archive: ["active", "suspended", "rejected"],
      unarchive: ["archived"],
    };
    const current = await this.findRawById(id);
    if (!current) throw new AppError("Society not found", 404);
    if (!allowedTransitions[status] || !allowedTransitions[status].includes(current.status)) {
      throw new AppError(`Cannot ${status} society with status '${current.status}'`, 409);
    }
    const updatePayload = {
      suspend: { status: "suspended", isActive: false, updatedBy: adminId },
      activate: { status: "active", isActive: true, rejectionReason: null, updatedBy: adminId },
      archive: { status: "archived", isActive: false, updatedBy: adminId },
      unarchive: { status: "active", isActive: true, updatedBy: adminId },
    }[status];

    const society = await Society.findByIdAndUpdate(id, { $set: updatePayload }, { new: true });

    // When archiving, deactivate memberships; when unarchiving, reactivate them
    if (status === "archive") {
      await Membership.updateMany({ societyId: society._id }, { $set: { isActive: false } });
    } else if (status === "unarchive") {
      await Membership.updateMany({ societyId: society._id }, { $set: { isActive: true } });
    }

    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange(status, society);
      else if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: status, society, id: society._id });
      // Also push to all members' user rooms
      if (s.emitToUser) {
        const memberships = await Membership.find({ societyId: society._id }).select("userId").lean();
        memberships.forEach((m) => {
          if (m.userId) {
            try {
              s.emitToUser(String(m.userId), "society:change", { action: status, society, id: society._id });
            } catch (_) {}
          }
        });
      }
    } catch (_) {}
    return society;
  }

  async permanentDelete(id, adminId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid society ID", 400);
    }
    const current = await this.findRawById(id);
    if (!current) throw new AppError("Society not found", 404);

    const { Unit } = require("../unit/unit.model");
    const { MaintenanceCycle, MaintenancePayment } = require("../maintenance/maintenance.model");
    const { Collection, CollectionPayment } = require("../collections/collection.model");
    const { Document } = require("../document/document.model");
    const { Complaint } = require("../complaint/complaint.model");
    const { Amenity, Booking } = require("../amenity/amenity.model");
    const { Poll, PollVote } = require("../poll/poll.model");
    const { Survey, SurveyResponse } = require("../survey/survey.model");
    const { Notice } = require("../notice/notice.model");
    const { ChatGroup, ChatMessage, DirectMessage } = require("../chat/chat.model");
    const { BadgeSeen } = require("../dashboard/dashboard.model");
    const { FamilyMember } = require("../family-member/family-member.model");

    await Promise.all([
      Unit.deleteMany({ societyId: id }),
      Membership.deleteMany({ societyId: id }),
      MaintenanceCycle.deleteMany({ societyId: id }),
      MaintenancePayment.deleteMany({ societyId: id }),
      Collection.deleteMany({ societyId: id }),
      CollectionPayment.deleteMany({ societyId: id }),
      Document.deleteMany({ societyId: id }),
      Complaint.deleteMany({ societyId: id }),
      Amenity.deleteMany({ societyId: id }),
      Booking.deleteMany({ societyId: id }),
      Poll.deleteMany({ societyId: id }),
      PollVote.deleteMany({ societyId: id }),
      Survey.deleteMany({ societyId: id }),
      SurveyResponse.deleteMany({ societyId: id }),
      Notice.deleteMany({ societyId: id }),
      ChatGroup.deleteMany({ societyId: id }),
      ChatMessage.deleteMany({ societyId: id }),
      DirectMessage.deleteMany({ societyId: id }),
      BadgeSeen.deleteMany({ societyId: id }),
      FamilyMember.deleteMany({ societyId: id }),
      Society.findByIdAndDelete(id),
    ]);

    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange("delete", { _id: id, id, name: current.name });
      if (s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "delete", id, name: current.name });
    } catch (_) {}

    return { id, name: current.name, deleted: true };
  }

  async getRolePermissions(societyId) {
    const society = await Society.findById(societyId).select("rolePermissions");
    return society?.rolePermissions || {};
  }

  async updateRolePermissions(societyId, newPermissions, userId) {
    const { PERMISSIONS } = require("../../shared/permissions");
    const { SOCIETY_ROLES } = require("../../shared/types");
    const allKeys = PERMISSIONS.map((p) => p.key);
    const sanitized = {};
    for (const [role, perms] of Object.entries(newPermissions || {})) {
      if (!SOCIETY_ROLES.includes(role)) continue;
      if (["society_admin", "super_admin"].includes(role)) {
        sanitized[role] = allKeys;
      } else {
        sanitized[role] = (Array.isArray(perms) ? perms : []).filter((p) => allKeys.includes(p));
      }
    }
    sanitized["society_admin"] = allKeys;
    sanitized["super_admin"] = allKeys;
    const society = await Society.findByIdAndUpdate(
      societyId,
      { rolePermissions: sanitized, updatedBy: userId },
      { new: true, runValidators: true }
    ).select("rolePermissions");
    try {
      const s = require("../../socket");
      if (s.emitToSociety) s.emitToSociety(String(societyId), "permissions:change", { societyId, rolePermissions: society.rolePermissions });
      if (s.emitToSuperAdmins) s.emitToSuperAdmins("permissions:change", { societyId, rolePermissions: society.rolePermissions });
    } catch (_) {}
    return society.rolePermissions;
  }

  async findRawById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Society.findById(id);
  }

  async create(data) {
    return Society.create(data);
  }

  async update(id, data) {
    const society = await Society.findByIdAndUpdate(
      id,
      { ...data, updatedBy: data.updatedBy },
      { new: true, runValidators: true }
    );
    try {
      const s = require("../../socket");
      if (society && s.emitSocietyChange) s.emitSocietyChange("update", society);
      else if (society && s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "update", society, id: society._id });
    } catch (_) {}
    return society;
  }

  async paySubscription(societyId, data = {}, userId = null) {
    const society = await this.findRawById(societyId);
    if (!society) {
      throw new AppError("Society not found", 404);
    }
    const requestedPlan = data.plan || society.subscriptionPlan || "starter";
    const requestedBillingCycle = data.billingCycle || society.subscriptionBilling || "monthly";
    const units = Number(society.totalUnits || data.units || 1);
    const nowPay = new Date();

    const currentPlan = society.subscriptionPlan || "starter";
    const currentRate = PLAN_RATES[currentPlan] || 6;
    const requestedRate = PLAN_RATES[requestedPlan] || 6;

    // Check if society has an active, valid paid subscription with future expiry
    let existingExpiry = null;
    if (society.isSubscriptionPaid && society.subscriptionExpiresAt) {
      existingExpiry = new Date(society.subscriptionExpiresAt);
    } else if (society.isSubscriptionPaid) {
      const started = society.subscriptionStartedAt ? new Date(society.subscriptionStartedAt) : new Date(society.createdAt || nowPay);
      const prevBilling = society.subscriptionBilling || "monthly";
      const derivedExpiry = new Date(started);
      if (prevBilling === "yearly") derivedExpiry.setFullYear(derivedExpiry.getFullYear() + 1);
      else derivedExpiry.setMonth(derivedExpiry.getMonth() + 1);
      existingExpiry = derivedExpiry;
    }

    const hasActiveSubscription = existingExpiry && existingExpiry > nowPay;
    const msLeft = hasActiveSubscription ? (existingExpiry.getTime() - nowPay.getTime()) : 0;
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    const isMidCycle = hasActiveSubscription && daysLeft > 7;

    let plan = requestedPlan;
    let billingCycle = requestedBillingCycle;
    let ratePerUnit = requestedRate;
    let amount = 0;
    let baseDate = nowPay;
    let expiresAt = null;
    let paymentType = "initial"; // "initial" | "renewal" | "upgrade"
    let notes = data.isDemoSimulation ? "Demo simulation payment" : "Online card/UPI payment";

    if (isMidCycle) {
      // MID-CYCLE FLOW
      if (requestedRate > currentRate) {
        // Legitimate Mid-Cycle Upgrade (e.g. Basic -> Standard/Premium)
        paymentType = "upgrade";
        plan = requestedPlan;
        billingCycle = society.subscriptionBilling || "monthly"; // Keep cycle during remaining duration

        // Proration math based on remaining days
        const currentDailyRate = (units * currentRate) / 30; // Daily burn of old plan
        const newDailyRate = (units * requestedRate) / 30;     // Daily burn of new plan

        const unusedCredit = Math.round(currentDailyRate * daysLeft);
        const newPeriodCost = Math.round(newDailyRate * daysLeft);
        const upgradeDifference = Math.max(1, newPeriodCost - unusedCredit);

        amount = upgradeDifference;
        baseDate = nowPay;
        expiresAt = existingExpiry; // Expiry date remains unchanged

        notes = `Mid-cycle plan upgrade from ${currentPlan} to ${requestedPlan} for remaining ${daysLeft} days. Credit: ₹${unusedCredit}, New Cost: ₹${newPeriodCost}`;
      } else if (requestedRate < currentRate) {
        // Mid-cycle downgrade attempt is not allowed mid-cycle
        throw new AppError("Downgrading plan is only available at the time of renewal (within 7 days of expiry).", 400);
      } else {
        // Same plan attempt mid-cycle (extension not needed)
        throw new AppError("Your subscription is already active and healthy. Advance plan extensions are not required.", 400);
      }
    } else {
      // INITIAL OR RENEWAL FLOW (New subscription, expired, or <= 7 days left)
      paymentType = hasActiveSubscription ? "renewal" : "initial";
      plan = requestedPlan;
      billingCycle = requestedBillingCycle;
      ratePerUnit = requestedRate;
      const multiplier = billingCycle === "yearly" ? 12 : 1;
      amount = units * ratePerUnit * multiplier;

      if (hasActiveSubscription) {
        baseDate = existingExpiry;
      } else {
        baseDate = nowPay;
      }

      expiresAt = new Date(baseDate);
      if (billingCycle === "yearly") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }
    }

    const payment = await SubscriptionPayment.create({
      societyId: society._id,
      plan,
      billingCycle,
      units,
      ratePerUnit,
      amount,
      status: "paid",
      gateway: data.isDemoSimulation ? "Demo Simulator" : (data.gateway || "Razorpay"),
      transactionId: data.transactionId || `SUB-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      paidAt: nowPay,
      periodStart: baseDate,
      periodEnd: expiresAt,
      notes,
    });

    society.isSubscriptionPaid = true;
    society.subscriptionPlan = plan;
    society.subscriptionBilling = billingCycle;
    society.subscriptionStartedAt = society.subscriptionStartedAt || nowPay;
    society.subscriptionExpiresAt = expiresAt;
    await society.save();

    try {
      const s = require("../../socket");
      if (s.emitSocietyChange) s.emitSocietyChange("update", society);
      if (s.emitToSuperAdmins) s.emitToSuperAdmins("subscription:paid", { payment, society, paymentType });
    } catch (_) {}

    return { society, payment, paymentType, proratedDetails: paymentType === "upgrade" ? { daysLeft, amount } : null };
  }

  async getHistoricalAnalytics({ startYear, endYear }) {
    const { MaintenancePayment } = require("../maintenance/maintenance.model");
    const { SubscriptionPayment } = require("./subscription-payment.model");
    const now = new Date();
    const currentYear = now.getFullYear();

    const fromYear = parseInt(startYear, 10) || currentYear - 2; // Default last 3 years e.g. 2024
    const toYear = parseInt(endYear, 10) || currentYear; // e.g. 2026

    const startDate = new Date(fromYear, 0, 1);
    const endDate = new Date(toYear, 11, 31, 23, 59, 59, 999);

    // Fetch all societies, genuine subscription sales, and resident maintenance payments
    const [allSocieties, subscriptionAgg, paymentsAgg] = await Promise.all([
      Society.find(
        {},
        "name status city totalUnits subscriptionPlan subscriptionBilling createdAt"
      ).lean(),
      SubscriptionPayment.aggregate([
        {
          $match: {
            status: "paid",
            $or: [
              { paidAt: { $gte: startDate, $lte: endDate } },
              { createdAt: { $gte: startDate, $lte: endDate } },
            ],
          },
        },
        {
          $group: {
            _id: {
              year: { $year: { $ifNull: ["$paidAt", "$createdAt"] } },
              month: { $month: { $ifNull: ["$paidAt", "$createdAt"] } },
            },
            totalRevenue: { $sum: "$amount" },
            transactionCount: { $sum: 1 },
          },
        },
      ]).catch(() => []),
      MaintenancePayment.aggregate([
        {
          $match: {
            gatewayStatus: { $in: ["paid", "cash"] },
            $or: [
              { paidOn: { $gte: startDate, $lte: endDate } },
              { createdAt: { $gte: startDate, $lte: endDate } },
            ],
          },
        },
        {
          $group: {
            _id: {
              year: { $year: { $ifNull: ["$paidOn", "$createdAt"] } },
              month: { $month: { $ifNull: ["$paidOn", "$createdAt"] } },
            },
            totalRevenue: { $sum: "$amount" },
            transactionCount: { $sum: 1 },
          },
        },
      ]).catch(() => []),
    ]);

    const subscriptionMap = new Map();
    (subscriptionAgg || []).forEach((p) => {
      if (p._id?.year && p._id?.month) {
        subscriptionMap.set(`${p._id.year}-${p._id.month}`, {
          revenue: p.totalRevenue || 0,
          transactions: p.transactionCount || 0,
        });
      }
    });

    const paymentMap = new Map();
    (paymentsAgg || []).forEach((p) => {
      if (p._id?.year && p._id?.month) {
        paymentMap.set(`${p._id.year}-${p._id.month}`, {
          revenue: p.totalRevenue || 0,
          transactions: p.transactionCount || 0,
        });
      }
    });

    const monthlyTimeline = [];
    let cumulativeSocieties = 0;
    let cumulativeUnits = 0;

    // Iterate through every month in the specified range
    for (let y = fromYear; y <= toYear; y++) {
      const maxMonth = (y === currentYear) ? now.getMonth() : 11;
      for (let m = 0; m <= maxMonth; m++) {
        const monthStart = new Date(y, m, 1);
        const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
        const monthLabel = monthStart.toLocaleDateString("en-US", { month: "short" });
        const monthNum = m + 1;

        // Societies registered up to this month
        const societiesUpToMonth = (allSocieties || []).filter(
          (s) => new Date(s.createdAt) <= monthEnd
        );
        cumulativeSocieties = societiesUpToMonth.length;
        cumulativeUnits = societiesUpToMonth.reduce((sum, s) => sum + (s.totalUnits || 0), 0);

        // Societies joined in this specific month
        const societiesJoinedThisMonth = (allSocieties || []).filter(
          (s) => new Date(s.createdAt) >= monthStart && new Date(s.createdAt) <= monthEnd
        );
        const newSocieties = societiesJoinedThisMonth.length;
        const newUnits = societiesJoinedThisMonth.reduce((sum, s) => sum + (s.totalUnits || 0), 0);

        // Genuine subscription and maintenance payments recorded
        const subData = subscriptionMap.get(`${y}-${monthNum}`) || { revenue: 0, transactions: 0 };
        const payData = paymentMap.get(`${y}-${monthNum}`) || { revenue: 0, transactions: 0 };

        monthlyTimeline.push({
          periodKey: `${y}-${String(monthNum).padStart(2, "0")}`,
          year: y,
          month: monthLabel,
          monthNum,
          label: `${monthLabel} ${y}`,
          totalRevenue: subData.revenue,
          saasRevenue: subData.revenue,
          paymentRevenue: payData.revenue,
          transactionCount: payData.transactions,
          newSocieties,
          cumulativeSocieties,
          newUnits,
          cumulativeUnits,
        });
      }
    }

    // High level summary metrics
    const totalHistoricalRevenue = monthlyTimeline.reduce((acc, m) => acc + m.totalRevenue, 0);
    const totalTransactions = monthlyTimeline.reduce((acc, m) => acc + m.transactionCount, 0);
    const peakRevenue = Math.max(0, ...monthlyTimeline.map((m) => m.totalRevenue));
    const avgMonthlyRevenue = monthlyTimeline.length > 0 ? Math.round(totalHistoricalRevenue / monthlyTimeline.length) : 0;

    const earliestSocietyYear = (allSocieties || []).reduce((earliest, s) => {
      const yr = s.createdAt ? new Date(s.createdAt).getFullYear() : currentYear;
      return yr < earliest ? yr : earliest;
    }, currentYear);
    const minYear = Math.min(earliestSocietyYear, currentYear - 2);
    const availableYears = [];
    for (let y = minYear; y <= currentYear; y++) {
      availableYears.push(y);
    }

    return {
      timeRange: {
        fromYear,
        toYear,
        availableYears,
      },
      summary: {
        totalRevenue: totalHistoricalRevenue,
        avgMonthlyRevenue,
        peakRevenue,
        totalTransactions,
        currentSocieties: cumulativeSocieties,
        currentUnits: cumulativeUnits,
      },
      timeline: monthlyTimeline,
    };
  }

  async deactivate(id) {
    const society = await Society.findByIdAndUpdate(
      id,
      { isActive: false, status: "suspended" },
      { new: true }
    );
    try {
      const s = require("../../socket");
      if (society && s.emitSocietyChange) s.emitSocietyChange("deactivate", society);
      else if (society && s.emitToSuperAdmins) s.emitToSuperAdmins("society:change", { action: "deactivate", society, id: society._id });
    } catch (_) {}
    return society;
  }
}

module.exports = new SocietyService();
