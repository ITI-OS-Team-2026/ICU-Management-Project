const prisma = require('../../utils/prismaClient');

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
   */
  async createAlert(data) {
    return prisma.$transaction(async (tx) => {
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

      if (!admission) return { alert, userIdsToNotify: [] };

      const userIdsToNotify = [];
      if (admission.doctorId) userIdsToNotify.push(admission.doctorId);
      
      admission.nurses.forEach(nurseAssignment => {
        userIdsToNotify.push(nurseAssignment.nurseId);
      });

      // 3. Create Notification rows
      if (userIdsToNotify.length > 0) {
        await tx.notification.createMany({
          data: userIdsToNotify.map(userId => ({
            userId,
            title: `New Patient Alert: ${data.severity}`,
            message: data.title,
            type: 'ALERT',
            // Assuming Notification model has these fields or similar.
          })),
          skipDuplicates: true, // Safe guard
        });
      }

      return { alert, userIdsToNotify };
    });
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
