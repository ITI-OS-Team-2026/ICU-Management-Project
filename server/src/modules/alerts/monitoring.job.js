const cron = require('node-cron');
const prisma = require('../../utils/prismaClient');
const { calculateScore } = require('./news2');
const alertService = require('./alert.service');
const logger = require('../../utils/logger');

const { generateAlertReasoning } = require('./alertAi.service');

// node-cron does not wait for a prior invocation to finish before firing the
// next one. Each admission needing a new alert makes a sequential Bedrock
// call (up to a 30s timeout apiece); a ward with several admissions newly
// deteriorating in the same cycle can easily run past the 2-minute schedule.
// Without this guard, an overlapping run re-checks the same admissions before
// the first run's alert is committed, sees no OPEN alert yet, and creates a
// duplicate. This makes the check-then-create in the loop below effectively
// atomic with respect to this job, even though it is not atomic at the DB level.
let cycleInFlight = false;

const runMonitoringCycle = async () => {
  if (cycleInFlight) {
    logger.warn('Alerts Monitoring Cycle still running from a previous tick — skipping this one.');
    return;
  }
  cycleInFlight = true;

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
          // Expected steady-state noise for any admission with an unresolved
          // alert — every 2-minute cycle re-evaluates it and finds nothing new
          // to do. Not operationally interesting at info level; alert
          // creation and cycle boundaries are.
          logger.debug(`Admission ${admission.id} already has OPEN alert. Skipping.`);
          continue;
        }

        // 4. Generate AI Clinical Reasoning via Bedrock (Graceful degradation on failure)
        const clinicalReasoning = await generateAlertReasoning(scoreResult);

        // 5. Create the alert. Notification rows (and their real-time push to
        // each recipient) are handled inside createAlert — see alert.service.js.
        logger.info(`Creating ${scoreResult.severity} alert for admission ${admission.id}`);
        await alertService.createAlert({
          admissionId: admission.id,
          severity: scoreResult.severity,
          title: scoreResult.title,
          triggeringMetrics: {
            news2_total: scoreResult.total,
            ...scoreResult.breakdown
          },
          clinicalReasoning
        });
      }
    }
    logger.info('Alerts Monitoring Cycle completed.');
  } catch (error) {
    logger.error(`Error in Alerts Monitoring Cycle: ${error.message}`, { stack: error.stack });
  } finally {
    cycleInFlight = false;
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
