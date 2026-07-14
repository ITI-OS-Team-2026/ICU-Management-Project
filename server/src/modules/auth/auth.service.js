const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../utils/prismaClient");
const config = require("../../config/env");
const APIError = require("../../utils/APIError");
const logger = require("../../utils/logger");
const { auditedTransaction } = require("../../middlewares/auditLog");

// Find a user by email, case-insensitively.
const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
};

// Log a login attempt (success/failure) without plaintext passwords.
const recordLoginAttempt = async (tx, { userId, email, ipAddress, userAgent, success, failureReason }) => {
  return tx.loginAttempt.create({
    data: {
      userId: userId || null,
      email: email.toLowerCase(),
      ipAddress,
      userAgent: userAgent || null,
      success,
      failureReason: failureReason || null,
    },
  });
};

// Generate JWT token with user ID and role.
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

// Login: verifies email, password, checks lockout/status, updates failed attempts, logs success/failure.
const login = async ({ email, password, ipAddress, userAgent, req }) => {
  const normalizedEmail = email.toLowerCase();

  // 1. Look up user by email (case-insensitive)
  const user = await findUserByEmail(normalizedEmail);

  // 2. No user found — log attempt with null userId, return generic 401
  if (!user) {
    await prisma.loginAttempt.create({
      data: {
        userId: null,
        email: normalizedEmail,
        ipAddress,
        userAgent: userAgent || null,
        success: false,
        failureReason: "User not found",
      },
    });

    throw new APIError("Invalid credentials", 401);
  }

  // 3. Check if account is locked
  if (user.status === "LOCKED" && user.lockedUntil && user.lockedUntil > new Date()) {
    throw new APIError("Account is locked. Please try again later.", 423);
  }

  // If lock has expired, unlock the account before proceeding
  if (user.status === "LOCKED" && user.lockedUntil && user.lockedUntil <= new Date()) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    user.status = "ACTIVE";
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
  }

  // Check other non-active statuses
  if (user.status === "INACTIVE" || user.status === "SUSPENDED") {
    await prisma.loginAttempt.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        ipAddress,
        userAgent: userAgent || null,
        success: false,
        failureReason: `Account is ${user.status.toLowerCase()}`,
      },
    });
    throw new APIError("Invalid credentials", 401);
  }

  // 4. Compare password against hash
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  // 5. Password mismatch
  if (!isPasswordValid) {
    const newFailedAttempts = user.failedLoginAttempts + 1;
    const updateData = { failedLoginAttempts: newFailedAttempts };

    // Lock account if threshold reached
    if (newFailedAttempts >= config.lockoutThreshold) {
      updateData.status = "LOCKED";
      updateData.lockedUntil = new Date(Date.now() + config.lockoutDurationMinutes * 60 * 1000);

      await auditedTransaction(req, { action: "ACCOUNT_LOCKED", targetTable: "User" }, async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: updateData,
        });

        await tx.loginAttempt.create({
          data: {
            userId: user.id,
            email: normalizedEmail,
            ipAddress,
            userAgent: userAgent || null,
            success: false,
            failureReason: "Invalid password - Account Locked",
          },
        });

        return {
          userId: user.id,
          targetId: user.id,
          oldValues: { status: user.status, failedLoginAttempts: user.failedLoginAttempts },
          newValues: { status: "LOCKED", failedLoginAttempts: newFailedAttempts, lockedUntil: updateData.lockedUntil.toISOString() },
          ipAddress,
          userAgent,
          result: null,
        };
      });

      throw new APIError("Account is locked. Please try again later.", 423);
    } else {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: updateData,
        }),
        prisma.loginAttempt.create({
          data: {
            userId: user.id,
            email: normalizedEmail,
            ipAddress,
            userAgent: userAgent || null,
            success: false,
            failureReason: "Invalid password",
          },
        }),
      ]);
    }

    throw new APIError("Invalid credentials", 401);
  }

  // 6. Password match — success
  const now = new Date();
  const token = generateToken(user);

  const { token: resolvedToken, user: resolvedUser } = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLogin: now,
      },
    });

    await recordLoginAttempt(tx, {
      userId: user.id,
      email: normalizedEmail,
      ipAddress,
      userAgent,
      success: true,
      failureReason: null,
    });

    return {
      token,
      user: {
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role,
      },
    };
  });

  return { token: resolvedToken, user: resolvedUser };
};

// Logout: no-op since audit logs are removed for routine logouts and session is cookie-based.
const logout = async ({ userId, ipAddress, userAgent }) => {
  // Routine logout is not logged in AuditLog to minimize noise.
};

// Fetch authenticated user profile data.
const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new APIError("User not found", 404);
  }

  return {
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    role: user.role,
  };
};

module.exports = {
  login,
  logout,
  getMe,
};
