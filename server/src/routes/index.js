const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const adminRoutes = require("../modules/admin/admin.routes");
const patientRoutes = require("../modules/patients/patient.routes");
const admissionRoutes = require("../modules/admissions/admission.routes");
const { admissionDiagnosisRouter, diagnosisRouter } = require("../modules/diagnoses/diagnosis.routes");
const { admissionVitalsRouter, vitalsRouter } = require("../modules/vitalSigns/vitalSign.routes");
const { admissionMedicationsRouter, medicationsRouter, administrationsRouter } = require("../modules/medications/medication.routes");
const { admissionInvestigationRouter, investigationRouter } = require("../modules/investigationOrders/investigationOrder.routes");
const { admissionLabsRouter, labsRouter } = require("../modules/labResults/labResult.routes");
const { admissionExaminationsRouter } = require("../modules/clinicalExaminations/examination.routes");
const { admissionNotesRouter, baseNotesRouter } = require("../modules/notes/note.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/", patientRoutes);
router.use("/admissions", admissionRoutes);
router.use("/admissions", admissionDiagnosisRouter);
router.use("/admissions", admissionVitalsRouter);
router.use("/admissions", admissionMedicationsRouter);
router.use("/admissions", admissionInvestigationRouter);
router.use("/admissions", admissionLabsRouter);
router.use("/admissions", admissionExaminationsRouter);
router.use("/admissions", admissionNotesRouter);
router.use("/diagnoses", diagnosisRouter);
router.use("/vitals", vitalsRouter);
router.use("/medications", medicationsRouter);
router.use("/medication-administrations", administrationsRouter);
router.use("/investigation-orders", investigationRouter);
router.use("/labs", labsRouter);
router.use("/notes", baseNotesRouter);

module.exports = router;
