const jwt = require("jsonwebtoken");
const { config } = require("../../config");
const userService = require("../user/user.service");
const { AppError } = require("../../shared/utils/errors");
const { DEFAULT_ACCOUNT_ROLE } = require("../../shared/types");

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
