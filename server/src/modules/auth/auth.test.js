const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../../../app");
const prisma = require("../../utils/prismaClient");
const config = require("../../config/env");
const { authLimiter } = require("../../middlewares/rateLimiter");

require("dotenv").config();

// Test Helpers

const TEST_PASSWORD = "SecureP@ssw0rd!";
const TEST_EMAIL = "testuser@smartcare.icu";
const COOKIE_NAME = config.cookieName;

/**
 * Creates a test user directly in the database with a bcrypt-hashed password.
 */
const createTestUser = async (overrides = {}) => {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  return prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "User",
      email: overrides.email || TEST_EMAIL,
      passwordHash,
      role: overrides.role || "ICU_NURSE",
      status: overrides.status || "ACTIVE",
      failedLoginAttempts: overrides.failedLoginAttempts || 0,
      lockedUntil: overrides.lockedUntil || null,
      ...overrides,
      // Ensure passwordHash is always from our hash, not from overrides
      passwordHash: overrides.passwordHash || passwordHash,
    },
  });
};

/**
 * Extracts the auth cookie value from a supertest response.
 */
const extractCookie = (res) => {
  const cookies = res.headers["set-cookie"];
  if (!cookies) return null;
  const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
  const authCookie = cookieArr.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!authCookie) return null;
  const match = authCookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
};

/**
 * Generates a valid JWT for a test user (for protected route tests).
 */
const generateTestToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: "12h",
  });
};

// Seed emails that should not be wiped by cleanup
const PROTECTED_EMAILS = [
  process.env.SEED_ADMIN_EMAIL,
  process.env.SEED_NURSE_EMAIL,
  process.env.SEED_RESIDENT_EMAIL,
  process.env.SEED_SPECIALIST_EMAIL,
]
  .filter(Boolean)
  .map((e) => e.toLowerCase());

async function cleanupTestData() {
  // Find protected user IDs first so we can exclude their related
  // AuditLog / LoginAttempt / RefreshToken rows too, not just the User row.
  const protectedUsers = await prisma.user.findMany({
    where: { email: { in: PROTECTED_EMAILS } },
    select: { id: true },
  });
  const protectedIds = protectedUsers.map((u) => u.id);

  await prisma.auditLog.deleteMany({
    where: { userId: { notIn: protectedIds } },
  });
  await prisma.loginAttempt.deleteMany({
    where: {
      OR: [
        { userId: { notIn: protectedIds } },
        { userId: null }, // failed attempts against nonexistent emails
      ],
    },
  });
  await prisma.refreshToken.deleteMany({
    where: { userId: { notIn: protectedIds } },
  });
  await prisma.user.deleteMany({
    where: { email: { notIn: PROTECTED_EMAILS } },
  });
}

beforeEach(async () => {
  await cleanupTestData();
  // Reset IP-based rate limiter so tests don't interfere with each other
  authLimiter.resetKey("::ffff:127.0.0.1");
  authLimiter.resetKey("127.0.0.1");
});


afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

// POST /auth/login

describe("POST /api/auth/login", () => {
  // Validation

  it("should return 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: TEST_PASSWORD });

    expect(res.status).toBe(400);
  });

  it("should return 400 when password is missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL });

    expect(res.status).toBe(400);
  });

  it("should return 400 when email format is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: TEST_PASSWORD });

    expect(res.status).toBe(400);
  });

  it("should return 400 when body is empty", async () => {
    const res = await request(app).post("/api/auth/login").send({});

    expect(res.status).toBe(400);
  });

  // Successful Login

  it("should return 200 and set HttpOnly cookie on successful login", async () => {
    await createTestUser();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("first_name", "Test");
    expect(res.body).toHaveProperty("last_name", "User");
    expect(res.body).toHaveProperty("role", "ICU_NURSE");

    // Verify cookie is set
    const cookie = extractCookie(res);
    expect(cookie).toBeTruthy();

    // Verify cookie is HttpOnly
    const cookies = res.headers["set-cookie"];
    const cookieStr = Array.isArray(cookies) ? cookies.join(";") : cookies;
    expect(cookieStr.toLowerCase()).toContain("httponly");
  });

  it("should NOT return passwordHash or token in the response body", async () => {
    await createTestUser();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("passwordHash");
    expect(res.body).not.toHaveProperty("password_hash");
    expect(res.body).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("token");
    expect(res.body).not.toHaveProperty("accessToken");
    expect(res.body).not.toHaveProperty("jwt");
  });

  it("should handle case-insensitive email login", async () => {
    // Renamed from nurse@smartcare.icu to avoid collision with protected SEED_NURSE_EMAIL
    await createTestUser({ email: "testnurse@smartcare.icu" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "TESTNURSE@SMARTCARE.ICU", password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("first_name", "Test");
  });

  it("should log a successful LoginAttempt but NOT write an AuditLog on routine login", async () => {
    const user = await createTestUser();

    await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    // Check LoginAttempt
    const attempts = await prisma.loginAttempt.findMany({
      where: { email: TEST_EMAIL },
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].success).toBe(true);
    expect(attempts[0].userId).toBe(user.id);

    // Check AuditLog
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: user.id },
    });
    expect(auditLogs).toHaveLength(0);
  });

  // Failed Login: Wrong Password

  it("should return 401 with generic message on wrong password", async () => {
    await createTestUser();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("should log a failed LoginAttempt on wrong password", async () => {
    const user = await createTestUser();

    await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: "wrong-password" });

    const attempts = await prisma.loginAttempt.findMany({
      where: { email: TEST_EMAIL },
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].success).toBe(false);
    expect(attempts[0].userId).toBe(user.id);
    expect(attempts[0].failureReason).toBeTruthy();
  });

  // Failed Login: Nonexistent Email

  it("should return 401 with identical message for nonexistent email", async () => {
    // First create a user, get the wrong-password message
    await createTestUser();
    const wrongPwRes2 = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: "wrong-password" });

    const nonexistentRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@smartcare.icu", password: TEST_PASSWORD });

    // Both should return 401 with byte-identical messages
    expect(wrongPwRes2.status).toBe(401);
    expect(nonexistentRes.status).toBe(401);
    expect(nonexistentRes.body.message).toBe(wrongPwRes2.body.message);
    expect(nonexistentRes.body.message).toBe("Invalid credentials");
  });

  it("should log a LoginAttempt with null userId for nonexistent email", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@smartcare.icu", password: TEST_PASSWORD });

    const attempts = await prisma.loginAttempt.findMany({
      where: { email: "nobody@smartcare.icu" },
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].success).toBe(false);
    expect(attempts[0].userId).toBeNull();
  });

  // Account Lockout

  it("should lock account after 5 failed attempts and write an ACCOUNT_LOCKED AuditLog row", async () => {
    const user = await createTestUser();

    // Make 5 failed login attempts
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_EMAIL, password: "wrong-password" });

      if (i < 5) {
        expect(res.status).toBe(401);
      } else {
        // The 5th attempt triggers the lock and returns 423
        expect(res.status).toBe(423);
      }
    }

    // Verify user is now locked
    const updatedUser = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });
    expect(updatedUser.status).toBe("LOCKED");
    expect(updatedUser.lockedUntil).toBeTruthy();
    expect(new Date(updatedUser.lockedUntil).getTime()).toBeGreaterThan(Date.now());

    // Verify AuditLog record was created
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: "ACCOUNT_LOCKED" },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].targetTable).toBe("User");
    expect(auditLogs[0].newValues).toHaveProperty("status", "LOCKED");
  });

  it("should return 423 when locked account tries to login with correct password", async () => {
    await createTestUser({
      status: "LOCKED",
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 min from now
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(423);
  });

  it("should allow login after lock period expires", async () => {
    await createTestUser({
      status: "LOCKED",
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() - 1000), // Expired 1 second ago
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
  });

  // No plaintext password in logs

  it("should never store plaintext password in LoginAttempt or AuditLog", async () => {
    await createTestUser();

    // Successful login
    await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    // Failed login
    await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: "wrong-one" });

    // Check LoginAttempts
    const attempts = await prisma.loginAttempt.findMany();
    for (const attempt of attempts) {
      const serialized = JSON.stringify(attempt);
      expect(serialized).not.toContain(TEST_PASSWORD);
      expect(serialized).not.toContain("wrong-one");
    }

    // Check AuditLogs
    const auditLogs = await prisma.auditLog.findMany();
    for (const log of auditLogs) {
      const serialized = JSON.stringify(log);
      expect(serialized).not.toContain(TEST_PASSWORD);
      expect(serialized).not.toContain("wrong-one");
    }
  });
});

// POST /auth/logout

describe("POST /api/auth/logout", () => {
  it("should return 204 and clear the auth cookie", async () => {
    const user = await createTestUser();
    const token = generateTestToken(user);

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `${COOKIE_NAME}=${token}`);

    expect(res.status).toBe(204);

    // Cookie should be cleared (set to empty or expired)
    const cookies = res.headers["set-cookie"];
    if (cookies) {
      const cookieStr = Array.isArray(cookies) ? cookies.join(";") : cookies;
      // Should contain the cookie name with an expiry in the past or empty value
      expect(cookieStr).toContain(COOKIE_NAME);
    }
  });

  it("should NOT write an AuditLog row on routine logout", async () => {
    const user = await createTestUser();
    const token = generateTestToken(user);

    await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `${COOKIE_NAME}=${token}`);

    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: user.id },
    });
    expect(auditLogs).toHaveLength(0);
  });

  it("should return 401 when no cookie is present", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(401);
  });
});

// GET /auth/me

describe("GET /api/auth/me", () => {
  it("should return user profile when authenticated", async () => {
    const user = await createTestUser();
    const token = generateTestToken(user);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${COOKIE_NAME}=${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: user.id,
      first_name: "Test",
      last_name: "User",
      email: TEST_EMAIL,
      role: "ICU_NURSE",
    });
  });

  it("should NOT return passwordHash in /me response", async () => {
    const user = await createTestUser();
    const token = generateTestToken(user);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${COOKIE_NAME}=${token}`);

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("passwordHash");
    expect(res.body).not.toHaveProperty("password");
  });

  it("should return 401 when no cookie is present", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
  });

  it("should return 401 with expired token", async () => {
    const user = await createTestUser();
    const expiredToken = jwt.sign(
      { id: user.id, role: user.role },
      config.jwtSecret,
      { expiresIn: "0s" }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${COOKIE_NAME}=${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("clearSession", true);
  });

  it("should return 401 with tampered token", async () => {
    const user = await createTestUser();
    const tamperedToken = jwt.sign(
      { id: user.id, role: user.role },
      "wrong-secret",
      { expiresIn: "12h" }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${COOKIE_NAME}=${tamperedToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("clearSession", true);
  });
});

// Middleware: verifyToken

describe("verifyToken middleware", () => {
  it("should return 401 for expired token on a protected route", async () => {
    const user = await createTestUser();
    const expiredToken = jwt.sign(
      { id: user.id, role: user.role },
      config.jwtSecret,
      { expiresIn: "0s" }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${COOKIE_NAME}=${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it("should return 401 for tampered token on a protected route", async () => {
    const user = await createTestUser();
    const tamperedToken = jwt.sign(
      { id: user.id, role: "SYSTEM_ADMIN" },
      "totally-wrong-secret",
      { expiresIn: "12h" }
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `${COOKIE_NAME}=${tamperedToken}`);

    expect(res.status).toBe(401);
  });
});

// Middleware: requireRole

describe("requireRole middleware", () => {
  // We need a test route to exercise requireRole.
  // We'll create a mini Express app with a role-gated route.
  const express = require("express");
  const cookieParser = require("cookie-parser");
  const verifyToken = require("../../middlewares/verifyToken");
  const requireRole = require("../../middlewares/requireRole");
  const errorHandler = require("../../middlewares/errorHandler");

  let roleApp;

  beforeAll(() => {
    roleApp = express();
    roleApp.use(express.json());
    roleApp.use(cookieParser());

    // Only SYSTEM_ADMIN can access this route
    roleApp.get(
      "/admin/test-route",
      verifyToken,
      requireRole(["SYSTEM_ADMIN"]),
      (req, res) => {
        res.status(200).json({ message: "Access granted" });
      }
    );

    roleApp.use(errorHandler);
  });

  it("should return 200 when user has allowed role", async () => {
    const user = await createTestUser({ role: "SYSTEM_ADMIN" });
    const token = generateTestToken(user);

    const res = await request(roleApp)
      .get("/admin/test-route")
      .set("Cookie", `${COOKIE_NAME}=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Access granted");
  });

  it("should return 403 when user has disallowed role", async () => {
    const user = await createTestUser({ role: "ICU_NURSE" });
    const token = generateTestToken(user);

    const res = await request(roleApp)
      .get("/admin/test-route")
      .set("Cookie", `${COOKIE_NAME}=${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Forbidden");
  });

  it("should write an AuditLog row when role access is denied", async () => {
    const user = await createTestUser({ role: "MEDICAL_RESIDENT" });
    const token = generateTestToken(user);

    await request(roleApp)
      .get("/admin/test-route")
      .set("Cookie", `${COOKIE_NAME}=${token}`);

    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: user.id },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);

    const denialLog = auditLogs.find(
      (log) => log.newValues && log.newValues.denied === true
    );
    expect(denialLog).toBeTruthy();
    expect(denialLog.newValues.userRole).toBe("MEDICAL_RESIDENT");
    expect(denialLog.newValues.attemptedRoute).toContain("/admin/test-route");
  });

  it("should return 401 when no token is provided to a role-gated route", async () => {
    const res = await request(roleApp).get("/admin/test-route");

    expect(res.status).toBe(401);
  });
});
