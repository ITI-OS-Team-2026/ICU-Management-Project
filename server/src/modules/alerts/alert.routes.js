const express = require('express');
const alertController = require('./alert.controller');
const verifyToken = require('../../middlewares/verifyToken');
const restrictTo = require('../../middlewares/restrictTo');

const router = express.Router();

// Require authentication for all alert routes
router.use(verifyToken);

// GET /alerts (Ward-wide alerts)
// Accessible by Nurse, Resident, Specialist
router.get('/', 
  restrictTo(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']), 
  alertController.getAllAlerts
);

// GET /alerts/:id/reviews
router.get('/:id/reviews', 
  restrictTo(['ICU_NURSE', 'MEDICAL_RESIDENT', 'ICU_SPECIALIST']), 
  alertController.getReviews
);

// POST /alerts/:id/reviews
// Accessible by Resident and Specialist ONLY
router.post('/:id/reviews', 
  restrictTo(['MEDICAL_RESIDENT', 'ICU_SPECIALIST']), 
  alertController.submitReview
);

// Admission scoped routes
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
