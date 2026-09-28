const couponService = require("./coupon.service");

async function validate(req, res, next) {
  try {
    const { code, orderAmount, societyId } = req.body;
    const result = await couponService.validateCoupon(code, Number(orderAmount) || 0, societyId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
}

async function create(req, res, next) {
  try {
    const data = await couponService.createCoupon(req.body);
    res.json({ success: true, data, message: "Coupon created successfully" });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
}

async function listAll(req, res, next) {
  try {
    const data = await couponService.getAllCoupons(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = await couponService.updateCoupon(req.params.id, req.body);
    res.json({ success: true, data, message: "Coupon updated successfully" });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
}

async function remove(req, res, next) {
  try {
    const data = await couponService.deleteCoupon(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
}

module.exports = {
  validate,
  create,
  listAll,
  update,
  remove,
};
