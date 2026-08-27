const dotenv = require("dotenv");
dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",

  mongodb: {
    uri: requireEnv("MONGODB_URI"),
  },

  jwt: {
    accessSecret: requireEnv("JWT_ACCESS_SECRET"),
    refreshSecret: requireEnv("JWT_REFRESH_SECRET"),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  },

  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || null,
    keySecret: process.env.RAZORPAY_KEY_SECRET || null,
    // 2% + 18% GST = 2.36% total fee passed to resident
    feePercent: parseFloat(process.env.RAZORPAY_FEE_PERCENT || "2"),
    gstOnFeePercent: parseFloat(process.env.RAZORPAY_GST_PERCENT || "18"),
  },
};

module.exports = { config };
