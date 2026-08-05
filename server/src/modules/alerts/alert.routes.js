const express = require('express');
const alertController = require('./alert.controller');
const verifyToken = require('../../middlewares/verifyToken');
const restrictTo = require('../../middlewares/restrictTo');

const router = express.Router();

// Require authentication for all alert routes
router.use(verifyToken);

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: List ward-wide clinical alerts
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: Alert list
 * /alerts/{id}/reviews:
 *   get:
 *     summary: List reviews submitted for an alert
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Review list
 *   post:
 *     summary: Submit a clinical review of an alert (doctors only)
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Review submitted
 */
router.get('/',
  restrictTo(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
  alertController.getAllAlerts
);

router.get('/:id/reviews',
  restrictTo(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
  alertController.getReviews
);

router.post('/:id/reviews',
  restrictTo(['MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
  alertController.submitReview
);

// Admission scoped routes
/**
 * @swagger
 * /admissions/{id}/alerts:
 *   get:
 *     summary: List alerts for a specific admission
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Alert list
 */
const admissionAlertsRouter = express.Router();
admissionAlertsRouter.use(verifyToken);
admissionAlertsRouter.get('/:id/alerts',
  restrictTo(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']),
  alertController.getAdmissionAlerts
);

module.exports = {
  alertRouter: router,
  admissionAlertsRouter
};
