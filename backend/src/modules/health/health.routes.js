const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

  res.json({
    success: true,
    data: {
      name: "ResidentOne API",
      version: "1.0.0",
      status: "running",
      database: states[dbState] || "unknown",
      uptime: process.uptime(),
    },
  });
});

module.exports = router;
