const { Coupon } = require("./coupon.model");
const { CouponRedemption } = require("./coupon-redemption.model");

async function validateCoupon(code, orderAmount = 0, societyId = null) {
  if (!code || typeof code !== "string") {
    throw new Error("Coupon code is required");
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: cleanCode });

  if (!coupon) {
    throw new Error("Invalid coupon code");
  }

  if (!coupon.isActive) {
    throw new Error("This coupon is no longer active");
  }

  const now = new Date();
  if (coupon.validFrom) {
    const startDate = new Date(coupon.validFrom);
    startDate.setHours(0, 0, 0, 0);
    if (now < startDate) {
      throw new Error("This coupon is not active yet");
    }
  }

  if (coupon.validUntil) {
    const expiryDate = new Date(coupon.validUntil);
    expiryDate.setHours(23, 59, 59, 999);
    if (now > expiryDate) {
      throw new Error("This coupon has expired");
    }
  }

  if (coupon.globalUsageLimit !== null && coupon.usedCount >= coupon.globalUsageLimit) {
    throw new Error("This coupon has reached its maximum usage limit");
  }

  if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
    throw new Error(`Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`);
  }

  if (societyId) {
    const previousRedemptions = await CouponRedemption.countDocuments({
      couponId: coupon._id,
      societyId,
    });
    if (coupon.perSocietyUsageLimit !== null && previousRedemptions >= coupon.perSocietyUsageLimit) {
      throw new Error("Your society has already used this coupon code");
    }
  }

  let calculatedDiscount = 0;
  if (coupon.discountType === "FLAT") {
    calculatedDiscount = coupon.discountValue;
  } else if (coupon.discountType === "PERCENTAGE") {
    calculatedDiscount = (orderAmount * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount > 0) {
      calculatedDiscount = Math.min(calculatedDiscount, coupon.maxDiscountAmount);
    }
  }

  calculatedDiscount = Math.min(calculatedDiscount, orderAmount);

  return {
    valid: true,
    coupon: {
      _id: coupon._id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    discountAmount: Math.round(calculatedDiscount),
    finalAmount: Math.max(0, Math.round(orderAmount - calculatedDiscount)),
  };
}

async function createCoupon(payload) {
  if (!payload.code) throw new Error("Coupon code is required");
  const cleanCode = payload.code.trim().toUpperCase();

  const existing = await Coupon.findOne({ code: cleanCode });
  if (existing) throw new Error("A coupon with this code already exists");

  const coupon = await Coupon.create({
    ...payload,
    code: cleanCode,
  });

  return coupon;
}

async function getAllCoupons({ search = "", status = "" }) {
  const query = {};

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (status === "active") {
    query.isActive = true;
    query.validUntil = { $gte: todayStart };
  } else if (status === "inactive") {
    query.isActive = false;
  } else if (status === "expired") {
    query.validUntil = { $lt: todayStart };
  }

  if (search) {
    query.$or = [
      { code: new RegExp(search, "i") },
      { description: new RegExp(search, "i") },
    ];
  }

  const coupons = await Coupon.find(query).sort({ createdAt: -1 });
  return coupons;
}

async function updateCoupon(id, payload) {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new Error("Coupon not found");

  if (payload.code) {
    const cleanCode = payload.code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: cleanCode, _id: { $ne: id } });
    if (existing) throw new Error("Another coupon with this code already exists");
    coupon.code = cleanCode;
  }

  Object.assign(coupon, payload);
  await coupon.save();
  return coupon;
}

async function deleteCoupon(id) {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new Error("Coupon not found");
  return { success: true, message: "Coupon deleted successfully" };
}

module.exports = {
  validateCoupon,
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
};
