const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");

// User: submit a new password reset request
const createRequest = async (userId, message) => {
  // Only allow one pending request at a time per user
  const existing = await prisma.passwordResetRequest.findFirst({
    where: { requesterId: userId, status: "PENDING" },
  });
  if (existing) {
    throw new APIError("You already have a pending password reset request. Please wait for the admin to respond.", 409);
  }

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

  return request;
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

// Admin: get all requests with requester info
const getAllRequests = async ({ status }) => {
  const where = {};
  if (status && status !== "ALL") where.status = status;

  const requests = await prisma.passwordResetRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      message: true,
      status: true,
      adminReply: true,
      createdAt: true,
      resolvedAt: true,
      requester: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
      resolvedBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return requests.map((r) => ({
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
};

// Admin: count pending requests (for sidebar badge)
const countPendingRequests = async () => {
  const count = await prisma.passwordResetRequest.count({
    where: { status: "PENDING" },
  });
  return { count };
};

// Admin: resolve a request with a reply (new temp password)
const resolveRequest = async (adminId, requestId, adminReply) => {
  const request = await prisma.passwordResetRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw new APIError("Request not found", 404);
  if (request.status === "RESOLVED") throw new APIError("This request is already resolved", 409);

  const updated = await prisma.passwordResetRequest.update({
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
  });

  return updated;
};

module.exports = {
  createRequest,
  getMyRequests,
  markRequestsSeen,
  countUnseenReplies,
  getAllRequests,
  countPendingRequests,
  resolveRequest,
};
