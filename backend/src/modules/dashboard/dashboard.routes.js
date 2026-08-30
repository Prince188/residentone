const express = require("express");
const dashboardController = require("./dashboard.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const membershipService = require("../membership/membership.service");

const router = express.Router();

// Optional society resolver - does not error if no society
async function optionalSociety(req, _res, next) {
  const sid = req.headers["x-society-id"] || req.query.societyId || req.params.societyId;
  if (!sid) return next();
  try {
    const membership = await membershipService.findByUserAndSociety(req.userId, sid);
    if (membership) {
      req.societyId = membership.societyId.toString();
      req.membership = membership;
      req.role = membership.role;
    }
  } catch (_) {}
  next();
}

router.use(authenticate);

router.get("/badges", optionalSociety, (req, res, next) => dashboardController.getBadges(req, res, next));
router.post("/badges/seen", optionalSociety, (req, res, next) => dashboardController.markSeen(req, res, next));
router.post("/badges/seen-all", optionalSociety, (req, res, next) => dashboardController.markAllSeen(req, res, next));

module.exports = router;
