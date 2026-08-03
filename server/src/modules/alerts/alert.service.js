const prisma = require('../../utils/prismaClient');
const { getIo } = require('../../utils/socket');
const logger = require('../../utils/logger');

const alertService = {
  /**
   * Find an existing OPEN alert for a given admission to prevent duplicate spam.
   */
  async findOpenAlert(admissionId) {
    return prisma.alert.findFirst({
      where: {
        admissionId,
        status: 'OPEN',
        isArchived: false,
      },
    });
  },

  /**
   * Create a new alert and the corresponding notifications.
   *
   * Notifications carry `metadata` pointing at the admission's alerts tab, and
   * are pushed live over the socket exactly like notification.service.js does
   * for every other notification type — clinical alerts get the same
   * real-time delivery and the same "View Details" deep link as everything
   * else, not a parallel path that quietly does neither.
   */
  async createAlert(data) {
    const { alert, notifications } = await prisma.$transaction(async (tx) => {
      // 1. Create the alert
      const alert = await tx.alert.create({
        data: {
          admissionId: data.admissionId,
          severity: data.severity,
          title: data.title,
          triggeringMetrics: data.triggeringMetrics,
          clinicalReasoning: data.clinicalReasoning,
          status: 'OPEN',
        },
      });

      // 2. Fetch all staff assigned to this admission to notify them
      const admission = await tx.admission.findUnique({
        where: { id: data.admissionId },
        include: {
          doctor: true,
          nurses: {
            where: { isArchived: false, unassignedAt: null }
          }
        }
      });

      if (!admission) return { alert, notifications: [] };

      const userIdsToNotify = [];
      if (admission.doctorId) userIdsToNotify.push(admission.doctorId);

      admission.nurses.forEach(nurseAssignment => {
        userIdsToNotify.push(nurseAssignment.nurseId);
      });

      // 3. Create Notification rows. Individually rather than createMany:
      // createMany doesn't return the created rows, and the real-time emit
      // below needs each row's id to hand the client something it can mark
      // as read and deep-link from.
      const notifications = [];
      for (const userId of userIdsToNotify) {
        const notification = await tx.notification.create({
          data: {
            userId,
            title: `New Patient Alert: ${data.severity}`,
            message: data.title,
            type: 'ALERT',
            metadata: {
              entityType: 'ALERT',
              entityId: alert.id,
              admissionId: data.admissionId,
            },
          },
        });
        notifications.push(notification);
      }

      return { alert, notifications };
    });

    // Outside the transaction: only push over the socket once the alert and
    // its notifications are actually committed, so a client never receives a
    // live push for a row that a rollback then made not exist.
    try {
      const io = getIo();
      notifications.forEach(notification => {
        io.to(notification.userId.toString()).emit('notification', notification);
      });
    } catch (err) {
      logger.warn(`Socket.io not initialized — real-time alert notification skipped: ${err.message}`);
    }

    return { alert, userIdsToNotify: notifications.map(n => n.userId) };
  },

  /**
   * List alerts for a specific admission
   */
  async getAlertsByAdmission(admissionId, status) {
    const where = { admissionId, isArchived: false };
    if (status) where.status = status;

    return prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reviews: {
          include: {
            reviewer: {
              select: { id: true, firstName: true, lastName: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  },

  /**
   * List all alerts across the ward
   */
  async getAllAlerts(query = {}) {
    const { status, severity } = query;
    const where = { isArchived: false };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    return prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        admission: {
          include: {
            patient: {
              select: { id: true, name: true, mrn: true, age: true }
            },
            bed: {
              select: { id: true, bedNumber: true }
            }
          }
        }
      }
    });
  },

  /**
   * Reviews for a single alert, newest first.
   */
  async getReviewsByAlert(alertId) {
    return prisma.alertReview.findMany({
      where: { alertId },
      include: {
        reviewer: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Submit a review for an alert
   */
  async submitReview(alertId, reviewerId, reviewNotes, accepted) {
    return prisma.$transaction(async (tx) => {
      // Create the review
      const review = await tx.alertReview.create({
        data: {
          alertId,
          reviewerId,
          reviewNotes,
          accepted
        }
      });

      // Automatically update the alert status to REVIEWED
      await tx.alert.update({
        where: { id: alertId },
        data: { status: 'REVIEWED' }
      });

      return review;
    });
  }
};

module.exports = alertService;
