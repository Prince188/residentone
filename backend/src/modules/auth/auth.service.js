const jwt = require("jsonwebtoken");
const crypto = require("crypto");
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

  generateTokens(payload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
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
    });

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

    if (!user) throw new AppError("Invalid credentials", 401);

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) throw new AppError("Invalid credentials", 401);

    const tokens = this.generateTokens({
      userId: user._id.toString(),
      societyId: null,
      role: user.role,
    });

    const userObj = user.toObject();
    const { passwordHash, ...userWithoutPassword } = userObj;

    return { user: userWithoutPassword, ...tokens };
  }

  async refreshTokens(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const user = await userService.findById(decoded.userId);
      if (!user || !user.isActive) throw new AppError("Invalid refresh token", 401);

      const tokens = this.generateTokens({
        userId: decoded.userId,
        societyId: decoded.societyId,
        role: user.role,
      });

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

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any old OTPs for this identifier
    await Otp.deleteMany({ identifier: normalized, purpose: "FORGOT_PASSWORD" });

    // Save new OTP valid for 10 minutes
    await Otp.create({
      identifier: normalized,
      otp: otpCode,
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

    if (otpDoc.otp !== cleanOtp) {
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
   * 3. Reset password using the verified resetToken
   */
  async resetPasswordWithToken(resetToken, newPassword) {
    if (!resetToken) throw new AppError("Reset token is required", 400);
    if (!newPassword || newPassword.length < 6) {
      throw new AppError("Password must be at least 6 characters long", 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, config.jwt.accessSecret);
    } catch (err) {
      throw new AppError("Reset session has expired or is invalid. Please restart the OTP process.", 401);
    }

    if (decoded.purpose !== "PASSWORD_RESET" || !decoded.userId) {
      throw new AppError("Invalid reset token", 401);
    }

    const user = await userService.findById(decoded.userId);
    if (!user) throw new AppError("User account not found", 404);
    if (!user.isActive) throw new AppError("Account is inactive or disabled", 403);

    user.passwordHash = newPassword;
    await user.save();

    // Clean up all OTP records for this identifier
    if (decoded.identifier) {
      await Otp.deleteMany({ identifier: decoded.identifier });
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
    await user.save();

    return { message: "Password reset successfully. Please log in with your new password." };
  }
}

module.exports = new AuthService();
