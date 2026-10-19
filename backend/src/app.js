const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const { config } = require("./config");
const { errorHandler } = require("./middlewares/error.middleware");

const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/user/user.routes");
const societyRoutes = require("./modules/society/society.routes");
const membershipRoutes = require("./modules/membership/membership.routes");
const unitRoutes = require("./modules/unit/unit.routes");
const noticeRoutes = require("./modules/notice/notice.routes");
const maintenanceRoutes = require("./modules/maintenance/maintenance.routes");
const complaintRoutes = require("./modules/complaint/complaint.routes");
const amenityRoutes = require("./modules/amenity/amenity.routes");
const familyMemberRoutes = require("./modules/family-member/family-member.routes");
const pollRoutes = require("./modules/poll/poll.routes");
const chatRoutes = require("./modules/chat/chat.routes");
const surveyRoutes = require("./modules/survey/survey.routes");
const collectionRoutes = require("./modules/collections/collection.routes");
const donationRoutes = require("./modules/donations/donation.routes");
const documentRoutes = require("./modules/document/document.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const notificationRoutes = require("./modules/notification/notification.routes");
const visitorRoutes = require("./modules/visitor/visitor.routes");
const staffRoutes = require("./modules/staff/staff.routes");
const healthRoutes = require("./modules/health/health.routes");
const receiptRoutes = require("./modules/receipt/receipt.routes");
const expenseRoutes = require("./modules/expenses/expense.routes");
const walletRoutes = require("./modules/wallet/wallet.routes");
const eventRoutes = require("./modules/events/event.routes");
const transferFeeRoutes = require("./modules/transfer-fees/transferFee.routes");
const referralRoutes = require("./modules/referral/referral.routes");
const couponRoutes = require("./modules/coupon/coupon.routes");
const appConfigRoutes = require("./modules/app-config/app-config.routes");

const { AppError } = require("./shared/utils/errors");
const {
  globalApiLimiter,
  sanitizeMongoInput,
  preventParameterPollution,
} = require("./middlewares/security.middleware");

const app = express();

// Trust reverse proxy (Render, AWS, Cloudflare) for accurate client IP in rate limiting
app.set("trust proxy", 1);

app.use(helmet());

// Strict CORS: allow official production domain, Vercel branch previews, and dev localhost
const allowedOrigins = [
  config.cors?.origin,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://residentone.vercel.app",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Native mobile apps (iOS / Android) and server-to-server calls send no origin header
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      (!config.isProduction &&
        (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")));

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(
      new AppError(`CORS policy violation: Access from origin '${origin}' is not allowed.`, 403)
    );
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-society-id"],
  exposedHeaders: ["Content-Disposition"],
  maxAge: 86400, // Cache preflight OPTIONS responses for 24 hours (eliminates preflight delay)
};

app.use(cors(corsOptions));
app.use(compression({ threshold: 1024 }));
app.use(morgan(config.isProduction ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));

// Security filters against NoSQL injection and Parameter Pollution
app.use(sanitizeMongoInput);
app.use(preventParameterPollution());

// Global rate limiter on all API endpoints (blocks scraping & DDoS)
app.use("/api/v1", globalApiLimiter);

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/societies", societyRoutes);
app.use("/api/v1/memberships", membershipRoutes);
app.use("/api/v1/units", unitRoutes);
app.use("/api/v1/notices", noticeRoutes);
app.use("/api/v1/maintenance", maintenanceRoutes);
app.use("/api/v1/complaints", complaintRoutes);
app.use("/api/v1/amenities", amenityRoutes);
app.use("/api/v1/family-members", familyMemberRoutes);
app.use("/api/v1/polls", pollRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/surveys", surveyRoutes);
app.use("/api/v1/collections", collectionRoutes);
app.use("/api/v1/donations", donationRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/visitors", visitorRoutes);
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/receipts", receiptRoutes);
app.use("/api/v1/expenses", expenseRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/transfer-fees", transferFeeRoutes);
app.use("/api/v1/referrals", referralRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/app-config", appConfigRoutes);
app.use("/api/v1/societies/:societyId/members", membershipRoutes);

app.use(errorHandler);

module.exports = app;
