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
const auditLogRoutes = require("./modules/audit-log/audit-log.routes");

const { AppError } = require("./shared/utils/errors");
const {
  globalApiLimiter,
  sanitizeMongoInput,
  preventParameterPollution,
} = require("./middlewares/security.middleware");

const app = express();

// Trust reverse proxy (Render, AWS, Cloudflare) for accurate client IP in rate limiting
app.set("trust proxy", 1);

// Disable Express signature in response headers
app.disable("x-powered-by");

// Production-grade HTTP security headers
app.use(
  helmet({
    // 1. Clickjacking defense: Block unauthorized iframing of the app
    frameguard: { action: "deny" },
    // 2. MIME sniffing defense: Prevent browser content-type guessing
    noSniff: true,
    // 3. Information disclosure defense: Suppress server technology identification
    hidePoweredBy: true,
    // 4. Strict Transport Security (HSTS): Enforce HTTPS in production for 1 year
    hsts: config.isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    // 5. Referrer Policy: Prevent leakage of sensitive query parameters and URL paths
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // 6. Cross-Origin Resource Policy: Allow Cloudinary images and PDFs to render in web browsers without CORP blocks
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // 7. Cross-Origin Opener Policy: Protect browsing context from rogue tabs
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // 8. DNS prefetch control: Prevent browser speculative DNS resolution
    dnsPrefetchControl: { allow: false },
    // 9. Download security: Prevent direct execution of HTML/file downloads
    ieNoOpen: true,
    // 10. Restrict legacy cross-domain policies
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    // 11. Content Security Policy: Block framing while allowing legitimate cloud image rendering
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https:", "blob:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

// Strict CORS: allow official production domain, Vercel branch previews, and dev localhost
const allowedOrigins = [
  config.cors?.origin,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:8082",
  "https://residentone.vercel.app",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Native mobile apps (iOS / Android) and server-to-server calls send no origin header
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin === "https://residentone.vercel.app" ||
      /^https:\/\/([a-z0-9-]+\.)?residentone\.vercel\.app$/.test(origin) ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin === "http://localhost" ||
      origin === "http://127.0.0.1";

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
app.use("/api/v1/audit-logs", auditLogRoutes);
app.use("/api/v1/societies/:societyId/members", membershipRoutes);

app.use(errorHandler);

module.exports = app;
