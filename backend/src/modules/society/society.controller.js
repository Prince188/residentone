const societyService = require("./society.service");
const membershipService = require("../membership/membership.service");

class SocietyController {
  async registerPublic(req, res, next) {
    try {
      const society = await societyService.registerPublic(req.body);
      res.status(201).json({
        success: true,
        data: {
          societyId: society._id,
          status: society.status,
          name: society.name,
          createdAt: society.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const society = await societyService.findById(req.params.id);
      if (!society) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Society not found" },
        });
      }

      if (req.accountRole !== "super_admin") {
        const membership = await membershipService.findByUserAndSociety(
          req.userId,
          req.params.id
        );
        if (!membership) {
          return res.status(403).json({
            success: false,
            error: { code: "FORBIDDEN", message: "You do not have access to this society" },
          });
        }
      }

      res.json({ success: true, data: society });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const societies = await societyService.listForAdmin(req.query);
      res.json({ success: true, data: societies });
    } catch (error) {
      next(error);
    }
  }

  async stats(req, res, next) {
    try {
      const stats = await societyService.stats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async adminCreate(req, res, next) {
    try {
      const { society, adminAccount } = await societyService.createByAdmin(
        req.body,
        req.userId
      );
      const payload = { success: true, data: society };
      if (adminAccount) payload.adminAccount = adminAccount;
      res.status(201).json(payload);
    } catch (error) {
      next(error);
    }
  }

  async approve(req, res, next) {
    try {
      const { society, adminAccount } = await societyService.approve(
        req.params.id,
        req.userId
      );
      const payload = { success: true, data: society };
      if (adminAccount) payload.adminAccount = adminAccount;
      res.json(payload);
    } catch (error) {
      next(error);
    }
  }

  async reject(req, res, next) {
    try {
      const society = await societyService.reject(
        req.params.id,
        req.userId,
        req.body.reason
      );
      res.json({ success: true, data: society });
    } catch (error) {
      next(error);
    }
  }

  async suspend(req, res, next) {
    try {
      const society = await societyService.updateStatus(
        req.params.id,
        req.userId,
        "suspend"
      );
      res.json({ success: true, data: society });
    } catch (error) {
      next(error);
    }
  }

  async activate(req, res, next) {
    try {
      const society = await societyService.updateStatus(
        req.params.id,
        req.userId,
        "activate"
      );
      res.json({ success: true, data: society });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const society = await societyService.update(req.params.id, {
        ...req.body,
        updatedBy: req.userId,
      });
      if (!society) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Society not found" },
        });
      }
      res.json({ success: true, data: society });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req, res, next) {
    try {
      const society = await societyService.deactivate(req.params.id);
      if (!society) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Society not found" },
        });
      }
      res.json({ success: true, data: society });
    } catch (error) {
      next(error);
    }
  }

  async getPermissions(req, res, next) {
    try {
      const perms = await societyService.getRolePermissions(req.societyId);
      res.json({ success: true, data: perms });
    } catch (error) {
      next(error);
    }
  }

  async updatePermissions(req, res, next) {
    try {
      const perms = await societyService.updateRolePermissions(req.societyId, req.body.permissions, req.userId);
      res.json({ success: true, data: perms });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SocietyController();
