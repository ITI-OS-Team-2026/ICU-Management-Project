const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const bcrypt = require("bcrypt");
const notificationService = require("../notifications/notification.service");
const logger = require("../../utils/logger");
const { sendMail } = require("../../utils/emailClient");

/**
 * Every SYSTEM_ADMIN gets a live notification the moment a request comes in
 * — from any role, and regardless of whether the requester is signed in.
 * Without this, resolving a request depends entirely on an admin remembering
 * to check the Settings page; nothing today ever pushes it to them.
 *
 * Fire-and-forget on purpose: a notification failing must never block the
 * request itself from being recorded — the clinician's ability to get their
 * password reset can't depend on the notification pipe being healthy.
 */
const notifyAdminsOfNewRequest = async (request, requester) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "SYSTEM_ADMIN", status: "ACTIVE" },
      select: { id: true },
    });

    const requesterName =
      `${requester.firstName} ${requester.lastName}`.trim() || requester.email;

    await Promise.all(
      admins.map((admin) =>
        notificationService.createNotification({
          userId: admin.id,
          title: "Password reset requested",
          message: `${requesterName} (${requester.role}) requested a password reset.`,
          type: "ALERT",
          metadata: {
            entityType: "PASSWORD_RESET_REQUEST",
            entityId: request.id,
          },
        }),
      ),
    );
  } catch (err) {
    logger.error(
      `Failed to notify admins of password reset request ${request.id}: ${err.message}`,
    );
  }
};

// User: submit a new password reset request (authenticated — session already
// proves who they are, so this trusts req.user.id directly).
const createRequest = async (userId, message) => {
  // Only allow one pending request at a time per user
  const existing = await prisma.passwordResetRequest.findFirst({
    where: { requesterId: userId, status: "PENDING" },
  });
  if (existing) {
    throw new APIError(
      "You already have a pending password reset request. Please wait for the admin to respond.",
      409,
    );
  }

  const requester = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true, role: true },
  });

  const request = await prisma.passwordResetRequest.create({
    data: {
      requesterId: userId,
      message: message || null,
    },
    select: {
      id: true,
      message: true,
      status: true,
      createdAt: true,
    },
  });

  await notifyAdminsOfNewRequest(request, requester);

  return request;
};

/**
 * Guest: submit a request from the login page, with no session at all — the
 * scenario the authenticated route structurally cannot serve, since a locked-out
 * clinician has no token to send. Identifies the account by email instead.
 *
 * Reports back exactly what happened (unknown email, already pending, sent) —
 * a deliberate choice for this internal clinical roster over the generic
 * "if that email exists…" response: staff need to know whether they mistyped
 * their institutional address, not be shielded from confirming its existence
 * the way a public consumer signup form would.
 */
const createPublicRequest = async (email, message) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new APIError(
      "No active account was found for that email address.",
      404,
    );
  }

  const existing = await prisma.passwordResetRequest.findFirst({
    where: { requesterId: user.id, status: "PENDING" },
  });
  if (existing) {
    throw new APIError(
      "A reset request for this account is already pending. Please wait for the admin to respond.",
      409,
    );
  }

  const request = await prisma.passwordResetRequest.create({
    data: { requesterId: user.id, message: message || null },
    select: { id: true },
  });

  await notifyAdminsOfNewRequest(request, user);
};

// User: get their own requests (to see admin replies)
const getMyRequests = async (userId) => {
  const requests = await prisma.passwordResetRequest.findMany({
    where: { requesterId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      message: true,
      status: true,
      adminReply: true,
      seenByUser: true,
      createdAt: true,
      resolvedAt: true,
      resolvedBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return requests.map((r) => ({
    ...r,
    resolvedByName: r.resolvedBy
      ? `${r.resolvedBy.firstName} ${r.resolvedBy.lastName}`
      : null,
    resolvedBy: undefined,
  }));
};

// User: mark their replies as seen
const markRequestsSeen = async (userId) => {
  await prisma.passwordResetRequest.updateMany({
    where: { requesterId: userId, status: "RESOLVED", seenByUser: false },
    data: { seenByUser: true },
  });
};

// User: count unseen resolved requests (for sidebar badge)
const countUnseenReplies = async (userId) => {
  const count = await prisma.passwordResetRequest.count({
    where: { requesterId: userId, status: "RESOLVED", seenByUser: false },
  });
  return { count };
};

// Admin: get requests with pagination, filtering, and search
const getAllRequests = async ({ status, page = 1, limit = 10, search }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where = {};
  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search && String(search).trim()) {
    const term = String(search).trim();
    where.OR = [
      { requester: { email: { contains: term, mode: "insensitive" } } },
      { requester: { firstName: { contains: term, mode: "insensitive" } } },
      { requester: { lastName: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [total, requests] = await Promise.all([
    prisma.passwordResetRequest.count({ where }),
    prisma.passwordResetRequest.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        message: true,
        status: true,
        adminReply: true,
        createdAt: true,
        resolvedAt: true,
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        resolvedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  const data = requests.map((r) => ({
    id: r.id,
    message: r.message,
    status: r.status,
    adminReply: r.adminReply,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    requester: {
      id: r.requester.id,
      first_name: r.requester.firstName,
      last_name: r.requester.lastName,
      email: r.requester.email,
      role: r.requester.role,
    },
    resolvedByName: r.resolvedBy
      ? `${r.resolvedBy.firstName} ${r.resolvedBy.lastName}`
      : null,
  }));

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

// Admin: count pending requests (for sidebar badge)
const countPendingRequests = async () => {
  const count = await prisma.passwordResetRequest.count({
    where: { status: "PENDING" },
  });
  return { count };
};

// Admin: resolve a request — saves reply message AND actually updates the user's password
const resolveRequest = async (adminId, requestId, adminReply) => {
  const request = await prisma.passwordResetRequest.findUnique({
    where: { id: requestId },
    include: {
      requester: {
        select: { id: true, email: true, firstName: true, role: true },
      },
    },
  });
  if (!request) throw new APIError("Request not found", 404);
  if (request.status === "RESOLVED")
    throw new APIError("This request is already resolved", 409);

  if (request.requester.role === "SYSTEM_ADMIN") {
    if (adminId === request.requester.id) {
      throw new APIError(
        "A SYSTEM_ADMIN password reset request must be approved by a different active SYSTEM_ADMIN.",
        403,
      );
    }

    const otherAdmins = await prisma.user.count({
      where: {
        role: "SYSTEM_ADMIN",
        status: "ACTIVE",
        id: { not: request.requester.id },
      },
    });

    if (otherAdmins === 0) {
      throw new APIError(
        "Cannot resolve a SYSTEM_ADMIN password reset request in-app when no other active SYSTEM_ADMIN exists. Use emergency support to reset this account.",
        403,
      );
    }
  }

  // Hash the new temp password
  const passwordHash = await bcrypt.hash(adminReply, 10);

  // Update both the request record AND the user's actual password atomically
  const [updated] = await prisma.$transaction([
    prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: "RESOLVED",
        adminReply,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        adminReply: true,
        resolvedAt: true,
      },
    }),
    prisma.user.update({
      where: { id: request.requesterId },
      data: { passwordHash },
    }),
  ]);

  // Fire-and-forget: the password is already updated in the DB transaction
  // above. Don't block the HTTP response on email delivery — the admin sees
  // the temp password in the UI regardless.
  sendMail({
    to: request.requester.email,
    subject: "Your ICU SmartCare password has been reset",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1e3a8a;">ICU SmartCare</h2>
        <p>Hi ${request.requester.firstName || "there"},</p>
        <p>An administrator has reset your password. Your temporary password is:</p>
        <p style="font-size: 18px; font-weight: bold; letter-spacing: 1px; padding: 12px; background: #f4f4f4; border-radius: 4px; display: inline-block;">${adminReply}</p>
        <p>Please log in and change your password immediately.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">&mdash; ICU SmartCare System</p>
      </div>
    `,
  }).catch((err) =>
    logger.error(
      `Failed to email temp password to ${request.requester.email}: ${err.message}`,
    ),
  );

  return updated;
};

module.exports = {
  createRequest,
  createPublicRequest,
  getMyRequests,
  markRequestsSeen,
  countUnseenReplies,
  getAllRequests,
  countPendingRequests,
  resolveRequest,
};
