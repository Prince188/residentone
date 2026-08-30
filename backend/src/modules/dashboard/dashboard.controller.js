const dashboardService = require("./dashboard.service");
const { AppError } = require("../../shared/utils/errors");

class DashboardController {
  async getBadges(req, res, next) {
    try {
      const societyId = req.societyId || req.headers["x-society-id"] || req.query.societyId || null;
      const userId = req.userId;

      // If societyId header provided but not yet resolved, try to fetch membership
      let membership = req.membership || null;
      if (societyId && !membership) {
        try {
          const membershipService = require("../membership/membership.service");
          membership = await membershipService.findByUserAndSociety(userId, societyId);
        } catch (_) {}
      }

      const counts = await dashboardService.computeCounts({ societyId, userId, membership, rolePermissions: membership ? null : null });
      res.json({ success: true, data: counts });
    } catch (error) {
      next(error);
    }
  }

  async markSeen(req, res, next) {
    try {
      const societyId = req.societyId || req.headers["x-society-id"] || req.body.societyId || null;
      const userId = req.userId;
      let { feature, features } = req.body;

      // Accept single feature or array, also support 'to' path mapping
      if (!feature && !features && req.body.to) {
        feature = req.body.to;
      }

      let list = [];
      if (features && Array.isArray(features)) list = features;
      else if (feature) list = [feature];
      else if (req.query.feature) list = [req.query.feature];
      else if (req.query.features) list = String(req.query.features).split(",");
      else throw new AppError("feature is required", 400);

      // Normalize: map route paths to feature keys (only polls, survey, complaint)
      const PATH_TO_FEATURE = {
        "/complaints": "complaints",
        "/complaints/new": "complaints",
        "/polls": "polls",
        "/polls/new": "polls",
        "/surveys": "surveys",
        "/surveys/new": "surveys",
      };

      const normalized = list
        .map((f) => {
          const t = String(f).trim().toLowerCase();
          if (PATH_TO_FEATURE[t]) return PATH_TO_FEATURE[t];
          // also handle feature keys directly
          if (dashboardService.FEATURES.includes(t)) return t;
          // try without leading slash
          if (PATH_TO_FEATURE[`/${t}`]) return PATH_TO_FEATURE[`/${t}`];
          return t;
        })
        .filter(Boolean);

      // Deduplicate
      const uniq = [...new Set(normalized)].filter((f) => dashboardService.FEATURES.includes(f));
      if (uniq.length === 0) throw new AppError("Invalid feature(s)", 400);

      // For global features, societyId should be null (none for current limited set)
      const globalFeatures = [];
      const groups = {};
      uniq.forEach((f) => {
        const sid = globalFeatures.includes(f) ? null : societyId || null;
        const key = `${sid || "global"}::${f}`;
        if (!groups[key]) groups[key] = { societyId: sid, features: [] };
        groups[key].features.push(f);
      });

      const results = [];
      for (const g of Object.values(groups)) {
        const now = await dashboardService.setSeen(userId, g.societyId, g.features);
        results.push({ societyId: g.societyId, features: g.features, lastSeenAt: now });
      }

      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }

  async markAllSeen(req, res, next) {
    try {
      const societyId = req.societyId || req.headers["x-society-id"] || null;
      const userId = req.userId;
      const allSociety = ["complaints", "polls", "surveys"];
      await dashboardService.setSeen(userId, societyId || null, allSociety);
      res.json({ success: true, data: { message: "All badges cleared" } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
