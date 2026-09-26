const maintenanceService = require("./maintenance.service");

class MaintenanceController {
  async createCycle(req, res, next) {
    try {
      const cycle = await maintenanceService.createCycle(
        req.societyId,
        req.userId,
        req.body
      );
      try {
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        const cycleIdStr = String(cycle._id || cycle.id);
        const amountStr = cycle.amount ? `₹${Number(cycle.amount).toLocaleString('en-IN')}` : 'dues';
        pushNotificationService.sendPushToSociety({
          societyId: req.societyId,
          title: "💳 New Maintenance Dues",
          body: `Maintenance bill of ${amountStr} generated. Due date: ${cycle.dueDate ? new Date(cycle.dueDate).toLocaleDateString('en-IN') : '—'}`,
          data: { screen: "PayMaintenance", cycleId: cycleIdStr },
        });
      } catch (_) {}
      res.status(201).json({
        success: true,
        data: maintenanceService.mapCycle(cycle.toObject()),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCycle(req, res, next) {
    try {
      const cycle = await maintenanceService.updateCycle(
        req.societyId,
        req.params.cycleId,
        req.body
      );
      res.json({
        success: true,
        data: maintenanceService.mapCycle(cycle.toObject ? cycle.toObject() : cycle),
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCycle(req, res, next) {
    try {
      const result = await maintenanceService.deleteCycle(
        req.societyId,
        req.params.cycleId
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async listCycles(req, res, next) {
    try {
      const wing = req.query.wing !== undefined ? (req.query.wing ? String(req.query.wing).trim().toUpperCase() : null) : undefined;
      const cycles = await maintenanceService.listCycles(req.societyId, wing);

      let userUnitsMap = new Map();
      if (req.membership?.units?.length) {
        userUnitsMap = await maintenanceService.getUserUnitsForCycles(
          req.societyId,
          cycles,
          req.userId,
          req.membership
        );
      }

      res.json({
        success: true,
        data: cycles.map((c) => ({
          ...maintenanceService.mapCycle(c),
          myUnits: userUnitsMap.get(String(c._id)) || [],
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  async getLatestCycle(req, res, next) {
    try {
      const wing = req.query.wing !== undefined ? (req.query.wing ? String(req.query.wing).trim().toUpperCase() : null) : undefined;
      let cycle = await maintenanceService.getLatestCycle(req.societyId, wing);
      // If resident requested latest cycle without wing parameter, but has assigned units with a wing, find the latest cycle matching their unit's wing or society-wide
      if (!cycle && wing === undefined && req.membership?.units?.length) {
        const { Unit } = require("../unit/unit.model");
        const userUnits = await Unit.find({ _id: { $in: req.membership.units }, isActive: true }).select("block").lean();
        const userWings = [...new Set(userUnits.map((u) => u.block).filter(Boolean))];
        if (userWings.length > 0) {
          cycle = await maintenanceService.getLatestCycle(req.societyId, userWings[0]);
        }
      }
      if (!cycle) {
        return res.json({ success: true, data: null });
      }
      const allUnits = await maintenanceService.getCycleUnits(
        req.societyId,
        cycle,
        { allWings: true }
      );
      const myUnitIds = (req.membership.units || []).map((id) => String(id));
      const userIdStr = String(req.userId);
      const mineRaw = myUnitIds.length
        ? allUnits.filter((u) => myUnitIds.includes(String(u.unitId)))
        : [];
      // FIX: DB-driven isOwner - compare unit ownerId/tenantId with current userId (from DB)
      const mine = mineRaw.map((u) => ({
        ...u,
        isOwner: u.ownerId ? String(u.ownerId) === userIdStr : false,
        isTenant: u.tenantId ? String(u.tenantId) === userIdStr : false,
        // houseRole from DB ownership, not hardcoded
        houseRole: u.ownerId && String(u.ownerId) === userIdStr ? "owner" : u.tenantId && String(u.tenantId) === userIdStr ? "tenant" : req.membership.role,
      }));
      res.json({
        success: true,
        data: {
          ...maintenanceService.mapCycle(cycle),
          myUnits: mine,
          totalUnits: allUnits.length,
          settledCount: allUnits.filter((u) =>
            ["paid", "late_paid"].includes(u.status)
          ).length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCycleUnits(req, res, next) {
    try {
      const cycle = await maintenanceService.getCycle(
        req.societyId,
        req.params.cycleId
      );
      const allWings =
        req.query.allWings === "true" ||
        req.query.scope === "society" ||
        req.query.scope === "all";
      const units = await maintenanceService.getCycleUnits(
        req.societyId,
        cycle,
        { allWings }
      );
      res.json({ success: true, data: units });
    } catch (error) {
      next(error);
    }
  }

  async getCycleUnitDetail(req, res, next) {
    try {
      const cycle = await maintenanceService.getCycle(
        req.societyId,
        req.params.cycleId
      );
      const record = await maintenanceService.getCycleUnitDetail(
        req.societyId,
        cycle,
        req.params.unitId,
        req.membership
      );
      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }

  async getUnitHistory(req, res, next) {
    try {
      const history = await maintenanceService.getUnitHistory(
        req.societyId,
        req.params.unitId,
        req.membership
      );
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  async recordPayment(req, res, next) {
    try {
      const cycle = await maintenanceService.getCycle(
        req.societyId,
        req.params.cycleId
      );
      await maintenanceService.recordPayment(
        req.societyId,
        cycle,
        req.params.unitId,
        req.userId,
        req.body
      );
      const record = await maintenanceService.getCycleUnitDetail(
        req.societyId,
        cycle,
        req.params.unitId,
        req.membership
      );
      try {
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        const { Unit } = require("../unit/unit.model");
        const unitDoc = await Unit.findById(req.params.unitId).select("ownerId tenantId label").lean();
        const recipientUserIds = [unitDoc?.ownerId, unitDoc?.tenantId, req.userId].filter(Boolean).map(String);
        pushNotificationService.sendPushToUsers({
          userIds: recipientUserIds,
          title: "🧾 Maintenance Payment Recorded",
          body: `Payment cleared for House ${unitDoc?.label || 'Unit'}. Official receipt generated.`,
          data: { screen: "MaintenanceDetail", cycleId: String(req.params.cycleId), unitId: String(req.params.unitId) },
        });
      } catch (_) {}
      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }

  async createRazorpayOrder(req, res, next) {
    try {
      const cycle = await maintenanceService.getCycle(
        req.societyId,
        req.params.cycleId
      );
      // Only assigned member or admin/permission can create order
      const { Society } = require("../society/society.model");
      const { hasPermission } = require("../../shared/permissions");
      let isAdmin = ["super_admin", "society_admin"].includes(req.membership.role);
      if (!isAdmin) {
        try {
          const society = await Society.findById(req.societyId).select("rolePermissions").lean();
          isAdmin = hasPermission(req.membership.role, "manage_maintenance", society?.rolePermissions);
        } catch {}
      }
      const myUnitIds = (req.membership.units || []).map((id) => String(id));
      if (!isAdmin && !myUnitIds.includes(String(req.params.unitId))) {
        return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "This house is not assigned to you" } });
      }
      const months = Number(req.body?.months || req.body?.advanceMonths || 1);
      const order = await maintenanceService.createRazorpayOrder(
        req.societyId,
        cycle,
        req.params.unitId,
        req.userId,
        months
      );
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  async verifyRazorpayPayment(req, res, next) {
    try {
      const cycle = await maintenanceService.getCycle(
        req.societyId,
        req.params.cycleId
      );
      const updated = await maintenanceService.verifyRazorpayPayment(
        req.societyId,
        cycle,
        req.params.unitId,
        req.userId,
        req.body
      );
      const record = await maintenanceService.getCycleUnitDetail(
        req.societyId,
        cycle,
        req.params.unitId,
        req.membership
      );
      try {
        const { pushNotificationService } = require("../../shared/services/pushNotification.service");
        const { Unit } = require("../unit/unit.model");
        const unitDoc = await Unit.findById(req.params.unitId).select("ownerId tenantId label").lean();
        const recipientUserIds = [unitDoc?.ownerId, unitDoc?.tenantId, req.userId].filter(Boolean).map(String);
        pushNotificationService.sendPushToUsers({
          userIds: recipientUserIds,
          title: "💳 Online Maintenance Payment Successful",
          body: `Payment cleared for House ${unitDoc?.label || 'Unit'}. Official receipt generated.`,
          data: { screen: "MaintenanceDetail", cycleId: String(req.params.cycleId), unitId: String(req.params.unitId) },
        });
      } catch (_) {}
      res.json({ success: true, data: { payment: updated, record } });
    } catch (error) {
      next(error);
    }
  }

  async getReceipt(req, res, next) {
    try {
      const cycle = await maintenanceService.getCycle(
        req.societyId,
        req.params.cycleId
      );
      const receipt = await maintenanceService.getReceipt(
        req.societyId,
        cycle,
        req.params.unitId,
        req.membership
      );
      res.json({ success: true, data: receipt });
    } catch (error) {
      next(error);
    }
  }

  async removePayment(req, res, next) {
    try {
      const cycle = await maintenanceService.getCycle(
        req.societyId,
        req.params.cycleId
      );
      await maintenanceService.removePayment(
        req.societyId,
        cycle,
        req.params.unitId
      );
      const record = await maintenanceService.getCycleUnitDetail(
        req.societyId,
        cycle,
        req.params.unitId,
        req.membership
      );
      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req, res, next) {
    try {
      const cycle = await maintenanceService.getCycle(req.societyId, req.params.cycleId);
      const buffer = await maintenanceService.generateExcelBuffer(req.societyId, cycle);
      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const period = cycle.durationMonths > 1
        ? `${MONTHS[cycle.month - 1]}${cycle.year}-${MONTHS[(cycle.month - 1 + cycle.durationMonths - 1) % 12]}${cycle.year + Math.floor((cycle.month - 1 + cycle.durationMonths - 1)/12)}`
        : `${MONTHS[cycle.month - 1]}-${cycle.year}`;
      const safePeriod = period.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Maintenance_${safePeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async updateCycle(req, res, next) {
    try {
      const cycle = await maintenanceService.updateCycle(req.societyId, req.params.cycleId, req.body);
      res.json({ success: true, data: cycle });
    } catch (error) {
      next(error);
    }
  }

  async deleteCycle(req, res, next) {
    try {
      const result = await maintenanceService.deleteCycle(req.societyId, req.params.cycleId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MaintenanceController();
