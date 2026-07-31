const prisma = require("../../utils/prismaClient");
const config = require("../../config/env");
const { toVectorLiteral, tokenize } = require("../../utils/embeddingClient");

/**
 * Retrieval half of the RAG pipeline (FR-3.1).
 *
 * Everything here is hard-scoped to a single admission id. There is deliberately
 * no code path that widens the scope to a patient or to other admissions — a
 * question about another patient must come back empty, not cross-referenced.
 */

// ─── Vector search over indexed document chunks ──────────────────────────────

/**
 * pgvector similarity search across the admission's indexed document chunks.
 * `<=>` is cosine distance, so similarity = 1 - distance.
 *
 * @param {string} admissionId
 * @param {number[]} queryVector
 * @param {Object} [options]
 * @param {number} [options.topK]
 * @param {number} [options.minScore]
 * @returns {Promise<Array>} scored chunks, best first
 */
const searchDocumentChunks = async (admissionId, queryVector, options = {}) => {
  if (!Array.isArray(queryVector) || queryVector.length === 0) return [];

  const topK = Math.max(1, Math.min(options.topK || config.ragTopK, 25));
  const minScore = options.minScore ?? config.ragMinScore;
  const relevanceRatio = options.relevanceRatio ?? config.ragRelevanceRatio;

  const rows = await prisma.$queryRawUnsafe(
    `SELECT de.id,
            de.document_id,
            de.chunk_index,
            de.chunk_text,
            md.original_filename,
            md.document_type,
            md.uploaded_at,
            1 - (de.embedding <=> $1::vector) AS score
       FROM document_embeddings de
       JOIN medical_documents md ON md.id = de.document_id
      WHERE de.admission_id = $2
        AND md.is_archived = false
      ORDER BY de.embedding <=> $1::vector
      LIMIT $3`,
    toVectorLiteral(queryVector),
    admissionId,
    topK
  );

  const scored = rows
    .map((row) => ({
      id: row.id,
      document_id: row.document_id,
      chunk_index: row.chunk_index,
      chunk_text: row.chunk_text,
      original_filename: row.original_filename,
      document_type: row.document_type,
      uploaded_at: row.uploaded_at,
      score: Number(row.score),
    }))
    .filter((row) => Number.isFinite(row.score) && row.score > minScore);

  if (scored.length === 0) return [];

  // Absolute similarity values differ wildly between embedding providers, so the
  // real cut-off is relative to the best match for this question.
  const topScore = scored[0].score;
  return scored.filter((row) => row.score >= topScore * relevanceRatio);
};

// ─── Structured clinical record retrieval ────────────────────────────────────

const RECORD_LIMITS = {
  vitals: 12,
  labs: 20,
  diagnoses: 15,
  medications: 20,
  clinicalNotes: 10,
  nursingNotes: 10,
  examinations: 5,
  followUps: 8,
};

/**
 * Fetch the admission's structured clinical records. These always accompany the
 * document chunks: most ICU questions ("what was the last SpO2?") are answered
 * from tabular data, not from uploaded files.
 */
const fetchClinicalRecords = async (admissionId) => {
  const [
    admission,
    vitals,
    labs,
    diagnoses,
    medications,
    clinicalNotes,
    nursingNotes,
    examinations,
    followUps,
  ] = await Promise.all([
    prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        patient: {
          include: {
            allergies: { where: { isArchived: false } },
            medicalHistory: true,
          },
        },
        bed: true,
        doctor: { select: { firstName: true, lastName: true, role: true } },
      },
    }),
    prisma.vitalSign.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { recordedAt: "desc" },
      take: RECORD_LIMITS.vitals,
    }),
    prisma.labResult.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { recordedAt: "desc" },
      take: RECORD_LIMITS.labs,
    }),
    prisma.diagnosis.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { diagnosedAt: "desc" },
      take: RECORD_LIMITS.diagnoses,
    }),
    prisma.medication.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { prescribedAt: "desc" },
      take: RECORD_LIMITS.medications,
    }),
    prisma.clinicalNote.findMany({
      where: { admissionId },
      orderBy: { createdAt: "desc" },
      take: RECORD_LIMITS.clinicalNotes,
      include: { author: { select: { firstName: true, lastName: true, role: true } } },
    }),
    prisma.nursingNote.findMany({
      where: { admissionId },
      orderBy: { createdAt: "desc" },
      take: RECORD_LIMITS.nursingNotes,
      include: { author: { select: { firstName: true, lastName: true, role: true } } },
    }),
    prisma.clinicalExamination.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { createdAt: "desc" },
      take: RECORD_LIMITS.examinations,
    }),
    prisma.followUp.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { recordedAt: "desc" },
      take: RECORD_LIMITS.followUps,
      include: { author: { select: { firstName: true, lastName: true, role: true } } },
    }),
  ]);

  return {
    admission,
    vitals,
    labs,
    diagnoses,
    medications,
    clinicalNotes,
    nursingNotes,
    examinations,
    followUps,
  };
};

// ─── Turning records into citable context lines ──────────────────────────────

const formatClockTime = (date) => {
  if (!date) return "unknown time";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "unknown time";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const truncate = (value, max = 400) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const describeExamination = (exam) => {
  const parts = [];
  for (const field of ["generalExams", "localExams"]) {
    const value = exam[field];
    if (!value) continue;
    parts.push(typeof value === "string" ? value : JSON.stringify(value));
  }
  return parts.length ? truncate(parts.join(" | ")) : "Examination recorded (no structured findings).";
};

/**
 * Flatten the structured records into uniform, individually citable entries.
 * Each entry carries the label the LLM is told to cite verbatim.
 */
const buildRecordEntries = (records) => {
  const entries = [];

  const push = (type, id, timestamp, label, text) => {
    if (!text) return;
    entries.push({ type, id, timestamp: timestamp || null, label, text });
  };

  for (const v of records.vitals) {
    const measurements = [
      v.temperature != null ? `temp ${v.temperature}°C` : null,
      v.pulse != null ? `pulse ${v.pulse} bpm` : null,
      v.systolicBp != null || v.diastolicBp != null
        ? `BP ${v.systolicBp ?? "—"}/${v.diastolicBp ?? "—"} mmHg`
        : null,
      v.respiratoryRate != null ? `RR ${v.respiratoryRate}/min` : null,
      v.spo2 != null ? `SpO2 ${v.spo2}%` : null,
    ].filter(Boolean);

    push(
      "vital_signs",
      v.id,
      v.recordedAt,
      `Vitals log, ${formatClockTime(v.recordedAt)}`,
      measurements.join(", ")
    );
  }

  for (const l of records.labs) {
    push(
      "lab_results",
      l.id,
      l.recordedAt,
      `Lab result, ${formatClockTime(l.recordedAt)}`,
      `${l.testName}: ${l.resultValue}${l.abnormal ? " (flagged abnormal)" : ""}`
    );
  }

  for (const d of records.diagnoses) {
    push(
      "diagnoses",
      d.id,
      d.diagnosedAt,
      `Diagnosis, ${formatClockTime(d.diagnosedAt)}`,
      `${d.conditionName}${d.status ? ` [${d.status}]` : ""}`
    );
  }

  for (const m of records.medications) {
    push(
      "medications",
      m.id,
      m.prescribedAt,
      `Medication order, ${formatClockTime(m.prescribedAt)}`,
      `${m.drugName} ${m.dosage ?? ""} ${m.frequency ?? ""}`.trim() +
        (m.isActive ? " [active]" : " [discontinued]")
    );
  }

  for (const n of records.clinicalNotes) {
    push(
      "clinical_notes",
      n.id,
      n.createdAt,
      `Clinical note, ${formatClockTime(n.createdAt)}`,
      truncate(n.content)
    );
  }

  for (const n of records.nursingNotes) {
    push(
      "nursing_notes",
      n.id,
      n.createdAt,
      `Nursing note, ${formatClockTime(n.createdAt)}`,
      truncate(n.note)
    );
  }

  for (const e of records.examinations) {
    push(
      "clinical_examinations",
      e.id,
      e.createdAt,
      `Examination, ${formatClockTime(e.createdAt)}`,
      describeExamination(e)
    );
  }

  for (const f of records.followUps) {
    const soap = [
      f.subjective ? `S: ${f.subjective}` : null,
      f.objective ? `O: ${f.objective}` : null,
      f.assessment ? `A: ${f.assessment}` : null,
      f.plan ? `P: ${f.plan}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    push(
      "follow_ups",
      f.id,
      f.recordedAt,
      `Follow-up note, ${formatClockTime(f.recordedAt)}`,
      truncate(soap)
    );
  }

  const allergies = records.admission?.patient?.allergies ?? [];
  for (const a of allergies) {
    push(
      "allergies",
      a.id,
      a.createdAt,
      "Allergy record",
      `${a.allergen}${a.severity ? ` (severity: ${a.severity})` : ""}`
    );
  }

  return entries;
};

/**
 * Rank record entries by lexical overlap with the question so the prompt leads
 * with what was actually asked about, then falls back to recency. Vector search
 * covers the documents; this keeps the structured half of the context focused.
 */
const rankEntriesForQuestion = (entries, question, limit) => {
  const questionTerms = new Set(tokenize(question));

  const scored = entries.map((entry, index) => {
    const entryTerms = tokenize(`${entry.label} ${entry.text}`);
    let overlap = 0;
    for (const term of entryTerms) {
      if (questionTerms.has(term)) overlap += 1;
    }

    const recencyRank = entry.timestamp ? new Date(entry.timestamp).getTime() : 0;
    return { entry, overlap, recencyRank, index };
  });

  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap;
    if (b.recencyRank !== a.recencyRank) return b.recencyRank - a.recencyRank;
    return a.index - b.index;
  });

  return scored.slice(0, limit).map((item) => ({ ...item.entry, matched_terms: item.overlap }));
};

// ─── Public retrieval entry point ────────────────────────────────────────────

const MAX_RECORD_ENTRIES = 45;

/**
 * Gather everything the answer generator may cite for one question.
 *
 * @param {string} admissionId
 * @param {string} question
 * @param {number[]} questionVector
 * @param {Object} [options]
 * @returns {Promise<{ chunks, records, admission, hasContext }>}
 */
const retrieveContext = async (admissionId, question, questionVector, options = {}) => {
  const [chunks, records] = await Promise.all([
    searchDocumentChunks(admissionId, questionVector, options),
    fetchClinicalRecords(admissionId),
  ]);

  const entries = buildRecordEntries(records);
  const rankedRecords = rankEntriesForQuestion(entries, question, options.maxRecords || MAX_RECORD_ENTRIES);

  return {
    admission: records.admission,
    chunks,
    records: rankedRecords,
    totalRecordCount: entries.length,
    hasContext: chunks.length > 0 || entries.length > 0,
  };
};

module.exports = {
  retrieveContext,
  searchDocumentChunks,
  fetchClinicalRecords,
  buildRecordEntries,
  rankEntriesForQuestion,
  formatClockTime,
};
