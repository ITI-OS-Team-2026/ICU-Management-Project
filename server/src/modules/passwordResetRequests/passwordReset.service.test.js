const bcrypt = require("bcrypt");
const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");

jest.mock("../../utils/emailClient", () => ({
  sendMail: jest.fn().mockResolvedValue(null),
}));

const passwordResetService = require("./passwordReset.service");

describe("Password reset service - SYSTEM_ADMIN emergency support guard", () => {
  const ADMIN_EMAIL_1 = "admin1@smartcare.test";
  const ADMIN_EMAIL_2 = "admin2@smartcare.test";
  const TEST_PASSWORD = "SecureP@ssw0rd!";

  const createAdminUser = async (overrides = {}) => {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    return prisma.user.create({
      data: {
        firstName: "Sys",
        lastName: "Admin",
        email: overrides.email || ADMIN_EMAIL_1,
        passwordHash,
        role: "SYSTEM_ADMIN",
        status: overrides.status || "ACTIVE",
        ...overrides,
      },
    });
  };

  const cleanupTestData = async () => {
    await prisma.passwordResetRequest.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: { in: [ADMIN_EMAIL_1, ADMIN_EMAIL_2] },
      },
    });
  };

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it("should reject a SYSTEM_ADMIN password reset request when the same SYSTEM_ADMIN tries to resolve it", async () => {
    const admin = await createAdminUser({ email: ADMIN_EMAIL_1 });
    const request = await prisma.passwordResetRequest.create({
      data: {
        requesterId: admin.id,
        message: "Please reset my password",
      },
    });

    await expect(
      passwordResetService.resolveRequest(
        admin.id,
        request.id,
        "TempP@ssw0rd1",
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      message:
        "A SYSTEM_ADMIN password reset request must be approved by a different active SYSTEM_ADMIN.",
    });
  });

  it("should reject a SYSTEM_ADMIN password reset request when no other active SYSTEM_ADMIN exists", async () => {
    const admin = await createAdminUser({ email: ADMIN_EMAIL_1 });
    const otherAdmin = await prisma.user.create({
      data: {
        firstName: "Disabled",
        lastName: "Admin",
        email: ADMIN_EMAIL_2,
        passwordHash: await bcrypt.hash(TEST_PASSWORD, 10),
        role: "SYSTEM_ADMIN",
        status: "INACTIVE",
      },
    });

    const activeOtherAdmins = await prisma.user.findMany({
      where: {
        role: "SYSTEM_ADMIN",
        status: "ACTIVE",
        id: { not: admin.id },
      },
      select: { id: true },
    });

    await prisma.user.updateMany({
      where: {
        role: "SYSTEM_ADMIN",
        status: "ACTIVE",
        id: { not: admin.id },
      },
      data: { status: "INACTIVE" },
    });

    const request = await prisma.passwordResetRequest.create({
      data: {
        requesterId: admin.id,
        message: "Locked out",
      },
    });

    await expect(
      passwordResetService.resolveRequest(
        otherAdmin.id,
        request.id,
        "TempP@ssw0rd1",
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      message:
        "Cannot resolve a SYSTEM_ADMIN password reset request in-app when no other active SYSTEM_ADMIN exists. Use emergency support to reset this account.",
    });

    await prisma.user.updateMany({
      where: { id: { in: activeOtherAdmins.map((admin) => admin.id) } },
      data: { status: "ACTIVE" },
    });
  });

  it("should allow a SYSTEM_ADMIN password reset request to be resolved by a different active SYSTEM_ADMIN", async () => {
    const admin = await createAdminUser({ email: ADMIN_EMAIL_1 });
    const secondAdmin = await createAdminUser({ email: ADMIN_EMAIL_2 });
    const request = await prisma.passwordResetRequest.create({
      data: {
        requesterId: admin.id,
        message: "Locked out",
      },
    });

    const result = await passwordResetService.resolveRequest(
      secondAdmin.id,
      request.id,
      "TempP@ssw0rd1",
    );

    expect(result.status).toBe("RESOLVED");
    expect(result.adminReply).toBe("TempP@ssw0rd1");

    const updatedUser = await prisma.user.findUnique({
      where: { id: admin.id },
    });
    expect(updatedUser).not.toBeNull();
    expect(
      await bcrypt.compare("TempP@ssw0rd1", updatedUser.passwordHash),
    ).toBe(true);
  });
});
