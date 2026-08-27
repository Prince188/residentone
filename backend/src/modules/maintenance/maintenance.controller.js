const maintenanceService = require("./maintenance.service");

class MaintenanceController {
  async createCycle(req, res, next) {
    try {
      const cycle = await maintenanceService.createCycle(
        req.societyId,
        req.userId,
        req.body
      );
      res.status(201).json({
        success: true,
        data: maintenanceService.mapCycle(cycle.toObject()),
      });
    } catch (error) {
      next(error);
    }
  }

  async listCycles(req, res, next) {
    try {
      const cycles = await maintenanceService.listCycles(req.societyId);
      res.json({
        success: true,
        data: cycles.map((c) => maintenanceService.mapCycle(c)),
      });
    } catch (error) {
      next(error);
    }
  }

  async getLatestCycle(req, res, next) {
    try {
      const cycle = await maintenanceService.getLatestCycle(req.societyId);
      if (!cycle) {
        return res.json({ success: true, data: null });
      }
      const allUnits = await maintenanceService.getCycleUnits(
        req.societyId,
        cycle
      );
      const myUnitIds = (req.membership.units || []).map((id) => String(id));
      const mine = myUnitIds.length
        ? allUnits.filter((u) => myUnitIds.includes(String(u.unitId)))
        : [];
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
      const units = await maintenanceService.getCycleUnits(
        req.societyId,
        cycle
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
      // Only assigned member or admin can create order
      const isAdmin = ["super_admin", "society_admin"].includes(req.membership.role);
      const myUnitIds = (req.membership.units || []).map((id) => String(id));
      if (!isAdmin && !myUnitIds.includes(String(req.params.unitId))) {
        return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "This house is not assigned to you" } });
      }
      const order = await maintenanceService.createRazorpayOrder(
        req.societyId,
        cycle,
        req.params.unitId,
        req.userId
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
}

module.exports = new MaintenanceController();
