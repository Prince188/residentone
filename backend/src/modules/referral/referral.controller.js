const referralService = require("./referral.service");

async function validateCode(req, res, next) {
  try {
    const { code } = req.body;
    const result = await referralService.validateReferralCode(code, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
}

async function getMyReferrals(req, res, next) {
  try {
    const data = await referralService.getMyReferralInfo(req.user._id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getAllReferralsAdmin(req, res, next) {
  try {
    const data = await referralService.getAllReferralsAdmin(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function dispatchGiftAdmin(req, res, next) {
  try {
    const data = await referralService.dispatchGiftAdmin(req.params.id, req.body);
    res.json({ success: true, data, message: "Gift status updated successfully" });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
}

async function getSettings(req, res, next) {
  try {
    const data = await referralService.getOrCreateReferralSetting();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const data = await referralService.updateReferralSettings(req.body);
    res.json({ success: true, data, message: "Referral settings updated successfully" });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
}

module.exports = {
  validateCode,
  getMyReferrals,
  getAllReferralsAdmin,
  dispatchGiftAdmin,
  getSettings,
  updateSettings,
};
