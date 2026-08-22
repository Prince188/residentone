const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { config } = require("./config");
const { errorHandler } = require("./middlewares/error.middleware");

const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/user/user.routes");
const societyRoutes = require("./modules/society/society.routes");
const membershipRoutes = require("./modules/membership/membership.routes");
const healthRoutes = require("./modules/health/health.routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(morgan(config.isProduction ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/societies", societyRoutes);
app.use("/api/v1/memberships", membershipRoutes);
app.use("/api/v1/societies/:societyId/members", membershipRoutes);

app.use(errorHandler);

module.exports = app;
