const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const adminRoutes = require("../modules/admin/admin.routes");
const patientRoutes = require("../modules/patients/patient.routes");
const admissionRoutes = require("../modules/admissions/admission.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/", patientRoutes);
router.use("/admissions", admissionRoutes);

module.exports = router;
