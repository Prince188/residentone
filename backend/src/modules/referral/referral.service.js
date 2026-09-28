const { Referral } = require("./referral.model");
const { ReferralSetting } = require("./referral-setting.model");
const { User } = require("../user/user.model");
const crypto = require("crypto");

async function getOrCreateReferralSetting() {
  let setting = await ReferralSetting.findOne();
  if (!setting) {
    setting = await ReferralSetting.create({
      discountType: "FLAT",
      discountValue: 500,
      isReferralActive: true,
    });
  }
  return setting;
}

async function validateReferralCode(code, currentUser = null) {
  if (!code || typeof code !== "string") {
    throw new Error("Referral code is required");
  }

  const cleanCode = code.trim().toUpperCase();
  const setting = await getOrCreateReferralSetting();

  if (!setting.isReferralActive) {
    throw new Error("Referral program is currently inactive");
  }

  const referrer = await User.findOne({ referralCode: cleanCode });
  if (!referrer) {
    throw new Error("Invalid referral code");
  }

  if (currentUser && currentUser._id && currentUser._id.toString() === referrer._id.toString()) {
    throw new Error("You cannot use your own referral code");
  }

  return {
    valid: true,
    code: cleanCode,
    referrer: {
      _id: referrer._id,
      name: referrer.name,
    },
    discountType: setting.discountType,
    discountValue: setting.discountValue,
  };
}

async function getMyReferralInfo(userId) {
  let user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (!user.referralCode) {
    user.referralCode = "REF-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    await user.save();
  }

  const referrals = await Referral.find({ referrerUser: userId })
    .populate("referredSociety", "name code address city status subscriptionPaid")
    .sort({ createdAt: -1 });

  const totalReferred = referrals.length;
  const registeredCount = referrals.filter((r) => r.status === "REGISTERED").length;
  const paidCount = referrals.filter((r) => r.status === "PAID").length;
  const pendingGiftsCount = referrals.filter((r) => r.giftStatus === "PENDING_GIFT").length;
  const dispatchedGiftsCount = referrals.filter((r) => r.giftStatus === "GIFT_DISPATCHED" || r.giftStatus === "GIFT_DELIVERED").length;

  return {
    referralCode: user.referralCode,
    stats: {
      totalReferred,
      registeredCount,
      paidCount,
      pendingGiftsCount,
      dispatchedGiftsCount,
    },
    referrals,
  };
}

async function getAllReferralsAdmin({ page = 1, limit = 20, search = "", giftStatus = "", status = "" }) {
  const query = {};

  if (giftStatus) {
    query.giftStatus = giftStatus;
  }
  if (status) {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  let referrals = await Referral.find(query)
    .populate("referrerUser", "name email phone referralCode")
    .populate("referredSociety", "name code address city status createdAt")
    .sort({ createdAt: -1 });

  if (search) {
    const s = search.toLowerCase();
    referrals = referrals.filter((r) => {
      const refName = r.referrerUser?.name?.toLowerCase() || "";
      const refEmail = r.referrerUser?.email?.toLowerCase() || "";
      const refPhone = r.referrerUser?.phone?.toLowerCase() || "";
      const socName = r.referredSociety?.name?.toLowerCase() || "";
      const code = r.referralCodeUsed?.toLowerCase() || "";
      return refName.includes(s) || refEmail.includes(s) || refPhone.includes(s) || socName.includes(s) || code.includes(s);
    });
  }

  const total = referrals.length;
  const paginated = referrals.slice(skip, skip + Number(limit));

  const allDocs = await Referral.find();
  const summary = {
    totalReferrals: allDocs.length,
    registeredCount: allDocs.filter((r) => r.status === "REGISTERED").length,
    paidCount: allDocs.filter((r) => r.status === "PAID").length,
    pendingGiftsCount: allDocs.filter((r) => r.giftStatus === "PENDING_GIFT").length,
    dispatchedGiftsCount: allDocs.filter((r) => r.giftStatus === "GIFT_DISPATCHED" || r.giftStatus === "GIFT_DELIVERED").length,
  };

  return {
    referrals: paginated,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
    summary,
  };
}

async function dispatchGiftAdmin(referralId, { giftDetails, courierOrTrackingNotes, giftStatus = "GIFT_DISPATCHED" }) {
  const referral = await Referral.findById(referralId);
  if (!referral) throw new Error("Referral record not found");

  if (referral.status !== "PAID") {
    throw new Error("Gift can only be dispatched for paid/successful referrals");
  }

  referral.giftStatus = giftStatus;
  referral.giftDetails = giftDetails || referral.giftDetails;
  referral.courierOrTrackingNotes = courierOrTrackingNotes || referral.courierOrTrackingNotes;
  referral.giftDispatchedAt = new Date();

  await referral.save();
  return referral;
}

async function updateReferralSettings(payload) {
  let setting = await getOrCreateReferralSetting();
  if (payload.discountType) setting.discountType = payload.discountType;
  if (typeof payload.discountValue === "number") setting.discountValue = payload.discountValue;
  if (typeof payload.isReferralActive === "boolean") setting.isReferralActive = payload.isReferralActive;

  await setting.save();
  return setting;
}

module.exports = {
  getOrCreateReferralSetting,
  validateReferralCode,
  getMyReferralInfo,
  getAllReferralsAdmin,
  dispatchGiftAdmin,
  updateReferralSettings,
};
