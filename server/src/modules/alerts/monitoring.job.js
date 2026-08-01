const cron = require('node-cron');
const prisma = require('../../utils/prismaClient');
const { calculateScore } = require('./news2');
const alertService = require('./alert.service');
const { getIo } = require('../../utils/socket');
const logger = require('../../utils/logger');

const runMonitoringCycle = async () => {
  logger.info('Running Alerts Monitoring Cycle...');
  try {
    // 1. Fetch all active admissions with their latest vitals
    const activeAdmissions = await prisma.admission.findMany({
      where: {
        status: 'ACTIVE',
        isArchived: false,
      },
      include: {
        vitalSigns: {
          orderBy: { recordedAt: 'desc' },
          take: 1
        }
      }
    });

    for (const admission of activeAdmissions) {
      if (!admission.vitalSigns || admission.vitalSigns.length === 0) {
        continue;
      }

      const latestVitals = admission.vitalSigns[0];

      // 2. Run NEWS2 math
      const scoreResult = calculateScore(latestVitals);

      if (scoreResult.severity) {
        // 3. Check for existing OPEN alert
        const existingAlert = await alertService.findOpenAlert(admission.id);
        
        if (existingAlert) {
          logger.info(`Admission ${admission.id} already has OPEN alert. Skipping.`);
          continue;
        }

        // We skip AI Bedrock as requested

        // 5. Create Alert
        logger.info(`Creating ${scoreResult.severity} alert for admission ${admission.id}`);
        const { alert, userIdsToNotify } = await alertService.createAlert({
          admissionId: admission.id,
          severity: scoreResult.severity,
          title: scoreResult.title,
          triggeringMetrics: {
            news2_total: scoreResult.total,
            ...scoreResult.breakdown
          },
          clinicalReasoning: null // AI skipped
        });

        // 6. Emit real-time notification
        let io;
        try {
          io = getIo();
        } catch (e) {
          logger.warn('Socket.io not initialized. Skipping real-time event.');
        }

        if (io) {
          userIdsToNotify.forEach(userId => {
            // Emitting to standard room patterns if applicable, or globally broadcast if simple
            // Assuming users join a room matching their ID:
            io.to(userId.toString()).emit('new_alert', {
              id: alert.id,
              severity: alert.severity,
              title: alert.title,
              admissionId: alert.admissionId
            });
          });
        }
      }
    }
    logger.info('Alerts Monitoring Cycle completed.');
  } catch (error) {
    logger.error(`Error in Alerts Monitoring Cycle: ${error.message}`);
    throw error;
  }
};

const startMonitoring = () => {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', runMonitoringCycle);
  logger.info('Alerts Monitoring Job started.');
};

module.exports = {
  startMonitoring,
  runMonitoringCycle
};
