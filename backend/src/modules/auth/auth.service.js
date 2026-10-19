const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { config } = require("../../config");
const userService = require("../user/user.service");
const { Otp } = require("./otp.model");
const { AppError } = require("../../shared/utils/errors");
const { DEFAULT_ACCOUNT_ROLE } = require("../../shared/types");
const logger = require("../../config/logger");

class AuthService {
  generateAccessToken(payload) {
    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiry,
    });
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry,
    });
  }

  generateTokens(payload, tokenVersion = 0) {
    const tokenPayload = {
      ...payload,
      tokenVersion: typeof tokenVersion === "number" ? tokenVersion : 0,
    };
    return {
      accessToken: this.generateAccessToken(tokenPayload),
      refreshToken: this.generateRefreshToken(tokenPayload),
    };
  }

  async register(data) {
    const existingEmail = await userService.findByEmail(data.email);
    if (existingEmail) throw new AppError("Email already registered", 409);

    const existingPhone = await userService.findByPhone(data.phone);
    if (existingPhone) throw new AppError("Phone number already registered", 409);

    const { password, ...rest } = data;
    const user = await userService.create({
      ...rest,
      role: [DEFAULT_ACCOUNT_ROLE],
      passwordHash: password,
    });

    const tokens = this.generateTokens({
      userId: user._id.toString(),
      societyId: null,
      role: user.role,
    }, user.tokenVersion || 0);

    const userObj = user.toObject();
    const { passwordHash, ...userWithoutPassword } = userObj;

    return { user: userWithoutPassword, ...tokens };
  }

  async login(identifier, password) {
    const value = String(identifier || "").trim();
    const isEmail = value.includes("@");
    const user = isEmail
      ? await userService.findByEmailWithPassword(value.toLowerCase())
      : await userService.findByPhoneWithPassword(value);

    // If account does not exist, execute dummy password comparison to maintain consistent response timing and prevent user enumeration
    if (!user) {
      await bcrypt.compare(password || "", "$2a$12$e8h.7c7E4d9h9c5g6e1F3u.bJdKkLoPpQqRrSsTtUuVvWwXxYyZz");
      throw new AppError("Invalid credentials", 401);
    }

    if (!user.isActive) {
      throw new AppError("This account has been deactivated or disabled. Please contact admin.", 403);
    }

    // Check if account is currently locked out
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingSeconds = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      logger.warn(`🛑 Blocked login attempt on locked account ${user._id} (${remainingMinutes}m remaining)`);
      throw new AppError(
        `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""} or reset your password.`,
        429
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lockout threshold: 5 consecutive failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock
        await user.save();
        logger.warn(`🔒 Account ${user._id} locked for 15 minutes after 5 failed login attempts`);
        throw new AppError(
          "Account temporarily locked for 15 minutes due to multiple failed login attempts. You may reset your password using OTP to unlock immediately.",
          429
        );
      }

      await user.save();
      const attemptsRemaining = 5 - user.failedLoginAttempts;
      throw new AppError(
        `Invalid credentials. ${attemptsRemaining} attempt${attemptsRemaining > 1 ? "s" : ""} remaining before temporary account lockout.`,
        401
      );
    }

    // Reset lockout counters upon successful login
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    const tokens = this.generateTokens({
      userId: user._id.toString(),
      societyId: null,
      role: user.role,
    }, user.tokenVersion || 0);

    const userObj = user.toObject();
    const { passwordHash, ...userWithoutPassword } = userObj;

    return { user: userWithoutPassword, ...tokens };
  }

  async refreshTokens(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const user = await userService.findById(decoded.userId);
      if (!user || !user.isActive) throw new AppError("Invalid refresh token", 401);

      // Verify tokenVersion on refresh token
      const userTokenVersion = typeof user.tokenVersion === "number" ? user.tokenVersion : 0;
      if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== userTokenVersion) {
        throw new AppError("Session has expired or was revoked. Please log in again.", 401);
      }

      const tokens = this.generateTokens({
        userId: decoded.userId,
        societyId: decoded.societyId,
        role: user.role,
      }, userTokenVersion);

      return tokens;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Invalid refresh token", 401);
    }
  }

  /**
   * 1. Send OTP for password recovery
   */
  async sendForgotOtp(identifier) {
    const raw = String(identifier || "").trim();
    if (!raw) throw new AppError("Mobile number or email is required", 400);

    const isEmail = raw.includes("@");
    const normalized = isEmail ? raw.toLowerCase() : raw.replace(/[^0-9]/g, "");

    const user = isEmail
      ? await userService.findByEmail(normalized)
      : await userService.findByPhone(normalized);

    if (!user) {
      throw new AppError("No registered account found with this phone number or email.", 404);
    }
    if (!user.isActive) {
      throw new AppError("This account is inactive or disabled. Please contact admin.", 403);
    }

    // Rate limit: check if an OTP was sent in the last 45 seconds
    const recentOtp = await Otp.findOne({
      identifier: normalized,
      purpose: "FORGOT_PASSWORD",
      createdAt: { $gt: new Date(Date.now() - 45 * 1000) },
    });
    if (recentOtp) {
      throw new AppError("Please wait 45 seconds before requesting another OTP.", 429);
    }

    // Generate cryptographically secure 6-digit OTP (CSPRNG)
    const otpCode = crypto.randomInt(100000, 1000000).toString();

    // Hash OTP with SHA-256 before saving to database (never store plaintext OTPs)
    const hashedOtp = crypto.createHash("sha256").update(otpCode).digest("hex");

    // Delete any old OTPs for this identifier
    await Otp.deleteMany({ identifier: normalized, purpose: "FORGOT_PASSWORD" });

    // Save new OTP valid for 10 minutes
    await Otp.create({
      identifier: normalized,
      otp: hashedOtp,
      purpose: "FORGOT_PASSWORD",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Log OTP clearly on backend console for inspection / verification
    logger.info(`🔐 [FORGOT PASSWORD OTP] Sent to ${normalized}: ${otpCode}`);

    // Mask the identifier for client response
    let masked = normalized;
    if (isEmail) {
      const [local, domain] = normalized.split("@");
      masked = `${local.slice(0, 2)}***@${domain}`;
    } else if (normalized.length >= 10) {
      masked = `******${normalized.slice(-4)}`;
    }

    return {
      message: `Verification code sent to ${masked}`,
      identifier: normalized,
      masked,
      // For development / testing environments, include debugOtp so testing is instant
      ...(config.isProduction ? {} : { debugOtp: otpCode }),
    };
  }

  /**
   * 2. Verify OTP for password recovery and issue a temporary reset token
   */
  async verifyForgotOtp(identifier, otp) {
    const raw = String(identifier || "").trim();
    const cleanOtp = String(otp || "").trim();

    if (!raw) throw new AppError("Mobile number or email is required", 400);
    if (!cleanOtp) throw new AppError("Please enter the 6-digit OTP code", 400);

    const isEmail = raw.includes("@");
    const normalized = isEmail ? raw.toLowerCase() : raw.replace(/[^0-9]/g, "");

    const otpDoc = await Otp.findOne({
      identifier: normalized,
      purpose: "FORGOT_PASSWORD",
    }).sort({ createdAt: -1 });

    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      throw new AppError("OTP has expired or is invalid. Please request a new code.", 400);
    }

    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ _id: otpDoc._id });
      throw new AppError("Too many incorrect attempts. Please request a new OTP.", 429);
    }

    // Hash the incoming OTP to compare against stored SHA-256 hash
    const inputHash = crypto.createHash("sha256").update(cleanOtp).digest("hex");

    // Timing-safe comparison to prevent timing attacks
    let isMatch = false;
    if (typeof otpDoc.otp === "string" && otpDoc.otp.length === 64) {
      isMatch = crypto.timingSafeEqual(
        Buffer.from(otpDoc.otp, "hex"),
        Buffer.from(inputHash, "hex")
      );
    } else {
      // Backward compatibility fallback for any unexpired legacy plaintext OTP
      isMatch = otpDoc.otp === cleanOtp;
    }

    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      throw new AppError("Invalid OTP code. Please enter the correct 6-digit code.", 400);
    }

    otpDoc.verified = true;
    await otpDoc.save();

    const user = isEmail
      ? await userService.findByEmail(normalized)
      : await userService.findByPhone(normalized);

    if (!user) throw new AppError("User account not found", 404);

    // Issue a 15-minute reset token
    const resetToken = jwt.sign(
      {
        userId: user._id.toString(),
        identifier: normalized,
        purpose: "PASSWORD_RESET",
      },
      config.jwt.accessSecret,
      { expiresIn: "15m" }
    );

    return {
      message: "OTP verified successfully. You may now reset your password.",
      resetToken,
    };
  }

  /**
   * 3. Reset password using the verified resetToken or Firebase verification token
   */
  async resetPasswordWithToken({ resetToken, firebaseToken, identifier, newPassword }) {
    if (!newPassword || newPassword.length < 6) {
      throw new AppError("Password must be at least 6 characters long", 400);
    }

    let targetUserId = null;
    let targetIdentifier = null;

    if (firebaseToken) {
      // Decode Firebase ID token to verify phone number
      const decodedFirebase = jwt.decode(firebaseToken);
      if (
        !decodedFirebase ||
        decodedFirebase.aud !== "residentone-7d9d3" ||
        (decodedFirebase.exp && decodedFirebase.exp < Date.now() / 1000)
      ) {
        throw new AppError("Firebase verification session is invalid or has expired.", 401);
      }

      const phoneInToken = (decodedFirebase.phone_number || "").replace(/[^0-9]/g, "");
      const inputPhone = String(identifier || "").replace(/[^0-9]/g, "");

      if (!phoneInToken || !inputPhone.endsWith(phoneInToken.slice(-10))) {
        throw new AppError("Verified phone number does not match requested account.", 400);
      }

      const user = await userService.findByPhone(inputPhone.slice(-10));
      if (!user) throw new AppError("User account not found for this phone number.", 404);
      targetUserId = user._id;
      targetIdentifier = inputPhone.slice(-10);
    } else if (resetToken) {
      let decoded;
      try {
        decoded = jwt.verify(resetToken, config.jwt.accessSecret);
      } catch (err) {
        throw new AppError("Reset session has expired or is invalid. Please restart the OTP process.", 401);
      }

      if (decoded.purpose !== "PASSWORD_RESET" || !decoded.userId) {
        throw new AppError("Invalid reset token", 401);
      }

      targetUserId = decoded.userId;
      targetIdentifier = decoded.identifier;
    } else {
      throw new AppError("Verification token is required to reset password.", 400);
    }

    const user = await userService.findById(targetUserId);
    if (!user) throw new AppError("User account not found", 404);
    if (!user.isActive) throw new AppError("Account is inactive or disabled", 403);

    user.passwordHash = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const { invalidateUserSecurityCache } = require("../../middlewares/auth.middleware");
    invalidateUserSecurityCache(user._id);

    // Clean up all OTP records for this identifier
    if (targetIdentifier) {
      await Otp.deleteMany({ identifier: targetIdentifier });
    }

    logger.info(`✅ Password successfully updated for user ${user._id} (${user.phone || user.email})`);

    return {
      message: "Password updated successfully. Please log in with your new password.",
    };
  }

  /**
   * 4. Legacy single-call forgot password (kept for backward compatibility)
   */
  async forgotPassword(identifier, newPassword) {
    const value = String(identifier || "").trim();
    if (!value) throw new AppError("Phone number or email is required", 400);
    if (!newPassword || newPassword.length < 6) {
      throw new AppError("Password must be at least 6 characters", 400);
    }

    const isEmail = value.includes("@");
    const user = isEmail
      ? await userService.findByEmailWithPassword(value.toLowerCase())
      : await userService.findByPhoneWithPassword(value);

    if (!user) throw new AppError("No account found with this registered details", 404);
    if (!user.isActive) throw new AppError("This account is inactive or disabled", 403);

    user.passwordHash = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const { invalidateUserSecurityCache } = require("../../middlewares/auth.middleware");
    invalidateUserSecurityCache(user._id);

    return { message: "Password reset successfully. Please log in with your new password." };
  }
}

module.exports = new AuthService();
