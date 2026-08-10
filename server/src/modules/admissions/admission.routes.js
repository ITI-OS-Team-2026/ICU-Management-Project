const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const admissionController = require("./admission.controller");
const {
  admissionCreateSchema,
  admissionQuerySchema,
  admissionCensusQuerySchema,
  nurseAssignSchema,
  fullAdmissionCreateSchema,
} = require("./admission.schema");
const notificationController = require("../notifications/notification.controller");

const router = express.Router();

const clinicalRoles = ["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"];
const nurseOrSpecialist = ["ICU_NURSE", "ICU_SPECIALIST"];

/**
 * @swagger
 * /admissions:
 *   post:
 *     summary: Create an admission (patient and bed must already exist)
 *     tags: [Admissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, bedId, doctorId]
 *             properties:
 *               patientId: { type: string, format: uuid }
 *               bedId: { type: string, format: uuid }
 *               doctorId: { type: string, format: uuid }
 *               chiefComplaint: { type: string }
 *     responses:
 *       201:
 *         description: Admission created
 *   get:
 *     summary: List admissions
 *     tags: [Admissions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, DISCHARGED, ARCHIVED] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Admission list
 */
router.post(
  "/",
  verifyToken,
  restrictTo(clinicalRoles),
  validate({ body: admissionCreateSchema }),
  admissionController.createAdmission
);

/**
 * @swagger
 * /admissions/full:
 *   post:
 *     summary: Create a patient, bed occupancy, and admission in one call
 *     description: The single-page "admit patient" wizard's endpoint — creates the Patient row too if needed.
 *     tags: [Admissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Admission created
 */
router.post(
  "/full",
  verifyToken,
  restrictTo(clinicalRoles),
  validate({ body: fullAdmissionCreateSchema }),
  admissionController.createFullAdmission
);

router.get(
  "/",
  verifyToken,
  restrictTo(clinicalRoles),
  validate({ query: admissionQuerySchema }),
  admissionController.getAdmissions
);

router.get(
  "/clinical-logs",
  verifyToken,
  restrictTo(clinicalRoles),
  admissionController.getClinicalLogs
);

// Must stay above "/:id" so "census" isn't parsed as an admission id.
/**
 * @swagger
 * /admissions/census:
 *   get:
 *     summary: Ward census counts (used by dashboards)
 *     tags: [Admissions]
 *     responses:
 *       200:
 *         description: Census counts
 */
router.get(
  "/census",
  verifyToken,
  restrictTo(clinicalRoles),
  validate({ query: admissionCensusQuerySchema }),
  admissionController.getAdmissionCensus
);

/**
 * @swagger
 * /admissions/{id}:
 *   get:
 *     summary: Get an admission by ID
 *     tags: [Admissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Admission with its clinical sub-resources
 *   delete:
 *     summary: Archive an admission
 *     tags: [Admissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Archived
 */
router.get(
  "/:id",
  verifyToken,
  restrictTo(clinicalRoles),
  admissionController.getAdmissionById
);

/**
 * @swagger
 * /admissions/{id}/discharge:
 *   patch:
 *     summary: Discharge a patient and free their bed
 *     tags: [Admissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Discharged admission
 */
router.patch(
  "/:id/discharge",
  verifyToken,
  restrictTo(["ICU_SPECIALIST"]),
  admissionController.dischargeAdmission
);

router.delete(
  "/:id",
  verifyToken,
  restrictTo(["ICU_SPECIALIST"]),
  admissionController.archiveAdmission
);

/**
 * @swagger
 * /admissions/{id}/nurses:
 *   post:
 *     summary: Assign a nurse to an admission
 *     tags: [Admissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nurseId]
 *             properties:
 *               nurseId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Assignment created
 *   get:
 *     summary: List nurses currently assigned to an admission
 *     tags: [Admissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Nurse assignments
 * /admissions/{id}/nurses/{nurseId}:
 *   delete:
 *     summary: Unassign a nurse from an admission
 *     tags: [Admissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: nurseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Unassigned
 */
router.post(
  "/:id/nurses",
  verifyToken,
  restrictTo(nurseOrSpecialist),
  validate({ body: nurseAssignSchema }),
  admissionController.assignNurse
);

router.get(
  "/:id/nurses",
  verifyToken,
  restrictTo(clinicalRoles),
  admissionController.getAdmissionNurses
);

router.delete(
  "/:id/nurses/:nurseId",
  verifyToken,
  restrictTo(nurseOrSpecialist),
  admissionController.unassignNurse
);

/**
 * @swagger
 * /admissions/{id}/summon:
 *   post:
 *     summary: Summon the attending doctor (urgent bedside notification)
 *     tags: [Admissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Notification sent
 */
router.post(
  "/:id/summon",
  verifyToken,
  restrictTo(["ICU_NURSE"]),
  notificationController.summonDoctor
);

module.exports = router;
