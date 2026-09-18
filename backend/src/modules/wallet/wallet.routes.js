const express = require("express");
const walletController = require("./wallet.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");

const router = express.Router();

router.use(authenticate, resolveSocietyContext, requireSociety);

// All society members can view society wallet summary & cashflow stream for transparency
router.get("/summary", (req, res, next) => walletController.getSummary(req, res, next));

module.exports = router;
