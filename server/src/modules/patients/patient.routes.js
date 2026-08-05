const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const patientController = require("./patient.controller");
const {
  patientCreateSchema,
  patientQuerySchema,
  allergyCreateSchema,
  medicalHistoryCreateSchema,
  medicalHistoryUpdateSchema
} = require("./patient.schema");

const router = express.Router();

// Patients

/**
 * @swagger
 * /patients:
 *   post:
 *     summary: Create a patient record
 *     tags: [Patients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, mrn, age, gender]
 *             properties:
 *               name: { type: string }
 *               mrn: { type: string, description: Medical record number, unique }
 *               age: { type: integer }
 *               gender: { type: string }
 *     responses:
 *       201:
 *         description: Patient created
 *   get:
 *     summary: List / search patients
 *     tags: [Patients]
 *     parameters:
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
 *         description: Patient list
 */
router.post(
  "/",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: patientCreateSchema }),
  patientController.createPatient
);

router.get(
  "/",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ query: patientQuerySchema }),
  patientController.getPatients
);

/**
 * @swagger
 * /patients/{id}:
 *   get:
 *     summary: Get a patient by ID
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Patient
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a patient record
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
router.get(
  "/:id",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  patientController.getPatientById
);

router.delete(
  "/:id",
  verifyToken,
  restrictTo(["ICU_SPECIALIST"]),
  patientController.deletePatient
);

// Allergies

/**
 * @swagger
 * /patients/{id}/allergies:
 *   post:
 *     summary: Add an allergy
 *     tags: [Patients]
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
 *             required: [allergen]
 *             properties:
 *               allergen: { type: string }
 *               severity: { type: string }
 *     responses:
 *       201:
 *         description: Allergy added
 *   get:
 *     summary: List a patient's allergies
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Allergy list
 * /patients/allergies/{id}:
 *   delete:
 *     summary: Remove an allergy
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
router.post(
  "/:id/allergies",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: allergyCreateSchema }),
  patientController.createAllergy
);

router.get(
  "/:id/allergies",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  patientController.getAllergies
);

router.delete(
  "/allergies/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  patientController.deleteAllergy
);

// Medical History

/**
 * @swagger
 * /patients/{id}/medical-history:
 *   post:
 *     summary: Create the patient's medical history
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Created
 *   get:
 *     summary: Get the patient's medical history
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Medical history
 *   patch:
 *     summary: Update the patient's medical history
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 */
router.post(
  "/:id/medical-history",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: medicalHistoryCreateSchema }),
  patientController.createMedicalHistory
);

router.get(
  "/:id/medical-history",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  patientController.getMedicalHistory
);

router.patch(
  "/:id/medical-history",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: medicalHistoryUpdateSchema }),
  patientController.updateMedicalHistory
);

module.exports = router;
