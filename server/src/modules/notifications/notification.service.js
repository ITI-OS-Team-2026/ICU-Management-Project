const prisma = require("../../utils/prismaClient");
const { getIo } = require("../../utils/socket");

/**
 * Creates a new notification in the database and emits it via socket.io
 *
 * @param {Object} data
 * @param {String} data.userId
 * @param {String} data.title
 * @param {String} data.message
 * @param {String} [data.type="INFO"] - INFO, ALERT, SUMMON
 * @param {Object} [data.metadata] - JSON payload for deep-linking
 */
const createNotification = async (data) => {
  const notification = await prisma.notification.create({
    data,
  });

  try {
    const io = getIo();
    io.to(data.userId.toString()).emit("notification", notification);
  } catch (err) {
    console.error("Failed to emit socket notification:", err);
  }

  return notification;
};

/**
 * Cursor-paginated notifications, newest first. `cursor` is the id of the
 * last notification the caller already has — pass back `nextCursor` from the
 * previous page to fetch the next one.
 *
 * Cursor over offset because notifications keep arriving in real time; an
 * offset page would skip or repeat rows as new ones land above it, while a
 * cursor anchored to an id is stable regardless of what's been inserted since.
 *
 * `createdAt` alone isn't a safe cursor — two notifications can share a
 * timestamp — so ordering (and the cursor) is `createdAt desc, id desc`,
 * unique and deterministic.
 */
const getUserNotifications = async (userId, options = {}) => {
  const { status, limit = 20, cursor } = options;
  const where = { userId };
  if (status) {
    where.status = status;
  }

  const rows = await prisma.notification.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    // One extra row: if it comes back, there's a next page.
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const notifications = hasMore ? rows.slice(0, limit) : rows;

  return {
    notifications,
    hasMore,
    nextCursor: hasMore ? notifications[notifications.length - 1].id : null,
  };
};

const markAsRead = async (notificationId, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw new Error("Notification not found or unauthorized");
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { status: "READ" },
  });
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
};
