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

const getUserNotifications = async (userId, options = {}) => {
  const { status, limit = 50 } = options;
  const where = { userId };
  if (status) {
    where.status = status;
  }

  return await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
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
