const membershipService = require("./membership.service");
const { ROLE_HIERARCHY } = require("../../shared/types");

class MembershipController {
  async mySocieties(req, res, next) {
    try {
      const societies = await membershipService.findUserSocieties(req.userId);
      res.json({ success: true, data: societies });
    } catch (error) {
      next(error);
    }
  }

  async directory(req, res, next) {
    try {
      const members = await membershipService.getDirectory(req.societyId, req.query);
      res.json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const societyId = req.societyId || req.params.societyId;
      const members = await membershipService.findBySociety(societyId);
      res.json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }

  async addMember(req, res, next) {
    try {
      const { userId, role, roles, unitIds, assignedWings } = req.body;
      let requestedRoles = [];
      if (Array.isArray(roles) && roles.length > 0) {
        requestedRoles = roles;
      } else if (role) {
        requestedRoles = [role];
      }
      requestedRoles = [...new Set(requestedRoles.filter(Boolean))];

      const membership = await membershipService.create({
        userId,
        societyId: req.societyId,
        role: requestedRoles[0] || role || "resident",
        roles: requestedRoles,
        assignedWings: Array.isArray(assignedWings)
          ? assignedWings.map((w) => String(w).trim().toUpperCase())
          : undefined,
      });
      if (Array.isArray(unitIds) && unitIds.length > 0) {
        await membershipService.addUnitsToMembership(membership._id, unitIds);
      }
      res.status(201).json({ success: true, data: membership });
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req, res, next) {
    try {
      const { role, roles, additionalRoles, assignedWings, action, wing } = req.body;
      const membership = await membershipService.findById(req.params.memberId);
      if (!membership) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Membership not found" },
        });
      }

      // Support wing unassign via action
      if (action === "removeWing" && wing) {
        const updated = await membershipService.removeWingAdminRole(req.params.memberId, wing);
        return res.json({ success: true, data: updated });
      }

      // Consolidate requested roles
      let requestedRoles = [];
      if (Array.isArray(roles) && roles.length > 0) {
        requestedRoles = roles;
      } else if (role) {
        requestedRoles = [role, ...(Array.isArray(additionalRoles) ? additionalRoles : [])];
      }
      requestedRoles = [...new Set(requestedRoles.filter(Boolean))];

      const myLevel = ROLE_HIERARCHY[req.role] || 0;
      for (const r of requestedRoles) {
        const targetLevel = ROLE_HIERARCHY[r] || 0;
        if (targetLevel > myLevel) {
          return res.status(403).json({
            success: false,
            error: { code: "FORBIDDEN", message: `Cannot promote user to ${r} (exceeds your permissions)` },
          });
        }
      }

      const updated = await membershipService.updateRole(req.params.memberId, {
        role: requestedRoles[0] || role,
        roles: requestedRoles,
        additionalRoles: requestedRoles.slice(1),
        assignedWings,
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      const membership = await membershipService.findById(req.params.memberId);
      if (!membership) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Membership not found" },
        });
      }

      if (["super_admin", "society_admin"].includes(membership.role)) {
        const adminCount = await membershipService.countAdmins(req.params.societyId);
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            error: { code: "LAST_ADMIN", message: "Cannot remove the last admin" },
          });
        }
      }

      await membershipService.deactivate(req.params.memberId);
      res.json({ success: true, data: { message: "Member removed" } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MembershipController();
