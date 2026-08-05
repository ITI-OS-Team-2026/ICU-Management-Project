const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const prisma = require("../src/utils/prismaClient");
const bcrypt = require("bcrypt");
const fs = require("fs");
const { seedICUPatients } = require("./icuPatientSeed");
const { seedDemoExtras } = require("./seedDemoExtras");
const { normalizeFrequency, inferRoute } = require("../src/modules/medications/medication.frequency");

// Shared helper to seed a user. Uses upsert to be idempotent.
async function seedUser({ email, password, firstName, lastName, role }) {
  const normalizedEmail = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { firstName, lastName, role, status: "ACTIVE" },
    create: { email: normalizedEmail, passwordHash, firstName, lastName, role, status: "ACTIVE" },
  });

  return user;
}

async function main() {
  console.log("Starting comprehensive database seeding...");

  // ── Seed users ─────────────────────────────────────────────────────────
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@smartcare.icu").trim();
  const adminPassword = (process.env.SEED_ADMIN_PASSWORD || "SuperSecurePassword2026!").trim();
  if (!adminEmail || !adminPassword) {
    throw new Error("Missing SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD");
  }

  const admin = await seedUser({
    email: adminEmail,
    password: adminPassword,
    firstName: process.env.SEED_ADMIN_FIRST_NAME || "Ahmed",
    lastName: process.env.SEED_ADMIN_LAST_NAME || "Ramadan",
    role: "SYSTEM_ADMIN",
  });
  console.log(`✓ System Admin (ID: ${admin.id})`);

  const nurseEmail = (process.env.SEED_NURSE_EMAIL || "nurse@smartcare.icu").trim();
  const nursePassword = (process.env.SEED_NURSE_PASSWORD || "SuperSecurePassword2026!").trim();
  const nurse = nurseEmail && nursePassword ? await seedUser({
    email: nurseEmail, password: nursePassword,
    firstName: process.env.SEED_NURSE_FIRST_NAME || "Mariam",
    lastName: process.env.SEED_NURSE_LAST_NAME || "Ahmed",
    role: "ICU_NURSE",
  }) : null;
  if (nurse) console.log(`✓ ICU Nurse (ID: ${nurse.id})`);

  const residentEmail = (process.env.SEED_RESIDENT_EMAIL || "resident@smartcare.icu").trim();
  const residentPassword = (process.env.SEED_RESIDENT_PASSWORD || "SuperSecurePassword2026!").trim();
  const resident = residentEmail && residentPassword ? await seedUser({
    email: residentEmail, password: residentPassword,
    firstName: process.env.SEED_RESIDENT_FIRST_NAME || "Omar",
    lastName: process.env.SEED_RESIDENT_LAST_NAME || "Sayed",
    role: "MEDICAL_RESIDENT",
  }) : null;
  if (resident) console.log(`✓ Medical Resident (ID: ${resident.id})`);

  const specialistEmail = (process.env.SEED_SPECIALIST_EMAIL || "specialist@smartcare.icu").trim();
  const specialistPassword = (process.env.SEED_SPECIALIST_PASSWORD || "SuperSecurePassword2026!").trim();
  const specialist = specialistEmail && specialistPassword ? await seedUser({
    email: specialistEmail, password: specialistPassword,
    firstName: process.env.SEED_SPECIALIST_FIRST_NAME || "Mohamed",
    lastName: process.env.SEED_SPECIALIST_LAST_NAME || "Ramadan",
    role: "ICU_SPECIALIST",
  }) : null;
  if (specialist) console.log(`✓ ICU Specialist (ID: ${specialist.id})`);

  const specialist2 = await seedUser({
    email: "specialist2@smartcare.icu", password: specialistPassword,
    firstName: "Alexandra", lastName: "Vance", role: "ICU_SPECIALIST",
  });

  const resident2 = await seedUser({
    email: "resident2@smartcare.icu", password: residentPassword,
    firstName: "Tariq", lastName: "Al-Mansoor", role: "MEDICAL_RESIDENT",
  });

  const nurse2 = await seedUser({
    email: "nurse2@smartcare.icu", password: nursePassword,
    firstName: "Sarah", lastName: "Jenkins", role: "ICU_NURSE",
  });

  if (!specialist || !resident || !nurse) {
    console.log("Missing critical roles; stopping seed.");
    process.exit(0);
  }

  await seedICUPatients({ specialistUser: specialist, specialist2User: specialist2, residentUser: resident, resident2User: resident2, nurseUser: nurse, nurse2User: nurse2 });

  // ── Reference medical knowledge base (available to all patients) ──────────
  const referenceDocPath = path.join(__dirname, "../uploads/documents/history-taking-chest-diseases.pdf");
  const referenceDocExists = fs.existsSync(referenceDocPath);
  const referenceDocStats = referenceDocExists ? fs.statSync(referenceDocPath) : null;

  // ── Comprehensive patient seed ──────────────────────────────────────────
  const seedPatients = [
    { name: "Emma Rodriguez", mrn: "MRN-EMMA-001", age: 52, gender: "Female", bedNumber: "CCU-7/R3", chiefComplaint: "Chest pain and dyspnea", nurse: nurse },
    { name: "James Porter", mrn: "MRN-JAMES-002", age: 59, gender: "Male", bedNumber: "CCU-7/B5", chiefComplaint: "Acute MI with cardiogenic shock", nurse: nurse2 },
    { name: "Liu Wei", mrn: "MRN-LIU-003", age: 64, gender: "Male", bedNumber: "CCU-8/B2", chiefComplaint: "Septic shock, pneumonia", nurse: nurse },
    { name: "Sofia Martinez", mrn: "MRN-SOFIA-004", age: 41, gender: "Female", bedNumber: "ICU-N/R7", chiefComplaint: "Respiratory failure post-op", nurse: nurse2 },
    { name: "Derek Thompson", mrn: "MRN-DEREK-005", age: 48, gender: "Male", bedNumber: "ICU-S/R4", chiefComplaint: "Acute liver failure", nurse: nurse },
    { name: "Fatima Al-Hassan", mrn: "MRN-FATIMA-006", age: 37, gender: "Female", bedNumber: "ICU-S/R1", chiefComplaint: "Severe DKA", nurse: nurse2 },
  ];

  for (const p of seedPatients) {
    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.upsert({
        where: { mrn: p.mrn },
        update: { name: p.name, age: p.age, gender: p.gender },
        create: { mrn: p.mrn, name: p.name, age: p.age, gender: p.gender },
      });

      const bed = await tx.bed.upsert({
        where: { bedNumber: p.bedNumber },
        update: { status: "OCCUPIED" },
        create: { bedNumber: p.bedNumber, status: "OCCUPIED" },
      });

      let admission = await tx.admission.findFirst({
        where: { patientId: patient.id, status: "ACTIVE", isArchived: false },
      });

      if (!admission) {
        admission = await tx.admission.create({
          data: {
            patientId: patient.id, bedId: bed.id, doctorId: specialist.id,
            status: "ACTIVE", chiefComplaint: p.chiefComplaint,
          },
        });
      } else {
        admission = await tx.admission.update({
          where: { id: admission.id },
          data: { bedId: bed.id, doctorId: specialist.id, chiefComplaint: p.chiefComplaint },
        });
      }

      console.log(`✓ ${p.name} in ${p.bedNumber} (Admission: ${admission.id.slice(0, 8)}…)`);

      // ── Nurse assignment ──────────────────────────────────────────────────
      const existingNurseAssignment = await tx.admissionNurse.findFirst({
        where: { admissionId: admission.id, nurseId: p.nurse.id, unassignedAt: null },
      });
      if (!existingNurseAssignment) {
        await tx.admissionNurse.create({
          data: { admissionId: admission.id, nurseId: p.nurse.id, assignedAt: admission.admittedAt },
        });
      }

      // ── Reference document (available to all patients) ──────────────────────
      if (referenceDocExists && referenceDocStats) {
        const refDocCount = await tx.medicalDocument.count({
          where: { admissionId: admission.id, originalFilename: "history-taking-chest-diseases.pdf" },
        });
        if (refDocCount === 0) {
          await tx.medicalDocument.create({
            data: {
              admissionId: admission.id,
              uploadedBy: specialist.id,
              documentType: "clinical",
              originalFilename: "history-taking-chest-diseases.pdf",
              filePath: referenceDocPath,
              mimeType: "application/pdf",
              fileSize: referenceDocStats.size,
              embeddingStatus: "PENDING",
            },
          });
        }
      }

      // ── Vitals history ─────────────────────────────────────────────────────
      const vitalsCount = await tx.vitalSign.count({ where: { admissionId: admission.id } });
      if (vitalsCount === 0) {
        const now = new Date();
        const vitalsTemplate = {
          "MRN-EMMA-001": [
            { h: 24, t: 37.2, p: 88, sbp: 135, dbp: 85, rr: 18, spo2: 97 },
            { h: 18, t: 37.4, p: 92, sbp: 132, dbp: 83, rr: 19, spo2: 96 },
            { h: 12, t: 37.6, p: 96, sbp: 128, dbp: 80, rr: 20, spo2: 95 },
            { h: 6, t: 37.8, p: 100, sbp: 125, dbp: 78, rr: 21, spo2: 94 },
            { h: 0, t: 37.9, p: 102, sbp: 122, dbp: 76, rr: 22, spo2: 93 },
          ],
          "MRN-JAMES-002": [
            { h: 24, t: 37.5, p: 80, sbp: 120, dbp: 80, rr: 18, spo2: 98 },
            { h: 20, t: 38.1, p: 90, sbp: 115, dbp: 75, rr: 20, spo2: 96 },
            { h: 16, t: 38.8, p: 100, sbp: 105, dbp: 65, rr: 24, spo2: 94 },
            { h: 12, t: 39.3, p: 110, sbp: 95, dbp: 58, rr: 26, spo2: 92 },
            { h: 8, t: 39.6, p: 115, sbp: 90, dbp: 54, rr: 28, spo2: 91 },
            { h: 4, t: 39.8, p: 118, sbp: 88, dbp: 52, rr: 28, spo2: 91 },
            { h: 0, t: 39.8, p: 118, sbp: 88, dbp: 52, rr: 28, spo2: 91 },
          ],
          "MRN-LIU-003": [
            { h: 24, t: 38.9, p: 110, sbp: 110, dbp: 70, rr: 22, spo2: 92 },
            { h: 18, t: 39.2, p: 115, sbp: 105, dbp: 65, rr: 24, spo2: 91 },
            { h: 12, t: 39.5, p: 120, sbp: 100, dbp: 60, rr: 26, spo2: 90 },
            { h: 6, t: 39.7, p: 122, sbp: 98, dbp: 58, rr: 27, spo2: 89 },
            { h: 0, t: 39.9, p: 124, sbp: 96, dbp: 56, rr: 28, spo2: 88 },
          ],
          "MRN-SOFIA-004": [
            { h: 24, t: 37.1, p: 92, sbp: 118, dbp: 76, rr: 20, spo2: 94 },
            { h: 18, t: 37.3, p: 95, sbp: 116, dbp: 74, rr: 21, spo2: 93 },
            { h: 12, t: 37.5, p: 98, sbp: 114, dbp: 72, rr: 22, spo2: 92 },
            { h: 6, t: 37.7, p: 102, sbp: 112, dbp: 70, rr: 23, spo2: 91 },
            { h: 0, t: 37.8, p: 105, sbp: 110, dbp: 68, rr: 24, spo2: 90 },
          ],
          "MRN-DEREK-005": [
            { h: 24, t: 38.2, p: 105, sbp: 100, dbp: 62, rr: 21, spo2: 96 },
            { h: 18, t: 38.4, p: 108, sbp: 98, dbp: 60, rr: 22, spo2: 95 },
            { h: 12, t: 38.6, p: 112, sbp: 96, dbp: 58, rr: 23, spo2: 94 },
            { h: 6, t: 38.8, p: 115, sbp: 94, dbp: 56, rr: 24, spo2: 93 },
            { h: 0, t: 38.9, p: 118, sbp: 92, dbp: 54, rr: 25, spo2: 92 },
          ],
          "MRN-FATIMA-006": [
            { h: 24, t: 37.9, p: 115, sbp: 105, dbp: 65, rr: 24, spo2: 91 },
            { h: 18, t: 37.8, p: 118, sbp: 103, dbp: 63, rr: 25, spo2: 90 },
            { h: 12, t: 37.7, p: 120, sbp: 101, dbp: 61, rr: 26, spo2: 89 },
            { h: 6, t: 37.6, p: 122, sbp: 99, dbp: 59, rr: 27, spo2: 88 },
            { h: 0, t: 37.5, p: 124, sbp: 97, dbp: 57, rr: 28, spo2: 87 },
          ],
        };

        const vitals = vitalsTemplate[p.mrn] || [];
        for (const v of vitals) {
          await tx.vitalSign.create({
            data: {
              admissionId: admission.id, recordedById: resident.id,
              temperature: v.t, pulse: v.p, systolicBp: v.sbp, diastolicBp: v.dbp,
              respiratoryRate: v.rr, spo2: v.spo2,
              recordedAt: new Date(now.getTime() - v.h * 60 * 60 * 1000),
            },
          });
        }
      }

      // ── Lab results ───────────────────────────────────────────────────────
      const labCount = await tx.labResult.count({ where: { admissionId: admission.id } });
      if (labCount === 0) {
        const labsTemplate = {
          "MRN-EMMA-001": [
            { test: "Troponin I", result: "0.45 ng/mL", abnormal: true },
            { test: "BNP", result: "385 pg/mL", abnormal: true },
            { test: "Hemoglobin", result: "11.2 g/dL", abnormal: true },
            { test: "Creatinine", result: "1.1 mg/dL", abnormal: false },
          ],
          "MRN-JAMES-002": [
            { test: "Troponin I", result: "12.4 ng/mL", abnormal: true },
            { test: "CK-MB", result: "95 U/L", abnormal: true },
            { test: "Lactate", result: "4.2 mmol/L", abnormal: true },
            { test: "Ejection Fraction", result: "38%", abnormal: true },
          ],
          "MRN-LIU-003": [
            { test: "Procalcitonin", result: "2.8 ng/mL", abnormal: true },
            { test: "WBC", result: "18.5 x10^3/uL", abnormal: true },
            { test: "Lactate", result: "5.1 mmol/L", abnormal: true },
            { test: "Creatinine", result: "2.3 mg/dL", abnormal: true },
          ],
          "MRN-SOFIA-004": [
            { test: "pH", result: "7.28", abnormal: true },
            { test: "PaO2", result: "68 mmHg", abnormal: true },
            { test: "PaCO2", result: "52 mmHg", abnormal: true },
            { test: "HCO3", result: "18 mEq/L", abnormal: true },
          ],
          "MRN-DEREK-005": [
            { test: "Bilirubin Total", result: "8.2 mg/dL", abnormal: true },
            { test: "AST", result: "542 U/L", abnormal: true },
            { test: "ALT", result: "638 U/L", abnormal: true },
            { test: "INR", result: "3.2", abnormal: true },
          ],
          "MRN-FATIMA-006": [
            { test: "Glucose", result: "486 mg/dL", abnormal: true },
            { test: "Arterial pH", result: "7.18", abnormal: true },
            { test: "HCO3", result: "8 mEq/L", abnormal: true },
            { test: "Anion Gap", result: "18", abnormal: true },
          ],
        };

        const labs = labsTemplate[p.mrn] || [];
        for (const lab of labs) {
          await tx.labResult.create({
            data: {
              admissionId: admission.id, recordedById: specialist.id,
              testName: lab.test, resultValue: lab.result, abnormal: lab.abnormal,
              recordedAt: new Date(),
            },
          });
        }
      }

      // ── Diagnoses ──────────────────────────────────────────────────────────
      const diagCount = await tx.diagnosis.count({ where: { admissionId: admission.id } });
      if (diagCount === 0) {
        const diagsTemplate = {
          "MRN-EMMA-001": ["Acute Coronary Syndrome", "Hypertensive crisis"],
          "MRN-JAMES-002": ["ST-elevation MI, anterior wall", "Cardiogenic shock", "Left ventricular dysfunction"],
          "MRN-LIU-003": ["Sepsis, pneumonia", "Acute kidney injury", "SIRS"],
          "MRN-SOFIA-004": ["Acute respiratory failure", "ARDS", "Post-operative complication"],
          "MRN-DEREK-005": ["Acute liver failure", "Coagulopathy", "Hepatic encephalopathy"],
          "MRN-FATIMA-006": ["Diabetic ketoacidosis", "Type 1 diabetes", "Dehydration"],
        };

        const diags = diagsTemplate[p.mrn] || [];
        for (const [diagIndex, diag] of diags.entries()) {
          await tx.diagnosis.create({
            data: {
              admissionId: admission.id, conditionName: diag, status: "CONFIRMED",
              type: diagIndex === 0 ? "PRIMARY" : "SECONDARY",
              diagnosedById: specialist.id, originalDiagnosedById: specialist.id,
            },
          });
        }
      }

      // ── Clinical notes for RAG ────────────────────────────────────────────
      const noteCount = await tx.clinicalNote.count({ where: { admissionId: admission.id } });
      if (noteCount === 0) {
        const notesTemplate = {
          "MRN-EMMA-001": [
            "Patient presented with acute chest pain and shortness of breath. Initial 12-lead ECG shows ST segment depression in leads II, III, and aVF. Troponin I elevated at 0.45 ng/mL. Cardiology consultation recommended. Started on dual antiplatelet therapy and anticoagulation. Awaiting catheterization.",
            "Cardiology catheterization performed today. Significant stenosis found in right coronary artery. PTCA with stent placement completed successfully. No acute complications noted. Patient hemodynamically stable post-procedure. Continue current medications.",
          ],
          "MRN-JAMES-002": [
            "54-year-old male admitted with acute anterior MI. Presented with crushing substernal chest pain radiating to left arm. ST elevation noted in V1-V4. Troponin peaked at 12.4 ng/mL. EF measured at 38% by echo with anterior wall hypokinesis. Creatinine initially 0.9, now 1.4 suggesting early contrast-associated renal impairment. Started on heparin, nitroglycerin, aspirin, metoprolol.",
            "Day 2: Patient remains in critical condition. BP marginally improved with inotropic support. Renal function deteriorating. ICU course complicated by arrhythmias requiring antiarrhythmic therapy. Team discussing advanced support options including possible mechanical support. Family meeting scheduled.",
          ],
          "MRN-LIU-003": [
            "68-year-old with pneumonia complicated by sepsis. Fever, productive cough, hypoxia. Procalcitonin 2.8 ng/mL, WBC 18.5. Lactate 5.1 indicating tissue hypoperfusion. Started on broad-spectrum antibiotics (piperacillin-tazobactam, vancomycin). Fluid resuscitation ongoing. Vasopressor support initiated for BP support.",
            "Cultures from blood and sputum sent. Source control infection likely lung. Patient intubated overnight due to progressive hypoxemia. Mechanical ventilation on FiO2 60% achieving SpO2 92%. CXR shows bilateral infiltrates consistent with ARDS. PEEP 12 cm H2O. Prone positioning considered for tomorrow.",
          ],
          "MRN-SOFIA-004": [
            "Post-operative day 3 from major abdominal surgery. Patient developed acute respiratory failure overnight. Rapid deterioration with increasing dyspnea and hypoxemia. PaO2 68 mmHg, PaCO2 52 mmHg on NRB mask. pH 7.28 indicating respiratory acidosis. Emergent intubation performed. CXR consistent with ARDS pattern.",
            "ARDSNet protocol implemented. Lung protective ventilation with low tidal volumes. Sedation with propofol and fentanyl. Paralytic agent onboard. Repeat labs show worsening gas exchange. Discussed possible role for ECMO. Infectious workup initiated to rule out post-op pneumonia.",
          ],
          "MRN-DEREK-005": [
            "43-year-old admitted with acute liver failure. Jaundiced, encephalopathic, coagulopathic. Bilirubin 8.2, AST 542, ALT 638, INR 3.2. No prior history of liver disease. Viral hepatitis and acetaminophen overdose ruled out. Imaging suggests possible autoimmune hepatitis. Transferred to ICU for close monitoring.",
            "Hepatology consult obtained. Recommended high-dose corticosteroids pending further workup. Patient became progressively more encephalopathic requiring intubation for airway protection. Listed for urgent liver transplant evaluation. Lactulose and rifaxomicin started. FFP transfused for coagulopathy.",
          ],
          "MRN-FATIMA-006": [
            "23-year-old type 1 diabetic presenting with severe DKA. Glucose 486 mg/dL, arterial pH 7.18, HCO3 8 mEq/L, anion gap 18. Serum osmolality elevated. Patient confused and dehydrated. Insulin pump malfunction precipitated this episode. Immediate IV fluid resuscitation and insulin therapy initiated.",
            "After 12 hours of treatment, pH improved to 7.28 and HCO3 to 12 mEq/L. Glucose responsive to insulin infusion. Patient regaining mental clarity. Continue aggressive IV fluids, insulin, and electrolyte monitoring. Endocrinology consulted regarding insulin pump replacement and diabetes management.",
          ],
        };

        const notes = notesTemplate[p.mrn] || [];
        for (const noteText of notes) {
          await tx.clinicalNote.create({
            data: {
              admissionId: admission.id,
              authorId: specialist.id,
              content: noteText,
            },
          });
        }
      }

      // ── Medications ───────────────────────────────────────────────────────
      const medCount = await tx.medication.count({ where: { admissionId: admission.id } });
      if (medCount === 0) {
        const medsTemplate = {
          "MRN-EMMA-001": [
            { name: "Aspirin", dose: "325 mg", freq: "Daily" },
            { name: "Ticagrelor", dose: "180 mg loading", freq: "Daily" },
            { name: "Heparin", dose: "80 u/kg bolus", freq: "Continuous" },
            { name: "Nitroglycerin", dose: "0.4 mcg/kg/min", freq: "Continuous" },
            { name: "Metoprolol", dose: "25 mg", freq: "BID" },
          ],
          "MRN-JAMES-002": [
            { name: "Heparin", dose: "25,000 u/250mL", freq: "Continuous" },
            { name: "Nitroglycerin", dose: "0.4 mcg/kg/min", freq: "Continuous" },
            { name: "Aspirin", dose: "325 mg", freq: "Daily" },
            { name: "Atorvastatin", dose: "80 mg", freq: "QHS" },
            { name: "Dobutamine", dose: "5 mcg/kg/min", freq: "Continuous" },
          ],
          "MRN-LIU-003": [
            { name: "Piperacillin-tazobactam", dose: "4.5 g", freq: "Q6H" },
            { name: "Vancomycin", dose: "15-20 mg/kg", freq: "Q12H" },
            { name: "Norepinephrine", dose: "5 mcg/min", freq: "Continuous" },
            { name: "Lactated Ringer's", dose: "250 mL/hr", freq: "Continuous" },
          ],
          "MRN-SOFIA-004": [
            { name: "Propofol", dose: "10-15 mg/kg/hr", freq: "Continuous" },
            { name: "Fentanyl", dose: "50 mcg/hr", freq: "Continuous" },
            { name: "Vecuronium", dose: "0.1 mg/kg", freq: "Q30min PRN" },
            { name: "Lung-protective ventilation", dose: "6 mL/kg", freq: "Settings" },
          ],
          "MRN-DEREK-005": [
            { name: "Methylprednisolone", dose: "500 mg", freq: "IV Q6H x 3 days" },
            { name: "Lactulose", dose: "30 mL", freq: "TID" },
            { name: "Rifaxomicin", dose: "550 mg", freq: "BID" },
            { name: "Fresh Frozen Plasma", dose: "2 units", freq: "PRN" },
          ],
          "MRN-FATIMA-006": [
            { name: "Regular Insulin", dose: "0.1 u/kg/hr", freq: "Continuous infusion" },
            { name: "Normal Saline", dose: "500 mL/hr", freq: "Continuous" },
            { name: "Potassium", dose: "20-40 mEq", freq: "PRN when K <5" },
            { name: "Phosphate", dose: "20-40 mmol", freq: "PRN" },
          ],
        };

        const meds = medsTemplate[p.mrn] || [];
        for (const med of meds) {
          const { frequency, frequencyText } = normalizeFrequency(med.freq);
          await tx.medication.create({
            data: {
              admissionId: admission.id, prescribedById: specialist.id,
              originalPrescriberId: specialist.id,
              drugName: med.name, dosage: med.dose,
              frequency, frequencyText, route: inferRoute(med.dose),
              isActive: true,
            },
          });
        }
      }

      // ── Allergies ──────────────────────────────────────────────────────────
      const allergyCount = await tx.allergy.count({ where: { patientId: patient.id } });
      if (allergyCount === 0) {
        const allergyTemplate = {
          "MRN-EMMA-001": [{ allergen: "Penicillin", severity: "Moderate" }],
          "MRN-JAMES-002": [{ allergen: "Aspirin", severity: "Severe" }],
          "MRN-LIU-003": [{ allergen: "Sulfa drugs", severity: "Moderate" }],
          "MRN-SOFIA-004": [{ allergen: "Latex", severity: "Severe" }],
          "MRN-DEREK-005": [{ allergen: "Erythromycin", severity: "Mild" }],
          "MRN-FATIMA-006": [{ allergen: "NKDA", severity: "None" }],
        };

        const allergies = allergyTemplate[p.mrn] || [];
        for (const allergy of allergies) {
          if (allergy.allergen !== "NKDA") {
            await tx.allergy.create({
              data: { patientId: patient.id, allergen: allergy.allergen, severity: allergy.severity },
            });
          }
        }
      }

      // ── Medical history ───────────────────────────────────────────────────
      const histCount = await tx.medicalHistory.count({ where: { patientId: patient.id } });
      if (histCount === 0) {
        await tx.medicalHistory.create({
          data: {
            patientId: patient.id,
            hypertensionHtn: true,
            diabetesDm: ["MRN-FATIMA-006"].includes(p.mrn),
            pastDiseases: p.mrn === "MRN-JAMES-002" ? ["CAD", "Hypertension"] : ["Asthma"],
            previousOperations: ["MRN-SOFIA-004"].includes(p.mrn),
            operationsDetails: p.mrn === "MRN-SOFIA-004" ? "Recent abdominal surgery" : null,
            hasAllergies: true,
          },
        });
      }
    }, { maxWait: 15000, timeout: 45000 });
  }

  // Runs last so it can see every admission from both patient sets above
  // (the 6 quick ones here and the 15 detailed ones from seedICUPatients).
  await seedDemoExtras({
    specialistUser: specialist, specialist2User: specialist2,
    residentUser: resident, resident2User: resident2,
    nurseUser: nurse, nurse2User: nurse2,
  });

  console.log("\n✓ Database seeding completed successfully!");
  console.log("\nLogin credentials:");
  console.log(`  Resident: ${residentEmail} / SuperSecurePassword2026!`);
  console.log(`  Specialist: ${specialistEmail} / SuperSecurePassword2026!`);
  console.log(`  Nurse: ${nurseEmail} / SuperSecurePassword2026!`);
}

main()
  .catch((error) => {
    console.error("Seed execution failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
