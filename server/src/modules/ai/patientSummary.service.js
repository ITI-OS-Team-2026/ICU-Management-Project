const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { callBedrock } = require("../../utils/bedrockClient");
const { auditedTransaction } = require("../../middlewares/auditLog");
const logger = require("../../utils/logger");

// ─── System Prompt ───────────────────────────────────────────────────────────
// Maintained as a constant for easy iteration. Never exposed via API responses.

const ICU_SUMMARY_SYSTEM_PROMPT = `You are a Senior ICU Intensivist Physician documenting an expert clinical handoff summary for an intensive care patient during multidisciplinary ICU rounds.

Your output must reflect the problem-oriented clinical reasoning process of an attending intensivist — NOT a passive aggregation of database records.

## CLINICAL REASONING & PROBLEM-ORIENTED HANDOFF DIRECTIVES

1. **Problem-Oriented Clinical Thinking & Prioritization**:
   - Organize your clinical impression around active, prioritized clinical problems (e.g., High Priority: Acute STEMI, Hemodynamic Compromise; Medium Priority: Early Renal Dysfunction; Low Priority: Chronic GERD).
   - For each major clinical problem, mentally link: (a) supporting evidence, (b) active targeted therapy, and (c) key monitoring priorities.
   - High-acuity life-threats must receive prominent synthesis in the Executive Summary and Clinical Assessment; background chronic conditions should be kept concise in Medical History.

2. **Strict Evidence-Based Linking**:
   - Every interpretation must be directly traceable to the provided data payload.
   - Always connect clinical impressions directly to concrete observations.
     * BAD: "The patient is unstable."
     * GOOD: "The available findings suggest ongoing hemodynamic compromise based on persistent hypotension (BP 88/52 mmHg) and tachycardia (Pulse 118 bpm)."

3. **Infectious Assessment Rules (Fever ≠ Proven Infection)**:
   - Do NOT infer active infection or sepsis solely because hyperthermia/fever exists without documented microbiology or antibiotic therapy.
   - If fever is present without confirmed infection data, write conservatively:
     "Fever is documented; however, no confirmed infectious source, microbiology results, or antimicrobial therapy is available in the current record."

4. **Confidence-Aware Reasoning**:
   - High Confidence: Documented primary diagnoses (e.g., "Documented ST-Elevation Myocardial Infarction").
   - Moderate Confidence: Synthesized clinical observations (e.g., "Findings suggest ongoing hemodynamic compromise based on hypotension and tachycardia").
   - Cautionary / Low Confidence: Isolated lab derangements (e.g., "Mild serum creatinine elevation (1.4 mg/dL) may indicate early renal dysfunction; clinical significance should be interpreted in the context of baseline renal function").

5. **Be Conservative — Never Overstate Certainty**:
   - Use cautious, professional medical hedging: "suggests...", "may indicate...", "consistent with...", "concerning for...", "based on the available data...", "should be interpreted in the clinical context...".
   - STRICTLY AVOID over-assertive or definitive claims: DO NOT use "confirms...", "definitely...", "clearly has...", "requires...", "severe...", "unstable...", "must...".

6. **Strict Trend Analysis Rules**:
   - Do NOT infer trends from one or very few observations.
   - If historical data is insufficient to establish a true trajectory, write EXACTLY:
     "Insufficient historical data is available to determine a trend."
   - Do NOT add speculative phrases like "the readings remained consistent" unless multiple distinct timestamps actually exist in the provided data.

7. **Medication Safety & Conflict Detection**:
   - Treat medication safety as a high-priority clinical task. Actively analyze pre-detected medication conflicts and documented allergies. Highlight any allergen-drug conflicts clearly in Clinical Alerts without prescribing treatment.

8. **Conservative Recommendations Language**:
   - Recommendations must NEVER prescribe new unverified treatments or direct therapy.
   - Use ONLY supportive suggestions: "Continue close monitoring...", "Reassess...", "Consider reviewing...", "Monitor serial laboratory values as clinically indicated...", "Verify medication safety...", "Continue management according to the treating team's clinical judgment."
   - STRICTLY AVOID directive verbs: DO NOT use "Start...", "Stop...", "Escalate...", "Immediately...", "Must...", "Continue aggressive management...".

9. **30-Second Physician Handoff Readability**:
   - Ensure the Executive Summary allows an incoming attending physician to understand within 30 seconds:
     (1) Why the patient is in the ICU, (2) Current overall clinical condition, (3) Highest-priority active problems, and (4) High-priority safety warnings or monitoring needs.

10. **Mandatory Closing Statement**:
    - Every generated summary MUST conclude with this exact quote block on its own line at the very end:
      > This summary is automatically generated from the available electronic health record data and should be interpreted alongside the treating clinician's assessment.

## MANDATORY OUTPUT STRUCTURE

Structure your response using EXACTLY these section headers in this order (use Markdown ## section headers):

## Executive Summary
(30-second physician handoff paragraph answering: Why in ICU? Current overall condition? Top prioritized problems? Immediate clinical/safety concerns?)

## Clinical Alerts
(High-priority medication safety alerts, pre-detected allergy conflicts, duplicate therapies, or critical warnings. Format safety alerts starting with "⚠ [Alert description]. Recommend verifying that the current therapy is intentional." If no alerts exist, write: "No critical medication safety alerts identified from the available data.")

## ICU Admission
(Contextual synthesis of chief complaint, admission diagnosis, referring/attending physicians, and presentation context. Avoid copying database fields verbatim.)

## Current Clinical Assessment
(Problem-oriented synthesis by organ system: Hemodynamic Status, Respiratory Status, Neurological Status, Renal/Metabolic Status, Infectious Concerns, and Overall Stability. Explicitly link every interpretation to concrete evidence and state data limitations where information is unrecorded.)

## Active Diagnoses
(Bullet list of active, clinically relevant diagnoses ordered by priority and acuity. Deduplicate conditions listed elsewhere.)

## Significant Laboratory Findings
(Conservative interpretation of abnormal lab results flagged with "⚠ ABNORMAL". Explain clinical context using evidence-linked phrasing like "consistent with" or "should be interpreted in baseline context".)

## Vital Signs
(Summary of latest vital parameters. Analyze trends ONLY if multiple historical measurements exist; otherwise write: "Insufficient historical data is available to determine a trend.")

## Active Treatments
(Categorized bullet list of active therapies grouped logically by therapeutic class. Avoid unorganized medication lists.)

## Medical History
(Concise summary of relevant past medical history and chronic conditions. Omit duplicates of current active diagnoses.)

## Clinical Concerns
(Prioritized list of top current risks and clinical threats, ranked by acuity using conservative terminology such as "concerning for", "suggests ongoing".)

## Recommendations
(Conservative, data-backed clinical next steps using "Consider reviewing", "Reassess", "Monitor serial", "Continue management according to treating team's clinical judgment". Never prescribe or direct therapy.)

> This summary is automatically generated from the available electronic health record data and should be interpreted alongside the treating clinician's assessment.`;

// ─── Patient Data Aggregation ────────────────────────────────────────────────

/**
 * Collect all clinically relevant data for a patient's admission in a single
 * parallel query batch. Reuses the admission-scoped pattern from ai.service.js
 * but extends it with patient-level demographics, medical history, and allergies.
 */
const aggregatePatientData = async (admissionId) => {
  // First, fetch the admission with patient demographics in one query
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
    include: {
      patient: {
        include: {
          medicalHistory: true,
          allergies: {
            where: { isArchived: false },
          },
        },
      },
      bed: true,
      doctor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      nurses: {
        where: { isArchived: false, unassignedAt: null },
        include: {
          nurse: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      },
    },
  });

  if (!admission || admission.isArchived) {
    throw new APIError("Admission not found", 404);
  }

  if (admission.patient.isArchived) {
    throw new APIError("Patient record not found", 404);
  }

  // Fetch all admission-scoped clinical data in parallel
  const [
    diagnoses,
    vitalSigns,
    labResults,
    medications,
    investigationOrders,
    clinicalNotes,
    nursingNotes,
    clinicalExaminations,
    followUps,
  ] = await Promise.all([
    prisma.diagnosis.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { diagnosedAt: "desc" },
      include: {
        diagnosedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    }),
    prisma.vitalSign.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { recordedAt: "desc" },
      take: 20,
    }),
    prisma.labResult.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { recordedAt: "desc" },
      take: 30,
    }),
    prisma.medication.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { prescribedAt: "desc" },
    }),
    prisma.investigationOrder.findMany({
      where: { admissionId },
      orderBy: { orderDate: "desc" },
      take: 20,
    }),
    prisma.clinicalNote.findMany({
      where: { admissionId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        author: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
    }),
    prisma.nursingNote.findMany({
      where: { admissionId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        author: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
    }),
    prisma.clinicalExamination.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.followUp.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { recordedAt: "desc" },
      take: 10,
      include: {
        author: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
    }),
  ]);

  return {
    admission,
    patient: admission.patient,
    bed: admission.bed,
    doctor: admission.doctor,
    nurses: admission.nurses,
    diagnoses,
    vitalSigns,
    labResults,
    medications,
    investigationOrders,
    clinicalNotes,
    nursingNotes,
    clinicalExaminations,
    followUps,
  };
};

// ─── Data Formatting Helpers ──────────────────────────────────────────────────

/**
 * Format date into clean human-readable clinical string: e.g. "25 Jul 2026 • 3:34 PM"
 */
const formatDateTime = (dateStrOrObj) => {
  if (!dateStrOrObj) return "";
  const d = new Date(dateStrOrObj);
  if (isNaN(d.getTime())) return String(dateStrOrObj);

  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${day} ${month} ${year} • ${hours}:${minutes} ${ampm}`;
};

/**
 * Therapeutic categorization for active medications into standard ICU functional classes
 */
const categorizeMedication = (drugName = "") => {
  const lower = drugName.toLowerCase();

  if (lower.includes("aspirin") || lower.includes("clopidogrel") || lower.includes("ticagrelor")) {
    return "Antiplatelet Therapy";
  }
  if (lower.includes("heparin") || lower.includes("enoxaparin") || lower.includes("warfarin") || lower.includes("apixaban")) {
    return "Anticoagulation Therapy";
  }
  if (lower.includes("nitroglycerin") || lower.includes("nitroprusside") || lower.includes("hydralazine")) {
    return "Vasodilator Therapy";
  }
  if (lower.includes("noradrenaline") || lower.includes("norepinephrine") || lower.includes("dobutamine") || lower.includes("dopamine") || lower.includes("adrenaline")) {
    return "Inotropes & Vasopressors";
  }
  if (lower.includes("lisinopril") || lower.includes("metoprolol") || lower.includes("amlodipine") || lower.includes("losartan") || lower.includes("atenolol")) {
    return "Cardiovascular & Antihypertensive";
  }
  if (lower.includes("statin") || lower.includes("atorvastatin") || lower.includes("rosuvastatin")) {
    return "Lipid-Lowering Therapy";
  }
  if (lower.includes("insulin") || lower.includes("metformin") || lower.includes("glipizide")) {
    return "Endocrine & Glycemic Control";
  }
  if (lower.includes("saline") || lower.includes("ringer") || lower.includes("kcl") || lower.includes("potassium") || lower.includes("bicarbonate")) {
    return "Fluids & Resuscitation";
  }
  if (lower.includes("morphine") || lower.includes("fentanyl") || lower.includes("propofol") || lower.includes("midazolam") || lower.includes("paracetamol")) {
    return "Sedation & Analgesia";
  }
  if (lower.includes("cillin") || lower.includes("cef") || lower.includes("vancomycin") || lower.includes("meropenem") || lower.includes("azithromycin")) {
    return "Antimicrobial & Antibiotic Therapy";
  }

  return "Other Active Therapies";
};

// ─── Data Formatting for LLM Prompt ─────────────────────────────────────────

/**
 * Format the aggregated patient data into a clean, structured clinical snapshot.
 * Highly token-optimized, deduplicated, and organized for ICU intensivist LLM reasoning.
 */
const formatPatientDataForPrompt = (data) => {
  const sections = [];
  const { patient, admission, bed, doctor, nurses } = data;

  // 1. PATIENT DEMOGRAPHICS
  const demoLines = [
    `Name: ${patient.name}`,
    `MRN: ${patient.mrn}`,
    `Age: ${patient.age}`,
  ];
  if (patient.gender) demoLines.push(`Gender: ${patient.gender}`);
  if (patient.residence) demoLines.push(`Residence: ${patient.residence}`);
  if (patient.occupation) demoLines.push(`Occupation: ${patient.occupation}`);
  if (patient.maritalStatus) demoLines.push(`Marital Status: ${patient.maritalStatus}`);
  sections.push(`## PATIENT INFORMATION\n${demoLines.join("\n")}`);

  // 2. ICU ADMISSION DETAILS
  const admLines = [
    `Admission Status: ${admission.status}`,
    `Admitted At: ${formatDateTime(admission.admittedAt)}`,
    `Bed Location: ${bed?.bedNumber ?? "Unassigned"}`,
    `Attending Doctor: Dr. ${doctor?.firstName ?? ""} ${doctor?.lastName ?? ""}`,
  ];
  if (admission.chiefComplaint) admLines.push(`Chief Complaint: ${admission.chiefComplaint}`);
  if (admission.transferReason) admLines.push(`Admission/Transfer Reason: ${admission.transferReason}`);
  if (admission.placeOfTransfer) admLines.push(`Transfer Origin: ${admission.placeOfTransfer}`);
  if (admission.transferDoctorName) admLines.push(`Referring Doctor: ${admission.transferDoctorName}`);
  if (admission.provisionalDiagnosis) admLines.push(`Provisional Diagnosis: ${admission.provisionalDiagnosis}`);
  if (admission.dischargedAt) admLines.push(`Discharged At: ${formatDateTime(admission.dischargedAt)}`);
  if (nurses && nurses.length > 0) {
    const nurseNames = nurses.map((n) => `${n.nurse.firstName} ${n.nurse.lastName}`).join(", ");
    admLines.push(`Assigned Nurses: ${nurseNames}`);
  }
  sections.push(`## ICU ADMISSION DETAILS\n${admLines.join("\n")}`);

  // 3. DIAGNOSES (Deduplicated & Categorized)
  const activeDiagnoses = [];
  const resolvedDiagnoses = [];
  const seenDiagnosisNames = new Set();

  if (data.diagnoses && data.diagnoses.length > 0) {
    data.diagnoses.forEach((d) => {
      const nameNorm = d.conditionName.trim().toLowerCase();
      if (seenDiagnosisNames.has(nameNorm)) return;
      seenDiagnosisNames.add(nameNorm);

      const doctorName = d.diagnosedBy ? ` (by Dr. ${d.diagnosedBy.firstName} ${d.diagnosedBy.lastName})` : "";
      const line = `- ${d.conditionName} [Status: ${d.status || "CONFIRMED"}]${doctorName}`;

      // Suspected conditions are still being worked up, so they belong on the
      // active problem list rather than in the closed record.
      if (d.status === "CONFIRMED" || d.status === "SUSPECTED" || !d.status) {
        activeDiagnoses.push(line);
      } else {
        resolvedDiagnoses.push(line);
      }
    });
  }

  const diagSectionLines = [];
  if (activeDiagnoses.length > 0) {
    diagSectionLines.push("### Active Diagnoses\n" + activeDiagnoses.join("\n"));
  }
  if (resolvedDiagnoses.length > 0) {
    diagSectionLines.push("### Resolved Diagnoses\n" + resolvedDiagnoses.join("\n"));
  }
  if (diagSectionLines.length > 0) {
    sections.push(`## ACTIVE & HISTORICAL DIAGNOSES\n${diagSectionLines.join("\n\n")}`);
  }

  // 4. MEDICAL HISTORY (Merged & Deduplicated against Diagnoses)
  const mh = patient.medicalHistory;
  const mhLines = [];
  if (mh) {
    if (mh.diabetesDm && !seenDiagnosisNames.has("diabetes") && !seenDiagnosisNames.has("type 1 diabetes mellitus") && !seenDiagnosisNames.has("type 2 diabetes mellitus")) {
      mhLines.push("- History of Diabetes Mellitus");
    }
    if (mh.hypertensionHtn && !seenDiagnosisNames.has("hypertension")) {
      mhLines.push("- History of Hypertension");
    }
    if (mh.previousOperations && mh.operationsDetails) {
      mhLines.push(`- Past Surgery: ${mh.operationsDetails}`);
    }
    if (mh.pastDiseases) {
      try {
        const parsed = typeof mh.pastDiseases === "string" ? JSON.parse(mh.pastDiseases) : mh.pastDiseases;
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (item && !seenDiagnosisNames.has(String(item).trim().toLowerCase())) {
              mhLines.push(`- Past Medical Condition: ${item}`);
            }
          });
        } else if (typeof parsed === "object") {
          Object.entries(parsed).forEach(([k, v]) => mhLines.push(`- ${k}: ${v}`));
        } else {
          mhLines.push(`- ${parsed}`);
        }
      } catch {
        mhLines.push(`- ${mh.pastDiseases}`);
      }
    }
    if (mh.freeText) mhLines.push(`- Additional Medical History: ${mh.freeText}`);
  }
  if (mhLines.length > 0) {
    sections.push(`## RELEVANT MEDICAL HISTORY\n${mhLines.join("\n")}`);
  }

  // 5. ALLERGIES & MEDICATION SAFETY CONFLICTS PRE-DETECTION
  const allergies = patient.allergies || [];
  const activeMeds = data.medications ? data.medications.filter((m) => m.isActive) : [];
  const inactiveMeds = data.medications ? data.medications.filter((m) => !m.isActive) : [];

  const allergyLines = allergies.map(
    (a) => `- ${a.allergen}${a.severity ? ` (Severity: ${a.severity})` : ""}`
  );

  const conflicts = [];
  for (const allergy of allergies) {
    const allergenLower = (allergy.allergen || "").toLowerCase();
    for (const med of activeMeds) {
      const drugLower = (med.drugName || "").toLowerCase();
      if (drugLower.includes(allergenLower) || allergenLower.includes(drugLower)) {
        conflicts.push(`- ⚠ Potential Medication Conflict: ${med.drugName} prescribed despite documented ${allergy.allergen} allergy (${allergy.severity || "Unspecified severity"})`);
      }
    }
  }

  const safetyLines = [];
  if (allergyLines.length > 0) {
    safetyLines.push("### Documented Allergies\n" + allergyLines.join("\n"));
  } else {
    safetyLines.push("Documented Allergies: No known allergies recorded");
  }

  if (conflicts.length > 0) {
    safetyLines.push("### Pre-Detected Medication Conflicts\n" + conflicts.join("\n"));
  } else {
    safetyLines.push("Medication Conflicts: NONE DETECTED");
  }
  sections.push(`## ALLERGIES & MEDICATION SAFETY PRE-DETECTION\n${safetyLines.join("\n\n")}`);

  // 6. MEDICATIONS (Categorized Therapies)
  const medCategoryMap = {};
  activeMeds.forEach((m) => {
    const category = categorizeMedication(m.drugName);
    if (!medCategoryMap[category]) medCategoryMap[category] = [];
    const dateStr = m.startDate ? ` (started ${formatDateTime(m.startDate)})` : "";
    medCategoryMap[category].push(`  * ${m.drugName} — ${m.dosage}, ${m.frequency}${dateStr}`);
  });

  const activeMedLines = [];
  Object.keys(medCategoryMap).forEach((cat) => {
    activeMedLines.push(`- ${cat}:\n${medCategoryMap[cat].join("\n")}`);
  });

  const medSectionLines = [];
  if (activeMedLines.length > 0) {
    medSectionLines.push("### Active Categorized Therapies\n" + activeMedLines.join("\n"));
  } else {
    medSectionLines.push("Active Medications: None recorded");
  }

  if (inactiveMeds.length > 0) {
    const discontinuedLines = inactiveMeds.map(
      (m) => `- ${m.drugName} — ${m.dosage}, ${m.frequency} [DISCONTINUED${m.endDate ? ` on ${formatDateTime(m.endDate)}` : ""}]`
    );
    medSectionLines.push("### Discontinued Medications\n" + discontinuedLines.join("\n"));
  }
  sections.push(`## MEDICATIONS & THERAPEUTIC GROUPS\n${medSectionLines.join("\n\n")}`);

  // 7. VITAL SIGNS & METADATA
  const totalVitalsCount = data.vitalSigns ? data.vitalSigns.length : 0;
  const vitalHeader = [
    `Total Historical Vital Measurements Recorded: ${totalVitalsCount}`,
    `Trend Analysis Eligibility: ${totalVitalsCount > 1 ? "ELIGIBLE FOR TREND ANALYSIS" : "INSUFFICIENT HISTORICAL DATA (Only 1 reading available — DO NOT infer trends)"}`,
  ];

  if (totalVitalsCount > 0) {
    const vitalLines = data.vitalSigns.map((v) => {
      const parts = [`Time: ${formatDateTime(v.recordedAt)}`];
      if (v.temperature !== null && v.temperature !== undefined) parts.push(`Temp: ${v.temperature}°C`);
      if (v.pulse !== null) parts.push(`Pulse: ${v.pulse} bpm`);
      if (v.systolicBp !== null || v.diastolicBp !== null) parts.push(`BP: ${v.systolicBp ?? "—"}/${v.diastolicBp ?? "—"} mmHg`);
      if (v.respiratoryRate !== null) parts.push(`RR: ${v.respiratoryRate}/min`);
      if (v.spo2 !== null) parts.push(`SpO2: ${v.spo2}%`);
      return `- ${parts.join(" | ")}`;
    });
    vitalHeader.push("### Readings (Chronological Most Recent First):\n" + vitalLines.join("\n"));
  } else {
    vitalHeader.push("Vital Signs: No measurements recorded");
  }
  sections.push(`## VITAL SIGNS & TREND METADATA\n${vitalHeader.join("\n\n")}`);

  // 8. LABORATORY RESULTS (Prioritized Abnormal Values)
  if (data.labResults && data.labResults.length > 0) {
    const abnormalLabs = [];
    const normalLabs = [];

    data.labResults.forEach((l) => {
      const timeStr = formatDateTime(l.recordedAt);
      const line = `- ${l.testName}: ${l.resultValue}${l.abnormal ? " ⚠ ABNORMAL" : ""} (${timeStr})`;
      if (l.abnormal) {
        abnormalLabs.push(line);
      } else {
        normalLabs.push(line);
      }
    });

    const labLines = [];
    if (abnormalLabs.length > 0) {
      labLines.push("### ABNORMAL LABORATORY FINDINGS (PRIORITY)\n" + abnormalLabs.join("\n"));
    }
    if (normalLabs.length > 0) {
      labLines.push("### Routine Normal Laboratory Results\n" + normalLabs.join("\n"));
    }
    sections.push(`## LABORATORY FINDINGS\n${labLines.join("\n\n")}`);
  }

  // 9. CLINICAL NOTES & DOCUMENTATION
  const docLines = [];
  if (data.clinicalNotes && data.clinicalNotes.length > 0) {
    const noteLines = data.clinicalNotes.map(
      (n) => `- [${formatDateTime(n.createdAt)}] Dr. ${n.author?.firstName ?? ""} ${n.author?.lastName ?? ""}: ${n.content.trim()}`
    );
    docLines.push("### Clinical Notes\n" + noteLines.join("\n"));
  }
  if (data.nursingNotes && data.nursingNotes.length > 0) {
    const noteLines = data.nursingNotes.map(
      (n) => `- [${formatDateTime(n.createdAt)}] ${n.author?.firstName ?? ""} ${n.author?.lastName ?? ""}: ${n.note.trim()}`
    );
    docLines.push("### Nursing Notes\n" + noteLines.join("\n"));
  }
  if (data.followUps && data.followUps.length > 0) {
    const fuLines = data.followUps.map((f) => {
      const parts = [`[${formatDateTime(f.recordedAt)}] Dr. ${f.author?.firstName ?? ""} ${f.author?.lastName ?? ""}`];
      if (f.subjective) parts.push(`S: ${f.subjective.trim()}`);
      if (f.objective) parts.push(`O: ${f.objective.trim()}`);
      if (f.assessment) parts.push(`A: ${f.assessment.trim()}`);
      if (f.plan) parts.push(`P: ${f.plan.trim()}`);
      return `- ${parts.join(" | ")}`;
    });
    docLines.push("### Follow-Up (SOAP) Notes\n" + fuLines.join("\n"));
  }
  if (docLines.length > 0) {
    sections.push(`## CLINICAL DOCUMENTATION & NOTES\n${docLines.join("\n\n")}`);
  }

  // 10. INVESTIGATION ORDERS
  if (data.investigationOrders && data.investigationOrders.length > 0) {
    const invLines = data.investigationOrders.map(
      (io) => `- ${io.orderName} (${io.type}) [Status: ${io.status}] — ordered ${formatDateTime(io.orderDate)}`
    );
    sections.push(`## INVESTIGATION ORDERS\n${invLines.join("\n")}`);
  }

  // 11. EXPLICIT MISSING DATA INDICATORS
  const missingCategories = [];
  if (!data.clinicalExaminations || data.clinicalExaminations.length === 0) {
    missingCategories.push("- Physical Examination Documentation: Not Available");
  }
  if (!data.nursingNotes || data.nursingNotes.length === 0) {
    missingCategories.push("- Nursing Documentation: Not Available");
  }
  missingCategories.push("- Microbiology & Culture Results: No Data Recorded");
  missingCategories.push("- Mechanical Ventilation & Airway Parameters: Not Available / Non-Ventilated");

  if (missingCategories.length > 0) {
    sections.push(`## MISSING OR UNRECORDED CLINICAL INFORMATION\n${missingCategories.join("\n")}`);
  }

  return sections.join("\n\n");
};

// ─── Summary Generation ─────────────────────────────────────────────────────

/**
 * Generate an AI-powered patient summary for the given admission.
 *
 * @param {string} requestedById — ID of the user requesting the summary
 * @param {string} admissionId   — admission UUID
 * @param {object} req           — Express request (for audit logging)
 * @returns {Promise<object>}    — the saved AiSummary record (formatted)
 */
const generatePatientSummary = async (requestedById, admissionId, req) => {
  // 1. Aggregate all patient data
  const patientData = await aggregatePatientData(admissionId);

  // 2. Build the prompt
  const userMessage = [
    "Please generate a comprehensive ICU clinical summary for the following patient based on the data below.",
    "Include only information that is explicitly provided. Do not fabricate any details.",
    "",
    "--- BEGIN PATIENT DATA ---",
    "",
    formatPatientDataForPrompt(patientData),
    "",
    "--- END PATIENT DATA ---",
  ].join("\n");

  // 3. Call the LLM
  const summaryText = await callBedrock({
    systemPrompt: ICU_SUMMARY_SYSTEM_PROMPT,
    userMessage,
    maxTokens: 3072,
  });

  // 4. Resolve valid user ID (prevents foreign key errors from stale session JWTs)
  let validRequestedById = requestedById;
  if (requestedById) {
    const existingUser = await prisma.user.findUnique({ where: { id: requestedById } });
    if (!existingUser) {
      const fallbackUser = await prisma.user.findFirst({
        where: { status: "ACTIVE" },
      });
      if (fallbackUser) {
        validRequestedById = fallbackUser.id;
      }
    }
  }

  // 5. Persist the summary via audited transaction
  return await auditedTransaction(
    req,
    { action: "GENERATE_SUMMARY", targetTable: "AiSummary" },
    async (tx) => {
      const summary = await tx.aiSummary.create({
        data: {
          admissionId,
          requestedById: validRequestedById,
          summaryType: "ON_DEMAND",
          overallSummary: summaryText,
        },
      });

      return {
        targetId: summary.id,
        newValues: summary,
        result: {
          id: summary.id,
          admission_id: summary.admissionId,
          requested_by: summary.requestedById,
          summary_type: "ON_DEMAND",
          overall_summary: summary.overallSummary,
          generated_at: summary.generatedAt,
        },
      };
    }
  );
};

/**
 * Get the patient context data (without calling the LLM) — useful for
 * debugging or previewing what data will be sent to the AI.
 */
const getPatientContext = async (admissionId) => {
  const patientData = await aggregatePatientData(admissionId);

  const { patient, admission, bed, doctor } = patientData;

  return {
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
    },
    admission: {
      id: admission.id,
      status: admission.status,
      chief_complaint: admission.chiefComplaint,
      provisional_diagnosis: admission.provisionalDiagnosis,
      admitted_at: admission.admittedAt,
    },
    bed: { bed_number: bed.bedNumber },
    doctor: { name: `${doctor.firstName} ${doctor.lastName}` },
    data_counts: {
      diagnoses: patientData.diagnoses.length,
      vital_signs: patientData.vitalSigns.length,
      lab_results: patientData.labResults.length,
      active_medications: patientData.medications.filter((m) => m.isActive).length,
      investigation_orders: patientData.investigationOrders.length,
      clinical_notes: patientData.clinicalNotes.length,
      nursing_notes: patientData.nursingNotes.length,
      clinical_examinations: patientData.clinicalExaminations.length,
      follow_ups: patientData.followUps.length,
      allergies: patient.allergies.length,
      has_medical_history: !!patient.medicalHistory,
    },
  };
};

module.exports = {
  generatePatientSummary,
  getPatientContext,
};
