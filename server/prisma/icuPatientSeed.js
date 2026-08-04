const prisma = require("../src/utils/prismaClient");
const { normalizeFrequency, inferRoute } = require("../src/modules/medications/medication.frequency");

/**
 * Advanced ICU Patient Seeder
 * Populates realistic, medically plausible, diverse, and synthetic ICU patient records
 * along with complete clinical data (medical history, allergies, admissions, diagnoses,
 * vitals time-series, medications & MAR, labs, investigation orders, clinical exams,
 * nursing notes, clinical notes, and SOAP follow-ups).
 */

async function seedICUPatients({ specialistUser, specialist2User, residentUser, resident2User, nurseUser, nurse2User }) {
  console.log("--- Starting Comprehensive ICU Patient & Clinical Data Seeding ---");

  const now = new Date();
  const hours = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const days = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // 15 Comprehensive Synthetic ICU Patient Profiles
  const patientProfiles = [
    {
      mrn: "MRN-SEPSIS-101",
      nationalId: "NID-984210491",
      name: "Martha Vance",
      age: 68,
      gender: "Female",
      residence: "North District, Sector 4",
      occupation: "Retired School Teacher",
      maritalStatus: "WIDOWED",
      handedness: "RIGHT",
      history: {
        diabetesDm: true,
        hypertensionHtn: true,
        pastSimilarConditions: "Recurrent urinary tract infections over past 6 months",
        pastDiseases: ["T2DM", "HTN", "Recurrent UTI", "Osteoarthritis"],
        previousOperations: true,
        operationsDetails: "Total knee replacement (2018)",
        hasAllergies: true,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "Mother had T2DM",
        inheritedDiseases: [],
        freeText: "Patient presented with 3-day history of dysuria, fever, and acute altered mental status.",
      },
      allergies: [
        { allergen: "Penicillin", severity: "Severe" },
        { allergen: "Sulfa Drugs", severity: "Moderate" },
      ],
      bedNumber: "MICU-01",
      admission: {
        doctorId: specialistUser.id,
        nurseId: nurseUser.id,
        transferReason: "Septic Shock secondary to Acute Pyelonephritis requiring IV vasopressors",
        placeOfTransfer: "Emergency Department",
        transferDoctorName: "Dr. Karen Mitchell (ED Attending)",
        chiefComplaint: "High grade fever, rigors, confusion, and severe hypotension",
        complaintAnalysis: "Fever started 3 days ago. Family noted acute confusion and lethargy this morning.",
        symptomsRelatedSystem: "Dysuria, flank pain, frequency, turbid foul-smelling urine",
        symptomsOtherSystems: "Decreased oral intake, malaise, no cough or chest pain",
        previousInvestigations: { edLactate: "4.2 mmol/L", edWbc: "22.4 x10^3/uL", edUrineWbc: ">100/HPF" },
        previousTreatments: "ED IV Plasmalyte 2000mL, Ceftriaxone 2g IV, Norepinephrine initiated at 0.08 mcg/kg/min",
        provisionalDiagnosis: "Septic Shock / Urosepsis / Acute Pyelonephritis",
        status: "ACTIVE",
        admittedAt: hours(36),
      },
      diagnoses: [
        { conditionName: "Septic Shock", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "Acute Pyelonephritis", status: "ACTIVE", doctorId: residentUser.id },
        { conditionName: "Acute Kidney Injury (Stage 2)", status: "ACTIVE", doctorId: residentUser.id },
        { conditionName: "Type 2 Diabetes Mellitus", status: "ACTIVE", doctorId: specialistUser.id },
      ],
      vitalsHistory: [
        { hoursAgo: 36, temp: 39.4, pulse: 122, sBp: 82, dBp: 48, rr: 26, spo2: 93 },
        { hoursAgo: 30, temp: 38.9, pulse: 112, sBp: 92, dBp: 54, rr: 24, spo2: 95 },
        { hoursAgo: 24, temp: 38.2, pulse: 104, sBp: 102, dBp: 62, rr: 22, spo2: 96 },
        { hoursAgo: 18, temp: 37.8, pulse: 96, sBp: 108, dBp: 66, rr: 20, spo2: 97 },
        { hoursAgo: 12, temp: 37.4, pulse: 88, sBp: 114, dBp: 70, rr: 18, spo2: 98 },
        { hoursAgo: 6, temp: 37.1, pulse: 84, sBp: 118, dBp: 72, rr: 18, spo2: 98 },
        { hoursAgo: 1, temp: 36.9, pulse: 80, sBp: 122, dBp: 74, rr: 16, spo2: 99 },
      ],
      medications: [
        { drugName: "Norepinephrine Drip", dosage: "0.04-0.12 mcg/kg/min", frequency: "Continuous", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Ceftriaxone", dosage: "2g IV", frequency: "Q24H", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Vancomycin", dosage: "1.25g IV", frequency: "Q12H", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Normal Saline 0.9%", dosage: "100 mL/hr", frequency: "Continuous", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Regular Insulin Drip", dosage: "2-4 units/hr", frequency: "Continuous", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "Serum Lactate", resultValue: "4.2 mmol/L", abnormal: true, recordedAt: hours(36) },
        { testName: "Serum Lactate (Repeat)", resultValue: "1.8 mmol/L", abnormal: false, recordedAt: hours(12) },
        { testName: "WBC Count", resultValue: "22.4 x10^3/uL", abnormal: true, recordedAt: hours(36) },
        { testName: "WBC Count (Repeat)", resultValue: "14.1 x10^3/uL", abnormal: true, recordedAt: hours(12) },
        { testName: "Serum Creatinine", resultValue: "2.3 mg/dL", abnormal: true, recordedAt: hours(36) },
        { testName: "Serum Creatinine (Repeat)", resultValue: "1.5 mg/dL", abnormal: true, recordedAt: hours(12) },
        { testName: "Blood Culture", resultValue: "Positive for Escherichia coli (Pan-sensitive except Ampicillin)", abnormal: true, recordedAt: hours(24) },
        { testName: "Urine Culture", resultValue: ">100,000 CFU/mL E. coli", abnormal: true, recordedAt: hours(30) },
      ],
      investigations: [
        { orderName: "Renal & Pelvic Ultrasound", type: "Ultrasound", status: "Completed", orderedById: specialistUser.id, orderDate: hours(32) },
        { orderName: "Repeat Blood Cultures x2", type: "Lab", status: "Completed", orderedById: residentUser.id, orderDate: hours(24) },
        { orderName: "CT Abdomen & Pelvis without Contrast", type: "CT", status: "Pending", orderedById: specialistUser.id, orderDate: hours(4) },
      ],
      clinicalExam: {
        generalExams: { GCS: 14, pallor: true, jaundice: false, cyanosis: false, edema: "None" },
        localExams: {
          chest: "Clear bilaterally, equal breath sounds",
          cvs: "Tachycardic, normal S1/S2, no murmurs",
          abdomen: "Soft, mild suprapubic and left CVA tenderness",
          neuro: "Lethargic but rousable, answers simple commands",
        },
      },
      nursingNotes: [
        "Patient admitted from ED on Norepinephrine infusion at 0.08 mcg/kg/min. MAP targeted >65 mmHg. Foley catheter placed, 150mL cloudy urine drained.",
        "Vasopressor titrated down to 0.03 mcg/kg/min as MAP stabilized to 72 mmHg. Patient more alert and oriented to self and place.",
      ],
      clinicalNotes: [
        "68-year-old female with urosepsis / septic shock. Source control confirmed via catheterization. Antibiotic coverage optimized with Ceftriaxone & Vancomycin. Lactate cleared from 4.2 to 1.8.",
      ],
      followUp: {
        subjective: "Patient states feeling less confused and reports decreased flank pain. Denies shortness of breath.",
        objective: "Vitals stable, off Norepinephrine for 4 hours. Urine output 45-60 mL/hr clear yellow. Repeat WBC 14.1, Creatinine 1.5.",
        assessment: "Resolving septic shock secondary to E. coli pyelonephritis. AKI improving.",
        plan: "1. Wean off IV vasopressors completely. 2. Continue IV Ceftriaxone 2g daily. 3. Stepdown to general medical ward if hemodynamically stable for 24 hours.",
      },
    },

    {
      mrn: "MRN-ARDS-102",
      nationalId: "NID-105829302",
      name: "Robert 'Bob' Chen",
      age: 55,
      gender: "Male",
      residence: "Westside Heights, Apt 12B",
      occupation: "Software Engineering Manager",
      maritalStatus: "MARRIED",
      handedness: "RIGHT",
      history: {
        diabetesDm: false,
        hypertensionHtn: true,
        pastSimilarConditions: "None",
        pastDiseases: ["HTN", "Dyslipidemia"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: false,
        traveledAbroad: true,
        consanguinity: false,
        familySimilarConditions: "Father had CAD",
        inheritedDiseases: [],
        freeText: "Developing progressive hypoxemic respiratory failure following 5 days of flu-like illness.",
      },
      allergies: [],
      bedNumber: "MICU-02",
      admission: {
        doctorId: specialist2User.id,
        nurseId: nurse2User.id,
        transferReason: "Severe ARDS secondary to Viral/Bacterial Pneumonia requiring invasive mechanical ventilation",
        placeOfTransfer: "Community Hospital ICU",
        transferDoctorName: "Dr. Samuel Vance",
        chiefComplaint: "Severe dyspnea, cyanosis, and respiratory distress",
        complaintAnalysis: "Fever and cough for 5 days. Rapid deterioration over past 12 hours with SpO2 dropping to 80% on non-rebreather mask.",
        symptomsRelatedSystem: "Severe dyspnea, tachypnea, productive cough with rust-colored sputum, pleuritic chest pain",
        symptomsOtherSystems: "High fever, chills, myalgias",
        previousInvestigations: { chestCxr: "Bilateral dense mid-to-lower zone infiltrates ('white-out')", abgPaO2FiO2: "112 (Moderate-Severe ARDS)" },
        previousTreatments: "Intubated in ED, AC/VC TV 420mL (6 mL/kg PBW), PEEP 14 cmH2O, FiO2 80%, Propofol drip",
        provisionalDiagnosis: "Severe ARDS / Community-Acquired Pneumonia / Acute Respiratory Failure",
        status: "ACTIVE",
        admittedAt: hours(48),
      },
      diagnoses: [
        { conditionName: "Acute Respiratory Distress Syndrome (ARDS)", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Severe Community-Acquired Pneumonia", status: "ACTIVE", doctorId: resident2User.id },
        { conditionName: "Acute Respiratory Failure", status: "ACTIVE", doctorId: specialist2User.id },
      ],
      vitalsHistory: [
        { hoursAgo: 48, temp: 38.8, pulse: 118, sBp: 135, dBp: 82, rr: 32, spo2: 84 },
        { hoursAgo: 36, temp: 38.5, pulse: 108, sBp: 122, dBp: 74, rr: 28, spo2: 90 },
        { hoursAgo: 24, temp: 38.1, pulse: 98, sBp: 118, dBp: 70, rr: 24, spo2: 92 },
        { hoursAgo: 12, temp: 37.6, pulse: 92, sBp: 114, dBp: 68, rr: 22, spo2: 94 },
        { hoursAgo: 2, temp: 37.2, pulse: 86, sBp: 112, dBp: 66, rr: 20, spo2: 95 },
      ],
      medications: [
        { drugName: "Piperacillin-Tazobactam (Zosyn)", dosage: "4.5g IV", frequency: "Q6H", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Azithromycin", dosage: "500mg IV", frequency: "Q24H", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Cisatracurium Drip", dosage: "1-3 mcg/kg/min", frequency: "Continuous", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Propofol Drip", dosage: "25-40 mcg/kg/min", frequency: "Continuous", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Fentanyl Drip", dosage: "50-100 mcg/hr", frequency: "Continuous", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "ABG (pH)", resultValue: "7.28", abnormal: true, recordedAt: hours(48) },
        { testName: "ABG (PaO2)", resultValue: "68 mmHg (on FiO2 0.60)", abnormal: true, recordedAt: hours(48) },
        { testName: "ABG (PaCO2)", resultValue: "52 mmHg", abnormal: true, recordedAt: hours(48) },
        { testName: "PaO2 / FiO2 Ratio", resultValue: "113 (Severe ARDS threshold)", abnormal: true, recordedAt: hours(48) },
        { testName: "ABG (Repeat PaO2/FiO2)", resultValue: "210 (Improving)", abnormal: false, recordedAt: hours(6) },
        { testName: "Procalcitonin", resultValue: "8.5 ng/mL", abnormal: true, recordedAt: hours(48) },
        { testName: "Sputum Culture", resultValue: "Positive for Streptococcus pneumoniae", abnormal: true, recordedAt: hours(24) },
      ],
      investigations: [
        { orderName: "Bedside Portable CXR", type: "Radiology", status: "Completed", orderedById: specialist2User.id, orderDate: hours(40) },
        { orderName: "Echocardiogram (TTE)", type: "Echocardiogram", status: "Completed", orderedById: specialist2User.id, orderDate: hours(30) },
        { orderName: "Repeat ABG", type: "Lab", status: "Pending", orderedById: resident2User.id, orderDate: hours(1) },
      ],
      clinicalExam: {
        generalExams: { GCS: 3, intubated: true, RASS: -4, cyanosis: false, edema: "Mild sacral" },
        localExams: {
          chest: "Bilateral extensive coarse rales and bronchial breath sounds. Endotracheal tube 23cm at lips.",
          cvs: "Regular rhythm, no gallop or pericardial rub",
          abdomen: "Distended, soft, hypoactive bowel sounds",
          neuro: "Deeply sedated and paralyzed on neuromuscular blockade trial",
        },
      },
      nursingNotes: [
        "Patient placed in prone position for 16 hours per ARDS protocol. PaO2/FiO2 ratio improved from 113 to 185. Tolerating mechanical ventilation well.",
        "Returned to supine position. Secretions thick, suctioned inline. FiO2 successfully weaned from 80% to 45%.",
      ],
      clinicalNotes: [
        "55-year-old male with severe pneumococcal ARDS. lung-protective ventilation (6 mL/kg PBW), high PEEP (14 cmH2O), neuromuscular blockade, and prone positioning trial executed with notable oxygenation response.",
      ],
      followUp: {
        subjective: "Patient is sedated, intubated, unable to provide subjective complaints.",
        objective: "PaO2/FiO2 improved to 210. FiO2 45%, PEEP 10 cmH2O. Sedation holiday planned in 12 hours if oxygenation holds.",
        assessment: "Improving severe ARDS secondary to pneumococcal pneumonia.",
        plan: "1. Continue lung-protective ventilation. 2. Wean Cisatracurium paralytic drip. 3. Continue Zosyn & Azithromycin.",
      },
    },

    {
      mrn: "MRN-CARDIAC-103",
      nationalId: "NID-391028403",
      name: "Arthur Pendelton",
      age: 64,
      gender: "Male",
      residence: "Harbor View, Villa 9",
      occupation: "Civil Engineer",
      maritalStatus: "MARRIED",
      handedness: "RIGHT",
      history: {
        diabetesDm: true,
        hypertensionHtn: true,
        pastSimilarConditions: "Exertional angina 2 months ago, untreated",
        pastDiseases: ["T2DM", "HTN", "Hyperlipidemia", "30 pack-year Smoking history"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: true,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "Brother died of Sudden Cardiac Arrest at age 58",
        inheritedDiseases: [],
        freeText: "Presented with acute crushing substernal chest pain radiating to left jaw and arm.",
      },
      allergies: [{ allergen: "Aspirin", severity: "Mild" }],
      bedNumber: "CCU-01",
      admission: {
        doctorId: specialistUser.id,
        nurseId: nurseUser.id,
        transferReason: "Acute STEMI with Cardiogenic Shock post PCI to proximal LAD",
        placeOfTransfer: "Cardiac Catheterization Laboratory",
        transferDoctorName: "Dr. Marcus Vance (Interventional Cardiology)",
        chiefComplaint: "Severe crushing chest pain, diaphoresis, and cold clammy extremities",
        complaintAnalysis: "Pain started 4 hours prior to presentation. ST elevations in V1-V4 on 12-lead ECG.",
        symptomsRelatedSystem: "Crushing chest pain 10/10, dyspnea, nausea, diaphoresis",
        symptomsOtherSystems: "Lightheadedness, cool skin",
        previousInvestigations: { cathReport: "100% thrombotic occlusion of proximal LAD. Drug-eluting stent placed with TIMI 3 flow.", echoEjectionFraction: "28%" },
        previousTreatments: "Heparin bolus + drip, Ticagrelor 180mg PO, Dobutamine 5 mcg/kg/min, Norepinephrine 0.05 mcg/kg/min",
        provisionalDiagnosis: "Anterior STEMI / Cardiogenic Shock / Left Ventricular Dysfunction",
        status: "ACTIVE",
        admittedAt: hours(20),
      },
      diagnoses: [
        { conditionName: "Acute Anterior ST-Elevation Myocardial Infarction (STEMI)", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "Cardiogenic Shock", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "Acute Systolic Heart Failure (EF 28%)", status: "ACTIVE", doctorId: residentUser.id },
      ],
      vitalsHistory: [
        { hoursAgo: 20, temp: 36.4, pulse: 114, sBp: 84, dBp: 52, rr: 24, spo2: 92 },
        { hoursAgo: 15, temp: 36.6, pulse: 106, sBp: 92, dBp: 58, rr: 22, spo2: 94 },
        { hoursAgo: 10, temp: 36.8, pulse: 98, sBp: 100, dBp: 62, rr: 20, spo2: 96 },
        { hoursAgo: 5, temp: 37.0, pulse: 90, sBp: 108, dBp: 66, rr: 18, spo2: 97 },
        { hoursAgo: 1, temp: 36.9, pulse: 84, sBp: 112, dBp: 70, rr: 16, spo2: 98 },
      ],
      medications: [
        { drugName: "Dobutamine Drip", dosage: "5.0 mcg/kg/min", frequency: "Continuous", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Norepinephrine Drip", dosage: "0.04 mcg/kg/min", frequency: "Continuous", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Heparin Infusion", dosage: "1000 units/hr", frequency: "Continuous", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Ticagrelor", dosage: "90mg PO", frequency: "BID", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Furosemide (Lasix)", dosage: "40mg IV", frequency: "BID", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Atorvastatin", dosage: "80mg PO", frequency: "QHS", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "Troponin I (High-Sensitivity)", resultValue: "18,400 ng/L", abnormal: true, recordedAt: hours(20) },
        { testName: "Troponin I (Repeat 12h)", resultValue: "14,200 ng/L (Peaked)", abnormal: true, recordedAt: hours(8) },
        { testName: "CK-MB", resultValue: "185 U/L", abnormal: true, recordedAt: hours(20) },
        { testName: "BNP", resultValue: "2,850 pg/mL", abnormal: true, recordedAt: hours(20) },
        { testName: "Serum Lactate", resultValue: "3.4 mmol/L", abnormal: true, recordedAt: hours(20) },
        { testName: "Serum Lactate (Repeat)", resultValue: "1.6 mmol/L", abnormal: false, recordedAt: hours(6) },
      ],
      investigations: [
        { orderName: "12-Lead ECG", type: "ECG", status: "Completed", orderedById: specialistUser.id, orderDate: hours(18) },
        { orderName: "Transthoracic Echocardiogram (TTE)", type: "Echocardiogram", status: "Completed", orderedById: specialistUser.id, orderDate: hours(14) },
        { orderName: "Arterial Line Setup", type: "Procedure", status: "Completed", orderedById: residentUser.id, orderDate: hours(20) },
      ],
      clinicalExam: {
        generalExams: { GCS: 15, pallor: true, diaphoresis: true, edema: "1+ bilateral ankles" },
        localExams: {
          chest: "Bilateral basilar lung rales (1/3 lower fields)",
          cvs: "S1 S2 present, prominent S3 gallop, soft systolic murmur at apex",
          abdomen: "Soft, non-tender, hepatomegaly 2cm below costal margin",
          extremities: "Cool distally, peripheral pulses 1+ radial, femoral groin access sheath intact",
        },
      },
      nursingNotes: [
        "Patient transferred from cath lab post DES to pLAD. Arterial line placed in right radial artery for continuous blood pressure telemetry.",
        "Dobutamine maintained at 5 mcg/kg/min. MAP >65 mmHg. Chest pain completely resolved (0/10).",
      ],
      clinicalNotes: [
        "64-year-old male with acute anterior STEMI & cardiogenic shock post primary PCI to pLAD. Inotropic and vasopressor support weaning nicely. Urine output >0.5 mL/kg/hr.",
      ],
      followUp: {
        subjective: "Patient reports no angina, breathing comfortably on 2L nasal cannula.",
        objective: "Vitals stable on low dose Dobutamine. Lactate cleared. Repeat ECG shows settling ST segments with Q waves in V1-V3.",
        assessment: "Stabilizing cardiogenic shock post anterior STEMI.",
        plan: "1. Wean Dobutamine by 1 mcg/kg/min q2h as tolerated. 2. Initiate low-dose Sacubitril/Valsartan once off pressors. 3. Transfer to CCU stepdown tomorrow.",
      },
    },

    {
      mrn: "MRN-TRAUMA-104",
      nationalId: "NID-840192804",
      name: "Marcus Brody",
      age: 26,
      gender: "Male",
      residence: "Central City, Apt 4",
      occupation: "Construction Technician",
      maritalStatus: "SINGLE",
      handedness: "RIGHT",
      history: {
        diabetesDm: false,
        hypertensionHtn: false,
        pastSimilarConditions: "None",
        pastDiseases: ["None"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: false,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "None",
        inheritedDiseases: [],
        freeText: "High-velocity motor vehicle collision (unrestrained driver).",
      },
      allergies: [],
      bedNumber: "Neuro-01",
      admission: {
        doctorId: specialist2User.id,
        nurseId: nurse2User.id,
        transferReason: "Severe Traumatic Brain Injury & Acute Epidural Hematoma status post emergent craniotomy",
        placeOfTransfer: "Neuro-Trauma OR",
        transferDoctorName: "Dr. Jonathan Hayes (Neurosurgery)",
        chiefComplaint: "Polytrauma, loss of consciousness (GCS 5 at scene), anisocoria",
        complaintAnalysis: "High-speed rollover crash. Initial GCS 13 dropped to 5 with blown right pupil (5mm unreactive). Emergency CT showed 35mL right epidural hematoma.",
        symptomsRelatedSystem: "Severe head injury, scalp lacerations, right blown pupil",
        symptomsOtherSystems: "Right pulmonary contusion, non-displaced rib fractures 4-6",
        previousInvestigations: { headCt: "35mL acute epidural hematoma with 8mm midline shift", traumaPanScan: "No abdominal visceral injury" },
        previousTreatments: "Emergent right temporal craniotomy and hematoma evacuation. EVD placed (ICP monitoring). Intubated & ventilated.",
        provisionalDiagnosis: "Severe TBI / Acute Epidural Hematoma / Traumatic Subarachnoid Hemorrhage",
        status: "ACTIVE",
        admittedAt: hours(18),
      },
      diagnoses: [
        { conditionName: "Severe Traumatic Brain Injury (TBI)", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Acute Right Epidural Hematoma (Status post evacuation)", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Traumatic Subarachnoid Hemorrhage", status: "ACTIVE", doctorId: resident2User.id },
        { conditionName: "Right Pulmonary Contusion", status: "ACTIVE", doctorId: resident2User.id },
      ],
      vitalsHistory: [
        { hoursAgo: 18, temp: 37.4, pulse: 52, sBp: 158, dBp: 92, rr: 14, spo2: 99 },
        { hoursAgo: 14, temp: 37.2, pulse: 64, sBp: 142, dBp: 84, rr: 14, spo2: 99 },
        { hoursAgo: 10, temp: 37.0, pulse: 68, sBp: 136, dBp: 78, rr: 14, spo2: 100 },
        { hoursAgo: 5, temp: 36.9, pulse: 72, sBp: 130, dBp: 76, rr: 14, spo2: 99 },
        { hoursAgo: 1, temp: 36.8, pulse: 74, sBp: 126, dBp: 74, rr: 14, spo2: 100 },
      ],
      medications: [
        { drugName: "Hypertonic Saline 3%", dosage: "30 mL/hr", frequency: "Continuous", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Mannitol 20%", dosage: "100g IV", frequency: "PRN for ICP >20", doctorId: specialist2User.id, adminStatus: "HELD" },
        { drugName: "Levetiracetam (Keppra)", dosage: "1000mg IV", frequency: "Q12H", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Propofol Infusion", dosage: "40 mcg/kg/min", frequency: "Continuous", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Fentanyl Infusion", dosage: "50 mcg/hr", frequency: "Continuous", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "Intracranial Pressure (ICP)", resultValue: "11 mmHg (Goal <20)", abnormal: false, recordedAt: hours(18) },
        { testName: "Intracranial Pressure (ICP - 12h)", resultValue: "14 mmHg", abnormal: false, recordedAt: hours(6) },
        { testName: "Cerebral Perfusion Pressure (CPP)", resultValue: "78 mmHg (Goal >60)", abnormal: false, recordedAt: hours(18) },
        { testName: "Serum Sodium", resultValue: "148 mEq/L (Targeted hypernatremia)", abnormal: true, recordedAt: hours(12) },
        { testName: "Serum Osmolality", resultValue: "312 mOsm/kg", abnormal: true, recordedAt: hours(12) },
        { testName: "Hemoglobin", resultValue: "11.2 g/dL", abnormal: false, recordedAt: hours(18) },
      ],
      investigations: [
        { orderName: "Post-Op Repeat Head CT", type: "CT", status: "Completed", orderedById: specialist2User.id, orderDate: hours(12) },
        { orderName: "Chest CT with Contrast", type: "CT", status: "Completed", orderedById: resident2User.id, orderDate: hours(16) },
        { orderName: "Serum Sodium & Osmolality Q6H", type: "Lab", status: "Completed", orderedById: resident2User.id, orderDate: hours(6) },
      ],
      clinicalExam: {
        generalExams: { GCS: 6, EVD: "In place at 10cm H2O", pupilRight: "3mm sluggish", pupilLeft: "3mm prompt" },
        localExams: {
          head: "Right temporal surgical incision clean, dry, intact with surgical staples. No CSF leak.",
          chest: "Coarse breath sounds right mid field, left lung clear",
          neuro: "Motor response: Withdraws to pain in all 4 extremities. Babinski negative bilaterally.",
        },
      },
      nursingNotes: [
        "Admitted from neuro-OR with right EVD transducing clear CSF. ICP maintained between 10-14 mmHg. Head of bed elevated 30 degrees.",
        "Pupils equal bilaterally (3mm). No ICP spikes noted overnight. EVD output 45mL clear pink CSF over 8 hours.",
      ],
      clinicalNotes: [
        "26-year-old male post emergency evacuation of acute epidural hematoma. Neuro-protective bundle enforced: normothermia, targeted hypernatremia (Na 145-150), head elevation, and ICP control.",
      ],
      followUp: {
        subjective: "Patient sedated and mechanically ventilated. Unweaned.",
        objective: "ICP 12 mmHg, CPP 76 mmHg. Repeat Head CT shows successful evacuation of hematoma with resolution of midline shift.",
        assessment: "Stable post-op status following severe TBI and epidural hematoma evacuation.",
        plan: "1. Maintain ICP <20 mmHg and CPP >60 mmHg. 2. Continue 3% NaCl drip. 3. Trial sedation lightened in 24 hours if ICP remains stable.",
      },
    },

    {
      mrn: "MRN-COPD-105",
      nationalId: "NID-572910405",
      name: "Eleanor Vance",
      age: 72,
      gender: "Female",
      residence: "South Park, Street 18",
      occupation: "Retired Tailor",
      maritalStatus: "WIDOWED",
      handedness: "RIGHT",
      history: {
        diabetesDm: false,
        hypertensionHtn: true,
        pastSimilarConditions: "3 ICU admissions for COPD exacerbation in past 2 years",
        pastDiseases: ["COPD (GOLD Stage IV)", "Cor Pulmonale", "HTN"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: true,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "Father was heavy smoker with emphysema",
        inheritedDiseases: [],
        freeText: "Severe oxygen-dependent COPD baseline (2L NC at home).",
      },
      allergies: [{ allergen: "Codeine", severity: "Moderate" }],
      bedNumber: "MICU-03",
      admission: {
        doctorId: specialistUser.id,
        nurseId: nurseUser.id,
        transferReason: "Acute-on-Chronic Hypercapnic Respiratory Failure secondary to COPD Exacerbation",
        placeOfTransfer: "Emergency Department",
        transferDoctorName: "Dr. Robert Sterling",
        chiefComplaint: "Severe shortness of breath, wheezing, and hypercapnic somnolence",
        complaintAnalysis: "Increased sputum production and dyspnea over 3 days. Became somnolent this afternoon.",
        symptomsRelatedSystem: "Profound dyspnea, orthopnea, purulent green sputum, diffuse wheezing",
        symptomsOtherSystems: "Lower extremity edema, fatigue",
        previousInvestigations: { edAbg: "pH 7.22, PaCO2 78 mmHg, PaO2 54 mmHg, HCO3 34 mEq/L" },
        previousTreatments: "Initiated on BiPAP (IPAP 14 / EPAP 6), Methylprednisolone 60mg IV, Nebulized Albuterol/Ipratropium",
        provisionalDiagnosis: "Severe COPD Exacerbation / Acute Respiratory Acidosis / Type II Respiratory Failure",
        status: "ACTIVE",
        admittedAt: hours(28),
      },
      diagnoses: [
        { conditionName: "Severe COPD Exacerbation", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "Acute Hypercapnic Respiratory Failure", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "Chronic Cor Pulmonale", status: "ACTIVE", doctorId: residentUser.id },
      ],
      vitalsHistory: [
        { hoursAgo: 28, temp: 37.6, pulse: 112, sBp: 148, dBp: 86, rr: 30, spo2: 86 },
        { hoursAgo: 22, temp: 37.4, pulse: 102, sBp: 138, dBp: 82, rr: 26, spo2: 89 },
        { hoursAgo: 16, temp: 37.2, pulse: 94, sBp: 132, dBp: 78, rr: 22, spo2: 91 },
        { hoursAgo: 10, temp: 37.0, pulse: 88, sBp: 126, dBp: 74, rr: 20, spo2: 92 },
        { hoursAgo: 2, temp: 36.8, pulse: 82, sBp: 122, dBp: 72, rr: 18, spo2: 93 },
      ],
      medications: [
        { drugName: "Methylprednisolone (Solu-Medrol)", dosage: "60mg IV", frequency: "Q12H", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Duoneb Nebulizer", dosage: "2.5/0.5 mg", frequency: "Q4H", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Doxycycline", dosage: "100mg PO", frequency: "BID", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Home Oxygen Therapy", dosage: "2L via Nasal Cannula", frequency: "Continuous", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "ABG (Initial pH)", resultValue: "7.22", abnormal: true, recordedAt: hours(28) },
        { testName: "ABG (Initial PaCO2)", resultValue: "78 mmHg", abnormal: true, recordedAt: hours(28) },
        { testName: "ABG (Repeat pH after 12h BiPAP)", resultValue: "7.35", abnormal: false, recordedAt: hours(16) },
        { testName: "ABG (Repeat PaCO2 after 12h BiPAP)", resultValue: "58 mmHg", abnormal: true, recordedAt: hours(16) },
        { testName: "WBC Count", resultValue: "13.8 x10^3/uL", abnormal: true, recordedAt: hours(28) },
      ],
      investigations: [
        { orderName: "Portable Chest X-Ray", type: "Radiology", status: "Completed", orderedById: specialistUser.id, orderDate: hours(26) },
        { orderName: "Sputum Gram Stain & Culture", type: "Lab", status: "Completed", orderedById: residentUser.id, orderDate: hours(24) },
      ],
      clinicalExam: {
        generalExams: { GCS: 15, distress: "Mild", barrelChest: true, cyanosis: false, edema: "2+ bilateral pitting" },
        localExams: {
          chest: "Pursed-lip breathing, prolonged expiratory phase, widespread expiratory polyphonic wheezes bilaterally",
          cvs: "S1 S2 present, loud P2 component",
          abdomen: "Soft, non-tender",
        },
      },
      nursingNotes: [
        "BiPAP worn continuously for 12 hours. Patient tolerated mask well. ABG improved significantly. Somnolence resolved.",
        "Weaned off BiPAP to 2L nasal cannula. SpO2 maintaining 92-93% at rest.",
      ],
      clinicalNotes: [
        "72-year-old female with acute hypercapnic COPD exacerbation successfully non-invasively ventilated. Acidosis corrected from pH 7.22 to 7.35.",
      ],
      followUp: {
        subjective: "Patient reports significant relief of breathlessness and feeling alert.",
        objective: "Vitals stable on 2L NC. ABG pH 7.36, PaCO2 56 (baseline hypercapnia). Lungs clearing.",
        assessment: "Resolving COPD exacerbation.",
        plan: "1. Step down to floor care tomorrow. 2. Transition IV steroids to oral Prednisone taper.",
      },
    },

    {
      mrn: "MRN-DKA-106",
      nationalId: "NID-294019206",
      name: "Maya Lin",
      age: 22,
      gender: "Female",
      residence: "University Heights, Block C",
      occupation: "University Student",
      maritalStatus: "SINGLE",
      handedness: "RIGHT",
      history: {
        diabetesDm: true,
        hypertensionHtn: false,
        pastSimilarConditions: "DKA admission at diagnosis 4 years ago",
        pastDiseases: ["T1DM"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: false,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "None",
        inheritedDiseases: [],
        freeText: "Diagnosed with T1DM at age 18. Missed insulin doses during exam week due to gastroenteritis.",
      },
      allergies: [],
      bedNumber: "MICU-04",
      admission: {
        doctorId: specialist2User.id,
        nurseId: nurse2User.id,
        transferReason: "Severe Diabetic Ketoacidosis with profound anion gap metabolic acidosis and dehydration",
        placeOfTransfer: "Emergency Department",
        transferDoctorName: "Dr. Amanda Ross",
        chiefComplaint: "Nausea, intractable vomiting, abdominal pain, and Kussmaul respirations",
        complaintAnalysis: "Gastroenteritis symptoms for 2 days led to inability to tolerate oral intake and missed basal insulin.",
        symptomsRelatedSystem: "Polydipsia, polyuria, diffuse abdominal pain, deep rapid breathing, fruity breath odor",
        symptomsOtherSystems: "Extreme lethargy, dizziness",
        previousInvestigations: { edGlucose: "512 mg/dL", edBicarb: "7 mEq/L", edAnionGap: "26", edKetones: "Positive large" },
        previousTreatments: "2L 0.9% Normal Saline IV bolus, Regular Insulin IV drip 0.1 units/kg/hr, Potassium replacement",
        provisionalDiagnosis: "Severe Diabetic Ketoacidosis (DKA) / Anion Gap Metabolic Acidosis",
        status: "ACTIVE",
        admittedAt: hours(16),
      },
      diagnoses: [
        { conditionName: "Severe Diabetic Ketoacidosis (DKA)", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Type 1 Diabetes Mellitus", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Severe Anion Gap Metabolic Acidosis", status: "ACTIVE", doctorId: resident2User.id },
      ],
      vitalsHistory: [
        { hoursAgo: 16, temp: 36.6, pulse: 128, sBp: 98, dBp: 60, rr: 32, spo2: 99 },
        { hoursAgo: 12, temp: 36.7, pulse: 112, sBp: 106, dBp: 64, rr: 26, spo2: 99 },
        { hoursAgo: 8, temp: 36.8, pulse: 98, sBp: 112, dBp: 68, rr: 22, spo2: 99 },
        { hoursAgo: 4, temp: 36.9, pulse: 88, sBp: 116, dBp: 72, rr: 18, spo2: 100 },
        { hoursAgo: 1, temp: 36.8, pulse: 80, sBp: 118, dBp: 74, rr: 16, spo2: 100 },
      ],
      medications: [
        { drugName: "Regular Insulin Drip", dosage: "0.1 u/kg/hr", frequency: "Continuous", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "D5 0.45% Normal Saline + 20mEq KCl", dosage: "150 mL/hr", frequency: "Continuous", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Potassium Chloride IV", dosage: "20 mEq/hr", frequency: "PRN for K <4.5", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Ondansetron (Zofran)", dosage: "4mg IV", frequency: "Q8H PRN", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "Blood Glucose (Initial)", resultValue: "512 mg/dL", abnormal: true, recordedAt: hours(16) },
        { testName: "Blood Glucose (Current)", resultValue: "184 mg/dL", abnormal: false, recordedAt: hours(1) },
        { testName: "Serum Bicarbonate (Initial)", resultValue: "7 mEq/L", abnormal: true, recordedAt: hours(16) },
        { testName: "Serum Bicarbonate (Current)", resultValue: "19 mEq/L", abnormal: false, recordedAt: hours(1) },
        { testName: "Anion Gap", resultValue: "26 (Initial) -> 10 (Closed)", abnormal: false, recordedAt: hours(1) },
        { testName: "Beta-Hydroxybutyrate", resultValue: "5.8 mmol/L -> 0.6 mmol/L", abnormal: false, recordedAt: hours(1) },
        { testName: "Serum Potassium", resultValue: "4.4 mEq/L", abnormal: false, recordedAt: hours(4) },
      ],
      investigations: [
        { orderName: "Basic Metabolic Panel Q2H", type: "Lab", status: "Completed", orderedById: specialist2User.id, orderDate: hours(16) },
        { orderName: "Venous Blood Gas", type: "Lab", status: "Completed", orderedById: resident2User.id, orderDate: hours(8) },
      ],
      clinicalExam: {
        generalExams: { GCS: 15, mucosalDryness: "Severe initially, now moist", turgor: "Normal", acetoneBreath: "Resolved" },
        localExams: {
          abdomen: "Soft, non-tender, bowel sounds active in all 4 quadrants",
          cvs: "Regular rate and rhythm, no murmurs",
        },
      },
      nursingNotes: [
        "Insulin infusion titrated hourly according to protocol. Blood glucose decreased by 65-75 mg/dL/hr. Added D5 W to fluids when glucose reached 220 mg/dL.",
        "Anion gap closed (10). Patient alert, hungry, and requesting food.",
      ],
      clinicalNotes: [
        "22-year-old female with severe DKA now successfully resuscitated. Anion gap closed, metabolic acidosis resolved, blood glucose stable at 184 mg/dL.",
      ],
      followUp: {
        subjective: "Patient feels completely back to normal baseline, denies nausea or abdominal pain.",
        objective: "Anion gap 10, HCO3 19, Glucose 184. Tolerating clear liquids.",
        assessment: "Resolved DKA secondary to insulin non-compliance during viral illness.",
        plan: "1. Transition to subcutaneous Insulin Glargine & Lispro. 2. Stop IV insulin drip 2 hours post subcutaneous dose. 3. Transfer to endocrine floor.",
      },
    },

    {
      mrn: "MRN-GIBLEED-107",
      nationalId: "NID-194029407",
      name: "Carlos Santana-Rios",
      age: 58,
      gender: "Male",
      residence: "Old Town, Alley 5",
      occupation: "Mechanic",
      maritalStatus: "DIVORCED",
      handedness: "RIGHT",
      history: {
        diabetesDm: false,
        hypertensionHtn: true,
        pastSimilarConditions: "Prior upper GI bleed 1 year ago treated with endoscopic band ligation",
        pastDiseases: ["Alcoholic Cirrhosis (Child-Pugh B)", "Esophageal Varices", "HTN"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: false,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "None",
        inheritedDiseases: [],
        freeText: "Heavy alcohol use (6-8 beers daily for 25 years). Presented with hematemesis.",
      },
      allergies: [],
      bedNumber: "SICU-01",
      admission: {
        doctorId: specialistUser.id,
        nurseId: nurseUser.id,
        transferReason: "Acute Massive Upper Gastrointestinal Bleeding / Hemorrhagic Shock secondary to Esophageal Variceal Rupture",
        placeOfTransfer: "Endoscopy Suite",
        transferDoctorName: "Dr. Benjamin Cole (Gastroenterology)",
        chiefComplaint: "Voluminous hematemesis (bright red blood with clots), melena, and syncope",
        complaintAnalysis: "Vomited ~1000mL blood at home 3 hours ago followed by syncopal episode.",
        symptomsRelatedSystem: "Massive hematemesis, dark tarry melena, hematochezia, severe lightheadedness",
        symptomsOtherSystems: "Jaundice, abdominal distension",
        previousInvestigations: { egdReport: "Grade III esophageal varices with active spurting blood. 4 bands applied with successful hemostasis.", edHb: "6.2 g/dL" },
        previousTreatments: "Transfused 4 units PRBC, 2 units FFP, Octreotide 50mcg bolus + 50mcg/hr drip, Pantoprazole drip",
        provisionalDiagnosis: "Bleeding Esophageal Varices / Hemorrhagic Shock / Decompensated Cirrhosis",
        status: "ACTIVE",
        admittedAt: hours(14),
      },
      diagnoses: [
        { conditionName: "Ruptured Bleeding Esophageal Varices", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "Hemorrhagic Shock", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "Alcoholic Liver Cirrhosis (Child-Pugh B)", status: "ACTIVE", doctorId: residentUser.id },
      ],
      vitalsHistory: [
        { hoursAgo: 14, temp: 36.1, pulse: 126, sBp: 82, dBp: 46, rr: 24, spo2: 95 },
        { hoursAgo: 10, temp: 36.4, pulse: 108, sBp: 96, dBp: 56, rr: 20, spo2: 97 },
        { hoursAgo: 6, temp: 36.6, pulse: 94, sBp: 108, dBp: 64, rr: 18, spo2: 98 },
        { hoursAgo: 1, temp: 36.8, pulse: 84, sBp: 114, dBp: 68, rr: 16, spo2: 98 },
      ],
      medications: [
        { drugName: "Octreotide Infusion", dosage: "50 mcg/hr", frequency: "Continuous", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Pantoprazole (Protonix) Drip", dosage: "8 mg/hr", frequency: "Continuous", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Ceftriaxone", dosage: "1g IV", frequency: "Q24H", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Lactulose", dosage: "30 mL PO", frequency: "TID", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "Hemoglobin (Initial)", resultValue: "6.2 g/dL", abnormal: true, recordedAt: hours(14) },
        { testName: "Hemoglobin (Post-Transfusion)", resultValue: "9.4 g/dL", abnormal: false, recordedAt: hours(2) },
        { testName: "Platelets", resultValue: "64,000 /uL", abnormal: true, recordedAt: hours(14) },
        { testName: "INR", resultValue: "1.8", abnormal: true, recordedAt: hours(14) },
        { testName: "Total Bilirubin", resultValue: "4.8 mg/dL", abnormal: true, recordedAt: hours(14) },
      ],
      investigations: [
        { orderName: "Emergent EGD", type: "Procedure", status: "Completed", orderedById: specialistUser.id, orderDate: hours(14) },
        { orderName: "Complete Blood Count & Coags Q6H", type: "Lab", status: "Completed", orderedById: residentUser.id, orderDate: hours(6) },
      ],
      clinicalExam: {
        generalExams: { GCS: 14, jaundice: true, spiderNevi: true, palmarErythema: true, ascites: "Moderate" },
        localExams: {
          abdomen: "Soft, non-tender, fluid wave positive, spleen palpable 3cm below rib cage",
          cvs: "Hyperdynamic precordium, normal S1/S2",
        },
      },
      nursingNotes: [
        "Admitted from endoscopy. Sengstaken-Blakemore tube available at bedside as backup. Hemostasis stable post-banding.",
        "No further hematemesis or melena. Hemoglobin stable at 9.4 g/dL. Octreotide ongoing.",
      ],
      clinicalNotes: [
        "58-year-old male with acute variceal hemorrhage successfully controlled via endoscopic band ligation. Transfused to target Hb 8-9 g/dL. Prophylactic Ceftriaxone initiated.",
      ],
      followUp: {
        subjective: "Patient reports feeling less dizzy, no further vomiting or nausea.",
        objective: "Vitals stable, Hb 9.4. Stools transitioning to non-bloody.",
        assessment: "Stable status post variceal band ligation.",
        plan: "1. Continue Octreotide drip for total 72 hours. 2. Continue Ceftriaxone 7-day course. 3. Non-selective beta-blocker (Propranolol) initiation prior to discharge.",
      },
    },

    {
      mrn: "MRN-PANCREAS-108",
      nationalId: "NID-901827308",
      name: "David O'Connor",
      age: 44,
      gender: "Male",
      residence: "Greenfield, House 45",
      occupation: "Restaurant Manager",
      maritalStatus: "MARRIED",
      handedness: "RIGHT",
      history: {
        diabetesDm: false,
        hypertensionHtn: false,
        pastSimilarConditions: "Mild epigastric pain after heavy meals",
        pastDiseases: ["Hypertriglyceridemia"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: false,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "Brother has severe hypertriglyceridemia",
        inheritedDiseases: [],
        freeText: "Fasting lipid panel 6 months ago showed triglycerides >1000 mg/dL.",
      },
      allergies: [],
      bedNumber: "SICU-02",
      admission: {
        doctorId: specialist2User.id,
        nurseId: nurse2User.id,
        transferReason: "Severe Acute Necrotizing Pancreatitis secondary to Severe Hypertriglyceridemia",
        placeOfTransfer: "Emergency Department",
        transferDoctorName: "Dr. Lisa Wong",
        chiefComplaint: "Excruciating epigastric abdominal pain radiating to the back",
        complaintAnalysis: "Constant severe 10/10 stabbing pain started 24 hours ago after a heavy dinner.",
        symptomsRelatedSystem: "Epigastric pain radiating directly to mid-back, intractable nausea, repeated bilious vomiting",
        symptomsOtherSystems: "Abdominal distension, low grade fever",
        previousInvestigations: { lipase: "3,450 U/L", triglycerides: "1,680 mg/dL", ctAbdomen: "Extensive pancreatic enlargement with fluid collections and focal non-enhancing necrosis in tail" },
        previousTreatments: "Resuscitation with Lactated Ringer's 250 mL/hr, Dilaudid PCA, IV Insulin Drip for triglyceride clearance",
        provisionalDiagnosis: "Severe Acute Pancreatitis / Pancreatic Necrosis / Hypertriglyceridemia",
        status: "ACTIVE",
        admittedAt: hours(30),
      },
      diagnoses: [
        { conditionName: "Severe Acute Necrotizing Pancreatitis", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Severe Hypertriglyceridemia (>1500 mg/dL)", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Systemic Inflammatory Response Syndrome (SIRS)", status: "ACTIVE", doctorId: resident2User.id },
      ],
      vitalsHistory: [
        { hoursAgo: 30, temp: 38.4, pulse: 116, sBp: 104, dBp: 62, rr: 24, spo2: 95 },
        { hoursAgo: 20, temp: 38.1, pulse: 104, sBp: 110, dBp: 68, rr: 22, spo2: 96 },
        { hoursAgo: 10, temp: 37.8, pulse: 94, sBp: 116, dBp: 72, rr: 20, spo2: 97 },
        { hoursAgo: 1, temp: 37.3, pulse: 86, sBp: 120, dBp: 74, rr: 18, spo2: 98 },
      ],
      medications: [
        { drugName: "Regular Insulin Drip (for TG lowering)", dosage: "0.1 u/kg/hr", frequency: "Continuous", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "D5W Infusion (to prevent hypoglycemia)", dosage: "100 mL/hr", frequency: "Continuous", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Lactated Ringer's", dosage: "200 mL/hr", frequency: "Continuous", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Hydromorphone (Dilaudid) PCA", dosage: "0.2mg lockout 10m", frequency: "PRN", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "Serum Lipase", resultValue: "3,450 U/L", abnormal: true, recordedAt: hours(30) },
        { testName: "Triglycerides (Initial)", resultValue: "1,680 mg/dL", abnormal: true, recordedAt: hours(30) },
        { testName: "Triglycerides (Current)", resultValue: "420 mg/dL (Target <500 achieved)", abnormal: false, recordedAt: hours(2) },
        { testName: "Serum Calcium", resultValue: "8.1 mg/dL", abnormal: true, recordedAt: hours(15) },
        { testName: "WBC Count", resultValue: "17.2 x10^3/uL", abnormal: true, recordedAt: hours(30) },
      ],
      investigations: [
        { orderName: "Contrast-Enhanced Abdominal CT", type: "CT", status: "Completed", orderedById: specialist2User.id, orderDate: hours(28) },
        { orderName: "Abdominal Ultrasound", type: "Ultrasound", status: "Completed", orderedById: resident2User.id, orderDate: hours(30) },
      ],
      clinicalExam: {
        generalExams: { GCS: 15, distress: "Moderate", cullenSign: false, greyTurnerSign: false },
        localExams: {
          abdomen: "Distended, marked epigastric tenderness to palpation, voluntary guarding, hypoactive bowel sounds",
          cvs: "Tachycardic, no murmurs",
        },
      },
      nursingNotes: [
        "Patient receiving aggressive hydration with Lactated Ringer's. Insulin drip ongoing. Triglyceride levels dropped significantly.",
        "Pain controlled on Dilaudid PCA. Abdominal distension slightly decreased. Tolerating nasogastric tube to suction.",
      ],
      clinicalNotes: [
        "44-year-old male with severe acute hypertriglyceridemic pancreatitis. Triglycerides cleared to <500 mg/dL on insulin therapy. Organ failure avoided with goal-directed fluid resuscitation.",
      ],
      followUp: {
        subjective: "Patient reports abdominal pain decreased from 10/10 to 3/10.",
        objective: "Triglycerides 420 mg/dL. Vitals stable. Urine output >1 mL/kg/hr.",
        assessment: "Improving necrotizing pancreatitis post triglyceride clearance.",
        plan: "1. Discontinue insulin drip as triglycerides <500. 2. Initiate enteral nutrition via nasojejunal tube. 3. Continue pain control.",
      },
    },

    {
      mrn: "MRN-STROKE-109",
      nationalId: "NID-781029309",
      name: "Harold Jenkins",
      age: 70,
      gender: "Male",
      residence: "Eastside, Street 4",
      occupation: "Retired Bank Manager",
      maritalStatus: "MARRIED",
      handedness: "RIGHT",
      history: {
        diabetesDm: true,
        hypertensionHtn: true,
        pastSimilarConditions: "Transient ischemic attack (TIA) 3 years ago",
        pastDiseases: ["HTN", "T2DM", "Hyperlipidemia"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: false,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "Father had fatal ischemic stroke at 74",
        inheritedDiseases: [],
        freeText: "Poor compliance with anti-hypertensive medications.",
      },
      allergies: [],
      bedNumber: "Neuro-02",
      admission: {
        doctorId: specialistUser.id,
        nurseId: nurseUser.id,
        transferReason: "Acute Intracerebral Hemorrhage (Left Basal Ganglia) requiring neuro-intensive BP management",
        placeOfTransfer: "Emergency Department",
        transferDoctorName: "Dr. Rachel Adams",
        chiefComplaint: "Sudden onset right-sided hemiplegia, expressive aphasia, and severe headache",
        complaintAnalysis: "Patient collapsed at home 2 hours ago. SBP 210 mmHg in ED.",
        symptomsRelatedSystem: "Right face/arm/leg weakness (0/5 strength), dense dysarthria/aphasia, headache",
        symptomsOtherSystems: "Nausea, vomiting",
        previousInvestigations: { headCt: "22mL acute left basal ganglia hemorrhage with surrounding edema. 3mm rightward midline shift." },
        previousTreatments: "Clevidipine (Cleviprex) IV drip initiated in ED to target SBP 130-140 mmHg",
        provisionalDiagnosis: "Acute Left Basal Ganglia Intracerebral Hemorrhage / Hypertensive Emergency",
        status: "ACTIVE",
        admittedAt: hours(22),
      },
      diagnoses: [
        { conditionName: "Acute Left Basal Ganglia Intracerebral Hemorrhage (ICH)", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "Hypertensive Crisis", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "Expressive Aphasia & Right Hemiplegia", status: "ACTIVE", doctorId: residentUser.id },
      ],
      vitalsHistory: [
        { hoursAgo: 22, temp: 36.8, pulse: 78, sBp: 198, dBp: 110, rr: 18, spo2: 97 },
        { hoursAgo: 16, temp: 36.9, pulse: 74, sBp: 152, dBp: 88, rr: 16, spo2: 98 },
        { hoursAgo: 10, temp: 36.7, pulse: 72, sBp: 138, dBp: 82, rr: 16, spo2: 98 },
        { hoursAgo: 1, temp: 36.8, pulse: 70, sBp: 134, dBp: 78, rr: 15, spo2: 99 },
      ],
      medications: [
        { drugName: "Clevidipine (Cleviprex) Drip", dosage: "2-8 mg/hr", frequency: "Continuous", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Labetalol IV", dosage: "10-20mg IV", frequency: "PRN SBP >140", doctorId: residentUser.id, adminStatus: "HELD" },
        { drugName: "Nicardipine IV", dosage: "5 mg/hr", frequency: "Continuous", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Docusate Sodium", dosage: "100mg PO", frequency: "BID", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "Head CT (Initial)", resultValue: "22mL Left Basal Ganglia Hemorrhage", abnormal: true, recordedAt: hours(22) },
        { testName: "Head CT (Repeat 6h)", resultValue: "No expansion of hematoma, stable 22mL", abnormal: true, recordedAt: hours(16) },
        { testName: "INR", resultValue: "1.0", abnormal: false, recordedAt: hours(22) },
        { testName: "Platelet Count", resultValue: "245,000 /uL", abnormal: false, recordedAt: hours(22) },
      ],
      investigations: [
        { orderName: "Non-Contrast Head CT Q6H", type: "CT", status: "Completed", orderedById: specialistUser.id, orderDate: hours(22) },
        { orderName: "CT Angiography Head & Neck", type: "CT", status: "Completed", orderedById: specialistUser.id, orderDate: hours(20) },
      ],
      clinicalExam: {
        generalExams: { GCS: 12, E3V4M5: true, NIHSS: 16, pupilRight: "3mm prompt", pupilLeft: "3mm prompt" },
        localExams: {
          neuro: "Right facial droop present. Right upper and lower extremity motor power 0/5. Left extremities 5/5. Expressive aphasia present.",
          cvs: "Regular rate, high peripheral vascular resistance",
        },
      },
      nursingNotes: [
        "Strict blood pressure protocol enforced. Clevidipine drip titrated to maintain SBP strictly between 130-140 mmHg.",
        "Repeat head CT confirms stable hematoma volume without expansion. Patient follows simple non-verbal commands.",
      ],
      clinicalNotes: [
        "70-year-old male with acute hypertensive left basal ganglia ICH. Target SBP <140 mmHg achieved within 2 hours. Hematoma expansion prevented.",
      ],
      followUp: {
        subjective: "Patient communicates via gestures, nods appropriately to questions.",
        objective: "GCS 12, SBP stable 130-135 mmHg. Repeat CT clear of expansion.",
        assessment: "Stable acute left basal ganglia ICH.",
        plan: "1. Wean Clevidipine to oral antihypertensives (Amlodipine & Lispro). 2. Initiate speech therapy & physical therapy evaluation. 3. Transfer to Neuro Stepdown.",
      },
    },

    {
      mrn: "MRN-POSTOP-110",
      nationalId: "NID-681920310",
      name: "Margaret Thatcher-Smith",
      age: 67,
      gender: "Female",
      residence: "West End, House 12",
      occupation: "Architect",
      maritalStatus: "MARRIED",
      handedness: "RIGHT",
      history: {
        diabetesDm: true,
        hypertensionHtn: true,
        pastSimilarConditions: "Severe exertional angina and dyspnea NYHA Class III",
        pastDiseases: ["Severe Aortic Stenosis", "Triple Vessel CAD", "T2DM"],
        previousOperations: true,
        operationsDetails: "Laparoscopic Cholecystectomy (2012)",
        hasAllergies: false,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "None",
        inheritedDiseases: [],
        freeText: "Scheduled elective cardiac surgery.",
      },
      allergies: [],
      bedNumber: "CVICU-01",
      admission: {
        doctorId: specialist2User.id,
        nurseId: nurse2User.id,
        transferReason: "Post-operative monitoring post CABG x4 & Mechanical Aortic Valve Replacement (AVR)",
        placeOfTransfer: "Cardiac Surgery OR",
        transferDoctorName: "Dr. Christopher Sterling (Cardiothoracic Surgery)",
        chiefComplaint: "Post-operative recovery following open heart surgery",
        complaintAnalysis: "Bypass time 112 mins, cross-clamp time 84 mins. Weaned from CPB on low dose Epinephrine.",
        symptomsRelatedSystem: "Post-op surgical wounds, chest tubes in mediastinum & pleural space",
        symptomsOtherSystems: "Sedated on mechanical ventilator",
        previousInvestigations: { operativeDetails: "CABG x4 (LIMA-LAD, SVG-OM1, SVG-Diagonal, SVG-PDA) + 21mm St. Jude Mechanical AVR" },
        previousTreatments: "Extubated successfully at hour 6 post-op. Epicardial pacing wire attached at A-paced 80 bpm.",
        provisionalDiagnosis: "Status Post CABG x4 & Mechanical AVR / Post-Cardiotomy Recovery",
        status: "ACTIVE",
        admittedAt: hours(18),
      },
      diagnoses: [
        { conditionName: "Status Post CABG x4 & Mechanical AVR", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Coronary Artery Disease", status: "RESOLVED", doctorId: specialist2User.id },
        { conditionName: "Critical Aortic Valve Stenosis", status: "RESOLVED", doctorId: specialist2User.id },
      ],
      vitalsHistory: [
        { hoursAgo: 18, temp: 35.8, pulse: 80, sBp: 108, dBp: 62, rr: 14, spo2: 99 },
        { hoursAgo: 12, temp: 36.6, pulse: 80, sBp: 114, dBp: 66, rr: 14, spo2: 99 },
        { hoursAgo: 6, temp: 36.9, pulse: 78, sBp: 118, dBp: 70, rr: 16, spo2: 98 },
        { hoursAgo: 1, temp: 37.0, pulse: 76, sBp: 122, dBp: 72, rr: 16, spo2: 99 },
      ],
      medications: [
        { drugName: "Epinephrine Drip", dosage: "0.02 mcg/kg/min", frequency: "Continuous", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Insulin Sliding Scale", dosage: "2-6 units SC", frequency: "Q4H", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Warfarin (Coumadin)", dosage: "5mg PO", frequency: "QHS", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Cefazolin", dosage: "2g IV", frequency: "Q8H", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "Post-Op Hemoglobin", resultValue: "10.2 g/dL", abnormal: false, recordedAt: hours(18) },
        { testName: "INR", resultValue: "1.4 (Bridging to target 2.5-3.5)", abnormal: true, recordedAt: hours(6) },
        { testName: "Chest Tube Drainage (Total 18h)", resultValue: "280 mL serosanguinous", abnormal: false, recordedAt: hours(1) },
        { testName: "Serum Potassium", resultValue: "4.5 mEq/L", abnormal: false, recordedAt: hours(6) },
      ],
      investigations: [
        { orderName: "Post-Op Portable CXR", type: "Radiology", status: "Completed", orderedById: specialist2User.id, orderDate: hours(16) },
        { orderName: "12-Lead ECG", type: "ECG", status: "Completed", orderedById: resident2User.id, orderDate: hours(12) },
      ],
      clinicalExam: {
        generalExams: { GCS: 15, extubated: true, chestTubes: "2 mediastinal tubes", pacingWires: "Epicardial pacing at A-paced 80" },
        localExams: {
          chest: "Median sternotomy incision clean & dry with sternal zip-ties intact. Bilateral clear breath sounds.",
          cvs: "Mechanical valve click audible. Crisp S1, mechanical S2.",
        },
      },
      nursingNotes: [
        "Successfully extubated 6 hours post-op. SpO2 99% on 3L nasal cannula. Patient awake, alert, coughing effectively with sternal pillow.",
        "Chest tube output minimal (15 mL over last 4 hours). Epicardial pacer off, baseline sinus rhythm 76 bpm.",
      ],
      clinicalNotes: [
        "67-year-old female POD #1 post CABG x4 + Mechanical AVR. Extubated smoothly, hemodynamically stable, minimal drain output.",
      ],
      followUp: {
        subjective: "Patient reports sternal discomfort 3/10 managed well with oral acetaminophen.",
        objective: "Extubated, telemetry sinus rhythm 76, chest tube output minimal.",
        assessment: "Unremarkable recovery post CABG x4 + AVR.",
        plan: "1. Remove mediastinal chest tubes today. 2. Continue Warfarin titration. 3. Transfer to CVICU stepdown.",
      },
    },

    {
      mrn: "MRN-AKI-111",
      nationalId: "NID-581920411",
      name: "Samuel Goldwyn",
      age: 79,
      gender: "Male",
      residence: "Northside, Street 82",
      occupation: "Retired Accountant",
      maritalStatus: "MARRIED",
      handedness: "RIGHT",
      history: {
        diabetesDm: true,
        hypertensionHtn: true,
        pastSimilarConditions: "Baseline CKD Stage IIIa (Creatinine 1.6 mg/dL)",
        pastDiseases: ["CKD Stage IIIa", "HTN", "T2DM", "Osteoarthritis"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: true,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "None",
        inheritedDiseases: [],
        freeText: "Ingested high-dose Ibuprofen for severe knee pain for 10 days while dehydrated.",
      },
      allergies: [{ allergen: "Ibuprofen / NSAIDs", severity: "Severe" }],
      bedNumber: "MICU-05",
      admission: {
        doctorId: specialistUser.id,
        nurseId: nurseUser.id,
        transferReason: "Acute Kidney Injury Stage 3 with Severe Life-Threatening Hyperkalemia & Anuria requiring emergent HD/CRRT",
        placeOfTransfer: "Emergency Department",
        transferDoctorName: "Dr. Michael Chang",
        chiefComplaint: "Anuria for 36 hours, profound weakness, nausea, and ECG sinus bradycardia with peaked T waves",
        complaintAnalysis: "Took Ibuprofen 800mg TID for 10 days. Stopped producing urine yesterday.",
        symptomsRelatedSystem: "Anuria, generalized muscle weakness, lethargy, fluid overload",
        symptomsOtherSystems: "Nausea, blunted affect",
        previousInvestigations: { edK: "7.4 mEq/L (Critical)", edCr: "7.2 mg/dL", edEcg: "Sine wave hyperkalemic pattern" },
        previousTreatments: "Calcium Gluconate 2g IV, Insulin 10u IV + Dextrose 50% 50mL, Lokelma 10g PO, Femoral hemodialysis catheter placed",
        provisionalDiagnosis: "Acute Kidney Injury (Stage 3) / Severe Hyperkalemia / NSAID Nephrotoxicity",
        status: "ACTIVE",
        admittedAt: hours(15),
      },
      diagnoses: [
        { conditionName: "Acute Kidney Injury Stage 3 (Anuric)", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "Severe Life-Threatening Hyperkalemia", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "NSAID-Induced Acute Tubular Necrosis", status: "ACTIVE", doctorId: residentUser.id },
      ],
      vitalsHistory: [
        { hoursAgo: 15, temp: 36.3, pulse: 48, sBp: 152, dBp: 88, rr: 20, spo2: 96 },
        { hoursAgo: 10, temp: 36.5, pulse: 62, sBp: 142, dBp: 82, rr: 18, spo2: 97 },
        { hoursAgo: 5, temp: 36.6, pulse: 70, sBp: 136, dBp: 78, rr: 16, spo2: 98 },
        { hoursAgo: 1, temp: 36.7, pulse: 74, sBp: 130, dBp: 76, rr: 16, spo2: 98 },
      ],
      medications: [
        { drugName: "Calcium Gluconate", dosage: "2g IV", frequency: "STAT", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Regular Insulin", dosage: "10 units IV", frequency: "STAT", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Dextrose 50%", dosage: "50 mL IV", frequency: "STAT", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Sodium Zirconium Cyclosilicate (Lokelma)", dosage: "10g PO", frequency: "TID", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "Serum Potassium (Initial)", resultValue: "7.4 mEq/L (Critical)", abnormal: true, recordedAt: hours(15) },
        { testName: "Serum Potassium (Post-Dialysis)", resultValue: "4.6 mEq/L", abnormal: false, recordedAt: hours(2) },
        { testName: "Serum Creatinine", resultValue: "7.2 mg/dL", abnormal: true, recordedAt: hours(15) },
        { testName: "BUN", resultValue: "102 mg/dL", abnormal: true, recordedAt: hours(15) },
      ],
      investigations: [
        { orderName: "Emergent Hemodialysis Run (3 Hours)", type: "Procedure", status: "Completed", orderedById: specialistUser.id, orderDate: hours(14) },
        { orderName: "Renal Ultrasound", type: "Ultrasound", status: "Completed", orderedById: residentUser.id, orderDate: hours(10) },
      ],
      clinicalExam: {
        generalExams: { GCS: 15, edema: "2+ bilateral legs", dialysisCatheter: "Right femoral hemodialysis line intact" },
        localExams: {
          cvs: "Bradycardia resolved post calcium/dialysis, S1 S2 normal",
          lungs: "Clear bilaterally",
        },
      },
      nursingNotes: [
        "Emergent 3-hour hemodialysis run completed via right femoral line. Potassium normalized from 7.4 to 4.6 mEq/L. ECG sine wave resolved.",
        "Patient resting comfortably. Urine output remains 0 mL (anuric). Fluid restriction 1000 mL/24h.",
      ],
      clinicalNotes: [
        "79-year-old male with NSAID-induced Stage 3 AKI and hyperkalemia. Hyperkalemia emergencies managed with Calcium/Insulin and hemodialysis.",
      ],
      followUp: {
        subjective: "Patient feels much stronger, muscle weakness completely gone.",
        objective: "Potassium 4.6, Creatinine 5.1 post-HD. ECG normal sinus rhythm.",
        assessment: "Improving hyperkalemia post-HD; ongoing anuric AKI.",
        plan: "1. Schedule intermittent hemodialysis tomorrow. 2. Monitor for recovery of native renal function.",
      },
    },

    {
      mrn: "MRN-LIVER-112",
      nationalId: "NID-481920512",
      name: "Nadia Kowalski",
      age: 51,
      gender: "Female",
      residence: "Riverside, Apt 7",
      occupation: "Florist",
      maritalStatus: "MARRIED",
      handedness: "RIGHT",
      history: {
        diabetesDm: true,
        hypertensionHtn: true,
        pastSimilarConditions: "2 previous paracentesis procedures for refractory ascites",
        pastDiseases: ["NASH Cirrhosis (Child-Pugh C, MELD-Na 28)", "T2DM", "HTN"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: false,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "None",
        inheritedDiseases: [],
        freeText: "On liver transplant waitlist.",
      },
      allergies: [],
      bedNumber: "MICU-06",
      admission: {
        doctorId: specialist2User.id,
        nurseId: nurse2User.id,
        transferReason: "Decompensated NASH Cirrhosis with Grade III Hepatic Encephalopathy & Tense Ascites",
        placeOfTransfer: "Emergency Department",
        transferDoctorName: "Dr. Katherine Bell",
        chiefComplaint: "Severe confusion, somnolence, asterixis, and marked abdominal distension",
        complaintAnalysis: "Progressive disorientation over 2 days. Found somnolent this morning.",
        symptomsRelatedSystem: "Asterixis ('flapping tremor'), disorientation, abdominal fullness, umbilical hernia",
        symptomsOtherSystems: "Jaundice, scleral icterus",
        previousInvestigations: { edAmmonia: "172 umol/L", edBilirubin: "14.6 mg/dL", edInr: "2.5" },
        previousTreatments: "Lactulose 30mL PO q2h until 3 bowel movements, Rifaximin 550mg PO BID, Paracentesis 4.5L drained + Albumin 50g IV",
        provisionalDiagnosis: "Hepatic Encephalopathy (Grade III) / Decompensated Cirrhosis / Refractory Ascites",
        status: "ACTIVE",
        admittedAt: hours(32),
      },
      diagnoses: [
        { conditionName: "Grade III Hepatic Encephalopathy", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Decompensated NASH Cirrhosis (Child-Pugh C)", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Tense Ascites", status: "ACTIVE", doctorId: resident2User.id },
      ],
      vitalsHistory: [
        { hoursAgo: 32, temp: 37.2, pulse: 96, sBp: 96, dBp: 54, rr: 20, spo2: 96 },
        { hoursAgo: 20, temp: 37.0, pulse: 88, sBp: 102, dBp: 60, rr: 18, spo2: 97 },
        { hoursAgo: 10, temp: 36.9, pulse: 82, sBp: 106, dBp: 64, rr: 16, spo2: 98 },
        { hoursAgo: 1, temp: 36.8, pulse: 78, sBp: 110, dBp: 66, rr: 16, spo2: 98 },
      ],
      medications: [
        { drugName: "Lactulose", dosage: "30 mL PO/NG", frequency: "Q6H", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Rifaximin", dosage: "550 mg PO", frequency: "BID", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "IV Albumin 25%", dosage: "25g IV", frequency: "Daily", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Spironolactone", dosage: "100 mg PO", frequency: "Daily", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "Serum Ammonia (Initial)", resultValue: "172 umol/L", abnormal: true, recordedAt: hours(32) },
        { testName: "Serum Ammonia (Current)", resultValue: "68 umol/L", abnormal: false, recordedAt: hours(4) },
        { testName: "Total Bilirubin", resultValue: "14.6 mg/dL", abnormal: true, recordedAt: hours(32) },
        { testName: "Ascitic Fluid Cell Count", resultValue: "WBC 110/uL, PMN 18% (SBP Ruled Out)", abnormal: false, recordedAt: hours(24) },
      ],
      investigations: [
        { orderName: "Diagnostic & Therapeutic Paracentesis", type: "Procedure", status: "Completed", orderedById: specialist2User.id, orderDate: hours(28) },
        { orderName: "Liver Doppler Ultrasound", type: "Ultrasound", status: "Completed", orderedById: resident2User.id, orderDate: hours(24) },
      ],
      clinicalExam: {
        generalExams: { GCS: 14, jaundice: true, scleralIcterus: true, asterixis: "Mild bilateral" },
        localExams: {
          abdomen: "Abdomen softer post 4.5L paracentesis. Umbilical hernia reduced.",
          neuro: "Alert, oriented to self and year. Speech much clearer.",
        },
      },
      nursingNotes: [
        "Paracentesis performed at bedside, 4.5L clear amber fluid removed. IV Albumin 50g infused during procedure.",
        "Patient had 3 soft bowel movements. Encephalopathy score improved from Grade III to Grade I.",
      ],
      clinicalNotes: [
        "51-year-old female with decompensated NASH cirrhosis. Encephalopathy rapidly cleared with Lactulose & Rifaximin. Paracentesis negative for SBP.",
      ],
      followUp: {
        subjective: "Patient is awake, conversing normally, reports significant relief of abdominal tension.",
        objective: "Ammonia decreased to 68. GCS 15. Ascitic fluid culture negative.",
        assessment: "Resolving hepatic encephalopathy.",
        plan: "1. Continue Lactulose titrated to 3 stools/day. 2. Contact Transplant Team for update. 3. Transfer to Hepatology floor.",
      },
    },

    {
      mrn: "MRN-BURN-113",
      nationalId: "NID-381920613",
      name: "Tyler Durden-Vance",
      age: 33,
      gender: "Male",
      residence: "Industrial Zone, Unit 19",
      occupation: "Chemical Plant Technician",
      maritalStatus: "SINGLE",
      handedness: "RIGHT",
      history: {
        diabetesDm: false,
        hypertensionHtn: false,
        pastSimilarConditions: "None",
        pastDiseases: ["None"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: false,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "None",
        inheritedDiseases: [],
        freeText: "Industrial boiler explosion resulting in flame burn and smoke inhalation.",
      },
      allergies: [],
      bedNumber: "Burn-01",
      admission: {
        doctorId: specialistUser.id,
        nurseId: nurseUser.id,
        transferReason: "35% TBSA 2nd and 3rd Degree Flame Burns & Grade 2 Inhalation Injury",
        placeOfTransfer: "Burn Center Trauma Bay",
        transferDoctorName: "Dr. Eric Miller (Burn Surgery)",
        chiefComplaint: "Severe partial and full-thickness burns to anterior chest, arms, face, and smoke inhalation",
        complaintAnalysis: "Trapped in enclosed room during explosion for ~5 mins. Intubated immediately for airway edema protection.",
        symptomsRelatedSystem: "Blistered & charred skin anterior trunk, bilateral arms, soot in oral cavity",
        symptomsOtherSystems: "Facial edema",
        previousInvestigations: { parklandCalculation: "35% TBSA x 80kg x 4mL = 11,200 mL LR over 24 hours", bronchoscopy: "Grade 2 Inhalation Injury" },
        previousTreatments: "Intubated AC/VC, Parkland resuscitation protocol initiated, Silver Sulfadiazine dressings, Fentanyl/Midazolam drips",
        provisionalDiagnosis: "35% TBSA Major Thermal Burn / Inhalation Injury / Acute Rhabdomyolysis Risk",
        status: "ACTIVE",
        admittedAt: hours(20),
      },
      diagnoses: [
        { conditionName: "35% TBSA Second & Third Degree Thermal Burns", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "Inhalation Injury (Grade 2)", status: "ACTIVE", doctorId: specialistUser.id },
        { conditionName: "High Risk Rhabdomyolysis", status: "ACTIVE", doctorId: residentUser.id },
      ],
      vitalsHistory: [
        { hoursAgo: 20, temp: 37.8, pulse: 132, sBp: 114, dBp: 68, rr: 22, spo2: 98 },
        { hoursAgo: 14, temp: 38.2, pulse: 120, sBp: 118, dBp: 72, rr: 20, spo2: 99 },
        { hoursAgo: 8, temp: 38.0, pulse: 108, sBp: 122, dBp: 74, rr: 18, spo2: 99 },
        { hoursAgo: 1, temp: 37.7, pulse: 98, sBp: 124, dBp: 76, rr: 16, spo2: 100 },
      ],
      medications: [
        { drugName: "Lactated Ringer's (Parkland Drip)", dosage: "450 mL/hr", frequency: "Continuous", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Fentanyl Drip", dosage: "100 mcg/hr", frequency: "Continuous", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Midazolam (Versed) Drip", dosage: "2-4 mg/hr", frequency: "Continuous", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Silver Sulfadiazine 1% Cream", dosage: "Topical", frequency: "Q12H", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "Carboxyhemoglobin", resultValue: "3.8% (Down from 16%)", abnormal: false, recordedAt: hours(20) },
        { testName: "Serum Creatine Kinase (CK)", resultValue: "3,800 U/L", abnormal: true, recordedAt: hours(12) },
        { testName: "Urine Myoglobin", resultValue: "Positive", abnormal: true, recordedAt: hours(12) },
        { testName: "Hemoglobin", resultValue: "15.4 g/dL (Hemoconcentration)", abnormal: true, recordedAt: hours(20) },
      ],
      investigations: [
        { orderName: "Fiberoptic Bronchoscopy", type: "Procedure", status: "Completed", orderedById: specialistUser.id, orderDate: hours(18) },
        { orderName: "Chest CT", type: "CT", status: "Completed", orderedById: residentUser.id, orderDate: hours(16) },
      ],
      clinicalExam: {
        generalExams: { GCS: 3, intubated: true, burnTbsa: "35%", facialEdema: "Moderate" },
        localExams: {
          skin: "Anterior chest & bilateral arms covered in clean silver sulfadiazine dressings. Escharotomies not required currently.",
          chest: "Ventilated, mild bronchial rales",
        },
      },
      nursingNotes: [
        "Parkland fluid resuscitation running smoothly. Foley catheter output maintained strictly >50-70 mL/hr (target for burn injury).",
        "Wound debridement and dressing changes completed under IV analgesia. Eschar intact without compartment syndrome signs.",
      ],
      clinicalNotes: [
        "33-year-old male with 35% TBSA major burns and inhalation injury. Parkland fluid resuscitation target achieved without abdominal compartment syndrome.",
      ],
      followUp: {
        subjective: "Patient sedated on ventilator.",
        objective: "Urine output 65 mL/hr clear amber. Carboxyhemoglobin normal.",
        assessment: "Stable resuscitation phase of major burn injury.",
        plan: "1. Transition Parkland rate to maintenance + evaporative losses. 2. Operative excision and skin grafting scheduled for Day 3.",
      },
    },

    {
      mrn: "MRN-OVERDOSE-114",
      nationalId: "NID-281920714",
      name: "Chloe Bennett",
      age: 29,
      gender: "Female",
      residence: "Downtown, Loft 302",
      occupation: "Graphic Designer",
      maritalStatus: "SINGLE",
      handedness: "LEFT",
      history: {
        diabetesDm: false,
        hypertensionHtn: false,
        pastSimilarConditions: "Prior suicide gesture 2 years ago",
        pastDiseases: ["Major Depressive Disorder", "Generalized Anxiety Disorder"],
        previousOperations: false,
        operationsDetails: "None",
        hasAllergies: false,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "Mother has Bipolar Disorder",
        inheritedDiseases: [],
        freeText: "Intentional ingestion of ~2000mg Amitriptyline.",
      },
      allergies: [],
      bedNumber: "MICU-07",
      admission: {
        doctorId: specialist2User.id,
        nurseId: nurse2User.id,
        transferReason: "Severe Tricyclic Antidepressant (TCA) Toxicity with QRS Prolongation & Hypotension",
        placeOfTransfer: "Emergency Department",
        transferDoctorName: "Dr. Nathan Cole",
        chiefComplaint: "Obtundation, seizures, wide-complex tachycardia, and severe anticholinergic toxicity",
        complaintAnalysis: "Found unresponsive by roommate with empty Amitriptyline bottle 4 hours prior.",
        symptomsRelatedSystem: "Coma, QRS interval 142ms, terminal R wave in aVR, dry mucous membranes, mydriasis",
        symptomsOtherSystems: "Urinary retention, flushing",
        previousInvestigations: { ecg: "Sinus Tachycardia 138 bpm, QRS 142ms, right axis deviation", tcaScreen: "Positive >1000 ng/mL" },
        previousTreatments: "Intubated for airway protection, Sodium Bicarbonate 8.4% 100mEq IV boluses x3, Hypertonic Bicarb drip",
        provisionalDiagnosis: "Severe Tricyclic Antidepressant Overdose / QRS Widening / Anticholinergic Toxicity",
        status: "ACTIVE",
        admittedAt: hours(24),
      },
      diagnoses: [
        { conditionName: "Severe Tricyclic Antidepressant (Amitriptyline) Overdose", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Cardiac Conduction System Toxicity (QRS >140ms)", status: "ACTIVE", doctorId: specialist2User.id },
        { conditionName: "Severe Anticholinergic Syndrome", status: "ACTIVE", doctorId: resident2User.id },
      ],
      vitalsHistory: [
        { hoursAgo: 24, temp: 38.1, pulse: 138, sBp: 88, dBp: 52, rr: 16, spo2: 99 },
        { hoursAgo: 18, temp: 37.8, pulse: 118, sBp: 104, dBp: 62, rr: 16, spo2: 100 },
        { hoursAgo: 12, temp: 37.3, pulse: 102, sBp: 112, dBp: 68, rr: 16, spo2: 100 },
        { hoursAgo: 1, temp: 36.9, pulse: 88, sBp: 118, dBp: 74, rr: 14, spo2: 100 },
      ],
      medications: [
        { drugName: "Sodium Bicarbonate 8.4% Infusion", dosage: "150 mEq in D5W at 150 mL/hr", frequency: "Continuous", doctorId: specialist2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Activated Charcoal via NGT", dosage: "50g", frequency: "STAT", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
        { drugName: "Propofol Drip", dosage: "20 mcg/kg/min", frequency: "Continuous", doctorId: resident2User.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "ECG QRS Duration (Initial)", resultValue: "142 ms (High Ventricular Dysrhythmia Risk)", abnormal: true, recordedAt: hours(24) },
        { testName: "ECG QRS Duration (Current)", resultValue: "92 ms (Normalized)", abnormal: false, recordedAt: hours(2) },
        { testName: "Arterial Blood Gas (pH Target 7.45-7.55)", resultValue: "pH 7.49", abnormal: false, recordedAt: hours(6) },
        { testName: "Serum Potassium", resultValue: "3.9 mEq/L", abnormal: false, recordedAt: hours(12) },
      ],
      investigations: [
        { orderName: "Continuous 12-Lead Telemetry", type: "ECG", status: "Completed", orderedById: specialist2User.id, orderDate: hours(24) },
        { orderName: "Serum Toxicology Screen", type: "Lab", status: "Completed", orderedById: resident2User.id, orderDate: hours(24) },
      ],
      clinicalExam: {
        generalExams: { GCS: 3, intubated: true, pupils: "6mm sluggish bilaterally", skin: "Dry and flushed initially" },
        localExams: {
          cvs: "Tachycardic initially, now normal sinus rhythm",
          abdomen: "Soft, hypoactive bowel sounds",
        },
      },
      nursingNotes: [
        "Sodium Bicarbonate infusion titrated to maintain arterial pH 7.45-7.55. Continuous ECG monitoring shows dramatic QRS narrowing from 142ms to 92ms.",
        "Seizure activity completely absent. Blood pressure stable without vasopressors.",
      ],
      clinicalNotes: [
        "29-year-old female with severe TCA overdose. Alkalinization therapy with Sodium Bicarbonate successfully reversed cardiac fast sodium channel blockade.",
      ],
      followUp: {
        subjective: "Patient sedated on mechanical ventilator. Weaning planned.",
        objective: "QRS 92ms, pH 7.49, blood pressure 118/74. TCA cardiotoxicity resolved.",
        assessment: "Resolved TCA cardiotoxicity.",
        plan: "1. Wean Sodium Bicarb drip. 2. Trial extubation today. 3. Psychiatry consult mandatory post-extubation.",
      },
    },

    {
      mrn: "MRN-RECOVERED-115",
      nationalId: "NID-181920815",
      name: "Arthur Weasley",
      age: 61,
      gender: "Male",
      residence: "Suburban Heights, House 99",
      occupation: "Postal Inspector",
      maritalStatus: "MARRIED",
      handedness: "RIGHT",
      history: {
        diabetesDm: false,
        hypertensionHtn: true,
        pastSimilarConditions: "None",
        pastDiseases: ["HTN"],
        previousOperations: true,
        operationsDetails: "Appendectomy (1998)",
        hasAllergies: false,
        traveledAbroad: false,
        consanguinity: false,
        familySimilarConditions: "None",
        inheritedDiseases: [],
        freeText: "Admitted 6 days ago with severe pneumococcal bacteremic pneumonia.",
      },
      allergies: [],
      bedNumber: "MICU-08",
      admission: {
        doctorId: specialistUser.id,
        nurseId: nurseUser.id,
        transferReason: "Stepdown discharge preparation following recovery from Bacteremic Pneumonia & Septic Shock",
        placeOfTransfer: "ICU Admission 6 days ago",
        transferDoctorName: "Dr. Specialist",
        chiefComplaint: "Recovered from pneumonia, currently asymptomatic at rest",
        complaintAnalysis: "Admitted with septic shock and high oxygen requirement. Fully weaned off vasopressors and supplemental oxygen.",
        symptomsRelatedSystem: "Cough resolved, no fever, no dyspnea",
        symptomsOtherSystems: "Good appetite, ambulating with assistance",
        previousInvestigations: { initialWbc: "24.1", currentWbc: "6.8", initialLactate: "3.8", currentLactate: "0.9" },
        previousTreatments: "Completed 5 days IV Ceftriaxone. Weaned to room air.",
        provisionalDiagnosis: "Resolved Septic Shock / Resolved Pneumococcal Pneumonia / Ready for Ward Transfer",
        status: "ACTIVE",
        admittedAt: days(6),
      },
      diagnoses: [
        { conditionName: "Streptococcus Pneumoniae Bacteremia", status: "RESOLVED", doctorId: specialistUser.id },
        { conditionName: "Septic Shock", status: "RESOLVED", doctorId: specialistUser.id },
        { conditionName: "Community-Acquired Pneumonia", status: "RESOLVED", doctorId: residentUser.id },
      ],
      vitalsHistory: [
        { hoursAgo: 48, temp: 37.4, pulse: 82, sBp: 122, dBp: 74, rr: 18, spo2: 97 },
        { hoursAgo: 24, temp: 36.8, pulse: 76, sBp: 120, dBp: 72, rr: 16, spo2: 98 },
        { hoursAgo: 2, temp: 36.6, pulse: 72, sBp: 118, dBp: 70, rr: 15, spo2: 99 },
      ],
      medications: [
        { drugName: "Levofloxacin", dosage: "750mg PO", frequency: "Daily", doctorId: specialistUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Subcutaneous Heparin", dosage: "5000 units SC", frequency: "TID", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
        { drugName: "Lisinopril", dosage: "10mg PO", frequency: "Daily", doctorId: residentUser.id, adminStatus: "ADMINISTERED" },
      ],
      labs: [
        { testName: "WBC Count", resultValue: "6.8 x10^3/uL", abnormal: false, recordedAt: hours(6) },
        { testName: "C-Reactive Protein (CRP)", resultValue: "8 mg/L (Normal <10)", abnormal: false, recordedAt: hours(6) },
        { testName: "Serum Creatinine", resultValue: "0.9 mg/dL", abnormal: false, recordedAt: hours(6) },
      ],
      investigations: [
        { orderName: "Discharge Chest X-Ray", type: "Radiology", status: "Completed", orderedById: specialistUser.id, orderDate: hours(12) },
      ],
      clinicalExam: {
        generalExams: { GCS: 15, ambulating: true, oxygenRequirement: "None (Room Air)" },
        localExams: {
          chest: "Clear breath sounds throughout all lung fields, no rales or rhonchi",
          cvs: "Regular rate and rhythm, normal S1/S2",
        },
      },
      nursingNotes: [
        "Patient sitting in chair, ate 100% of breakfast. SpO2 99% on room air. Discharge transport requested.",
        "Transfer summary completed. Bed cleared for new ICU admission.",
      ],
      clinicalNotes: [
        "61-year-old male fully recovered from severe pneumococcal septic shock. Meets all discharge criteria for stepdown to general medical ward.",
      ],
      followUp: {
        subjective: "Patient expresses feeling great and eager to step down to general ward.",
        objective: "Afebrile for 72h, WBC 6.8, SpO2 99% RA. CXR shows significant clearing of pneumonia.",
        assessment: "Recovered ICU stay.",
        plan: "1. Transfer to General Medical Ward Bed 402. 2. Complete 2 more days oral Levofloxacin.",
      },
    },
  ];

  // Process all 15 patient profiles idempotently
  let createdCount = 0;
  for (const p of patientProfiles) {
    // 1. Upsert Patient
    const patient = await prisma.patient.upsert({
      where: { mrn: p.mrn },
      update: {
        name: p.name,
        nationalId: p.nationalId,
        age: p.age,
        gender: p.gender,
        residence: p.residence,
        occupation: p.occupation,
        maritalStatus: p.maritalStatus,
        handedness: p.handedness,
      },
      create: {
        mrn: p.mrn,
        nationalId: p.nationalId,
        name: p.name,
        age: p.age,
        gender: p.gender,
        residence: p.residence,
        occupation: p.occupation,
        maritalStatus: p.maritalStatus,
        handedness: p.handedness,
      },
    });

    // 2. Upsert Medical History
    await prisma.medicalHistory.upsert({
      where: { patientId: patient.id },
      update: { ...p.history },
      create: { patientId: patient.id, ...p.history },
    });

    // 3. Re-seed Allergies (clear old & create)
    await prisma.allergy.deleteMany({ where: { patientId: patient.id } });
    for (const alg of p.allergies) {
      await prisma.allergy.create({
        data: {
          patientId: patient.id,
          allergen: alg.allergen,
          severity: alg.severity,
        },
      });
    }

    // 4. Upsert Bed
    const bed = await prisma.bed.upsert({
      where: { bedNumber: p.bedNumber },
      update: { status: "OCCUPIED" },
      create: { bedNumber: p.bedNumber, status: "OCCUPIED" },
    });

    // 5. Ensure Admission
    let admission = await prisma.admission.findFirst({
      where: { patientId: patient.id, status: p.admission.status },
    });

    if (!admission) {
      admission = await prisma.admission.create({
        data: {
          patientId: patient.id,
          bedId: bed.id,
          doctorId: p.admission.doctorId,
          transferReason: p.admission.transferReason,
          placeOfTransfer: p.admission.placeOfTransfer,
          transferDoctorName: p.admission.transferDoctorName,
          chiefComplaint: p.admission.chiefComplaint,
          complaintAnalysis: p.admission.complaintAnalysis,
          symptomsRelatedSystem: p.admission.symptomsRelatedSystem,
          symptomsOtherSystems: p.admission.symptomsOtherSystems,
          previousInvestigations: p.admission.previousInvestigations,
          previousTreatments: p.admission.previousTreatments,
          provisionalDiagnosis: p.admission.provisionalDiagnosis,
          status: p.admission.status,
          admittedAt: p.admission.admittedAt,
        },
      });
    } else {
      admission = await prisma.admission.update({
        where: { id: admission.id },
        data: {
          bedId: bed.id,
          doctorId: p.admission.doctorId,
          transferReason: p.admission.transferReason,
          chiefComplaint: p.admission.chiefComplaint,
          provisionalDiagnosis: p.admission.provisionalDiagnosis,
        },
      });
    }

    // 6. Assign Nurse
    const existingNurse = await prisma.admissionNurse.findFirst({
      where: { admissionId: admission.id, nurseId: p.admission.nurseId },
    });
    if (!existingNurse) {
      await prisma.admissionNurse.create({
        data: {
          admissionId: admission.id,
          nurseId: p.admission.nurseId,
          assignedAt: p.admission.admittedAt,
        },
      });
    }

    // 7. Seed Diagnoses
    const existingDiagCount = await prisma.diagnosis.count({ where: { admissionId: admission.id } });
    if (existingDiagCount === 0) {
      for (const [diagIndex, diag] of p.diagnoses.entries()) {
        await prisma.diagnosis.create({
          data: {
            admissionId: admission.id,
            diagnosedById: diag.doctorId,
            originalDiagnosedById: diag.doctorId,
            conditionName: diag.conditionName,
            // Seed data predates the differential statuses; every entry was
            // written as a working diagnosis, so it seeds as CONFIRMED.
            status: diag.status === "ACTIVE" ? "CONFIRMED" : diag.status,
            // The first condition listed is the reason for admission.
            type: diagIndex === 0 ? "PRIMARY" : "SECONDARY",
            diagnosedAt: admission.admittedAt,
          },
        });
      }
    }

    // 8. Seed Vitals History
    const existingVitalsCount = await prisma.vitalSign.count({ where: { admissionId: admission.id } });
    if (existingVitalsCount === 0) {
      for (const v of p.vitalsHistory) {
        const recordedAt = new Date(now.getTime() - v.hoursAgo * 60 * 60 * 1000);
        await prisma.vitalSign.create({
          data: {
            admissionId: admission.id,
            recordedById: p.admission.nurseId,
            temperature: v.temp,
            pulse: v.pulse,
            systolicBp: v.sBp,
            diastolicBp: v.dBp,
            respiratoryRate: v.rr,
            spo2: v.spo2,
            recordedAt,
          },
        });
      }
    }

    // 9. Seed Medications & Administrations
    const existingMedsCount = await prisma.medication.count({ where: { admissionId: admission.id } });
    if (existingMedsCount === 0) {
      for (const med of p.medications) {
        // Seed data is written in ward shorthand ("BID", "PRN for ICP >20"),
        // so it goes through the same normaliser as the legacy-data migration.
        const { frequency, frequencyText } = normalizeFrequency(med.frequency);
        const createdMed = await prisma.medication.create({
          data: {
            admissionId: admission.id,
            prescribedById: med.doctorId,
            originalPrescriberId: med.doctorId,
            drugName: med.drugName,
            dosage: med.dosage,
            frequency,
            frequencyText,
            route: inferRoute(med.dosage),
            startDate: admission.admittedAt,
            isActive: true,
          },
        });

        // Seed administration
        await prisma.medicationAdministration.create({
          data: {
            medicationId: createdMed.id,
            administeredById: p.admission.nurseId,
            status: med.adminStatus || "ADMINISTERED",
            administeredDose: med.dosage,
            scheduledTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            administeredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            notes: "Administered per clinical protocol",
          },
        });
      }
    }

    // 10. Seed Lab Results
    const existingLabsCount = await prisma.labResult.count({ where: { admissionId: admission.id } });
    if (existingLabsCount === 0) {
      for (const lab of p.labs) {
        await prisma.labResult.create({
          data: {
            admissionId: admission.id,
            recordedById: residentUser.id,
            testName: lab.testName,
            resultValue: lab.resultValue,
            abnormal: lab.abnormal,
            recordedAt: lab.recordedAt,
          },
        });
      }
    }

    // 11. Seed Investigation Orders
    const existingOrdersCount = await prisma.investigationOrder.count({ where: { admissionId: admission.id } });
    if (existingOrdersCount === 0) {
      for (const inv of p.investigations) {
        await prisma.investigationOrder.create({
          data: {
            admissionId: admission.id,
            orderedById: inv.orderedById,
            orderName: inv.orderName,
            type: inv.type,
            status: inv.status,
            orderDate: inv.orderDate,
          },
        });
      }
    }

    // 12. Seed Clinical Examination
    const existingExamsCount = await prisma.clinicalExamination.count({ where: { admissionId: admission.id } });
    if (existingExamsCount === 0 && p.clinicalExam) {
      await prisma.clinicalExamination.create({
        data: {
          admissionId: admission.id,
          examinerId: p.admission.doctorId,
          generalExams: p.clinicalExam.generalExams,
          localExams: p.clinicalExam.localExams,
        },
      });
    }

    // 13. Seed Nursing Notes
    const existingNursingNotesCount = await prisma.nursingNote.count({ where: { admissionId: admission.id } });
    if (existingNursingNotesCount === 0 && p.nursingNotes) {
      for (const noteText of p.nursingNotes) {
        await prisma.nursingNote.create({
          data: {
            admissionId: admission.id,
            authorId: p.admission.nurseId,
            note: noteText,
          },
        });
      }
    }

    // 14. Seed Clinical Notes
    const existingClinicalNotesCount = await prisma.clinicalNote.count({ where: { admissionId: admission.id } });
    if (existingClinicalNotesCount === 0 && p.clinicalNotes) {
      for (const content of p.clinicalNotes) {
        await prisma.clinicalNote.create({
          data: {
            admissionId: admission.id,
            authorId: p.admission.doctorId,
            content,
          },
        });
      }
    }

    // 15. Seed SOAP FollowUp Progress Notes
    const existingFollowUpCount = await prisma.followUp.count({ where: { admissionId: admission.id } });
    if (existingFollowUpCount === 0 && p.followUp) {
      await prisma.followUp.create({
        data: {
          admissionId: admission.id,
          authorId: p.admission.doctorId,
          subjective: p.followUp.subjective,
          objective: p.followUp.objective,
          assessment: p.followUp.assessment,
          plan: p.followUp.plan,
          recordedAt: hours(4),
        },
      });
    }

    createdCount++;
    console.log(`[✓] Seeded ICU Patient Profile #${createdCount}: ${p.name} (${p.mrn}) on Bed ${p.bedNumber}`);
  }

  console.log(`Successfully seeded ${createdCount} detailed ICU patient profiles with full clinical records.`);
}

module.exports = { seedICUPatients };
