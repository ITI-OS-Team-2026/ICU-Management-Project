const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");
const { callN8nWebhook } = require("../../utils/n8nClient");
const config = require("../../config/env");

const SUMMARY_TYPE_TO_PRISMA = {
  "24_HOUR": "TWENTY_FOUR_HOUR",
  ON_DEMAND: "ON_DEMAND",
};

const SUMMARY_TYPE_TO_API = {
  TWENTY_FOUR_HOUR: "24_HOUR",
  ON_DEMAND: "ON_DEMAND",
};

const formatSummary = (row) => ({
  id: row.id,
  admission_id: row.admissionId,
  requested_by: row.requestedById,
  summary_type: SUMMARY_TYPE_TO_API[row.summaryType] || row.summaryType,
  overall_summary: row.overallSummary,
  generated_at: row.generatedAt,
  is_archived: row.isArchived,
  archived_at: row.archivedAt,
  ...(row.requestedBy
    ? {
        requested_by_user: {
          id: row.requestedBy.id,
          first_name: row.requestedBy.firstName,
          last_name: row.requestedBy.lastName,
          role: row.requestedBy.role,
        },
      }
    : {}),
});

const formatQueryLog = (row) => ({
  id: row.id,
  admission_id: row.admissionId,
  asked_by: row.askedById,
  question: row.question,
  ai_response: row.aiResponse,
  cited_sources: row.citedSources,
  created_at: row.createdAt,
  ...(row.askedBy
    ? {
        asked_by_user: {
          id: row.askedBy.id,
          first_name: row.askedBy.firstName,
          last_name: row.askedBy.lastName,
          role: row.askedBy.role,
        },
      }
    : {}),
});

const assertAdmissionExists = async (admissionId) => {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });
  if (!admission || admission.isArchived) {
    throw new APIError("Admission not found", 404);
  }
  return admission;
};

/**
 * Build an admission-scoped clinical context pack for AI orchestration.
 * Always filtered by admission_id — never cross-patient (FR-3.1).
 */
const buildAdmissionContext = async (admissionId, { since = null, includeHistory = false } = {}) => {
  const timeFilter = since ? { gte: since } : undefined;

  const [
    vitals,
    labs,
    clinicalNotes,
    nursingNotes,
    examinations,
    followUps,
    diagnoses,
    medications,
    documentChunks,
    queryHistory,
  ] = await Promise.all([
    prisma.vitalSign.findMany({
      where: {
        admissionId,
        isArchived: false,
        ...(timeFilter ? { recordedAt: timeFilter } : {}),
      },
      orderBy: { recordedAt: "desc" },
      take: 50,
    }),
    prisma.labResult.findMany({
      where: {
        admissionId,
        isArchived: false,
        ...(timeFilter ? { recordedAt: timeFilter } : {}),
      },
      orderBy: { recordedAt: "desc" },
      take: 50,
    }),
    prisma.clinicalNote.findMany({
      where: {
        admissionId,
        ...(timeFilter ? { createdAt: timeFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.nursingNote.findMany({
      where: {
        admissionId,
        ...(timeFilter ? { createdAt: timeFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.clinicalExamination.findMany({
      where: {
        admissionId,
        isArchived: false,
        ...(timeFilter ? { createdAt: timeFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.followUp.findMany({
      where: {
        admissionId,
        isArchived: false,
        ...(timeFilter ? { recordedAt: timeFilter } : {}),
      },
      orderBy: { recordedAt: "desc" },
      take: 20,
    }),
    prisma.diagnosis.findMany({
      where: { admissionId, isArchived: false },
      orderBy: { diagnosedAt: "desc" },
      take: 20,
    }),
    prisma.medication.findMany({
      where: { admissionId, isArchived: false, isActive: true },
      orderBy: { prescribedAt: "desc" },
      take: 30,
    }),
    prisma.documentEmbedding.findMany({
      where: { admissionId },
      orderBy: { id: "desc" },
      take: 20,
      select: {
        id: true,
        documentId: true,
        chunkText: true,
      },
    }),
    includeHistory
      ? prisma.aiQueryLog.findMany({
          where: { admissionId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            question: true,
            aiResponse: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    admission_id: admissionId,
    vitals,
    labs,
    clinical_notes: clinicalNotes,
    nursing_notes: nursingNotes,
    examinations,
    follow_ups: followUps,
    diagnoses,
    medications,
    document_chunks: documentChunks,
    query_history: queryHistory,
  };
};

const hasAnyClinicalData = (context) => {
  return (
    context.vitals.length > 0 ||
    context.labs.length > 0 ||
    context.clinical_notes.length > 0 ||
    context.nursing_notes.length > 0 ||
    context.examinations.length > 0 ||
    context.follow_ups.length > 0 ||
    context.diagnoses.length > 0 ||
    context.medications.length > 0 ||
    context.document_chunks.length > 0
  );
};

const categoryLine = (label, items, formatter) => {
  if (!items.length) {
    return `${label}: no data recorded in this period.`;
  }
  return `${label}:\n${items.map(formatter).join("\n")}`;
};

/**
 * Local stub when n8n webhooks are not configured (dev/tests).
 * Mirrors FR-3.2 four-category layout without calling an external LLM.
 */
const stubSummaryFromContext = (context, summaryType) => {
  const hemodynamic = categoryLine(
    "Hemodynamic Status",
    context.vitals,
    (v) =>
      `- [${v.recordedAt.toISOString()}] BP ${v.systolicBp ?? "—"}/${v.diastolicBp ?? "—"}, pulse ${v.pulse ?? "—"}, temp ${v.temperature ?? "—"}`
  );
  const respiratory = categoryLine(
    "Respiratory State",
    context.vitals,
    (v) =>
      `- [${v.recordedAt.toISOString()}] RR ${v.respiratoryRate ?? "—"}, SpO2 ${v.spo2 ?? "—"}%`
  );
  const renal = categoryLine(
    "Renal/Metabolic Status",
    context.labs,
    (l) =>
      `- [${l.recordedAt.toISOString()}] ${l.testName}: ${l.resultValue}${l.abnormal ? " (abnormal)" : ""}`
  );
  const notesAndExams = [...context.clinical_notes, ...context.nursing_notes, ...context.examinations, ...context.follow_ups];
  const neuro = categoryLine(
    "Neurological Status",
    notesAndExams,
    (n) => {
      const ts = n.createdAt || n.recordedAt;
      const text = n.content || n.note || n.assessment || JSON.stringify(n.generalExams || n.localExams || {});
      return `- [${ts.toISOString()}] ${String(text).slice(0, 200)}`;
    }
  );

  return [
    `AI summary (${summaryType}) for admission ${context.admission_id}`,
    "",
    hemodynamic,
    "",
    respiratory,
    "",
    renal,
    "",
    neuro,
  ].join("\n");
};

const buildCitedSourcesFromContext = (context) => {
  const sources = [];

  for (const v of context.vitals.slice(0, 5)) {
    sources.push({
      type: "vital_signs",
      id: v.id,
      timestamp: v.recordedAt,
      label: `Vitals log, ${v.recordedAt.toISOString()}`,
    });
  }
  for (const l of context.labs.slice(0, 5)) {
    sources.push({
      type: "lab_results",
      id: l.id,
      timestamp: l.recordedAt,
      label: `Lab: ${l.testName}, ${l.recordedAt.toISOString()}`,
    });
  }
  for (const n of context.clinical_notes.slice(0, 3)) {
    sources.push({
      type: "clinical_notes",
      id: n.id,
      timestamp: n.createdAt,
      label: `Clinical note, ${n.createdAt.toISOString()}`,
    });
  }
  for (const n of context.nursing_notes.slice(0, 3)) {
    sources.push({
      type: "nursing_notes",
      id: n.id,
      timestamp: n.createdAt,
      label: `Nursing note, ${n.createdAt.toISOString()}`,
    });
  }
  for (const c of context.document_chunks.slice(0, 5)) {
    sources.push({
      type: "document_embeddings",
      id: c.id,
      document_id: c.documentId,
      label: `Document chunk ${c.id}`,
    });
  }

  return sources;
};

const stubQueryFromContext = (context, question) => {
  if (!hasAnyClinicalData(context)) {
    return {
      ai_response: "Not enough recorded data to answer this for the current admission.",
      cited_sources: [],
    };
  }

  const sources = buildCitedSourcesFromContext(context);
  const previewParts = [];

  if (context.vitals[0]) {
    const v = context.vitals[0];
    previewParts.push(
      `Latest vitals (${v.recordedAt.toISOString()}): BP ${v.systolicBp ?? "—"}/${v.diastolicBp ?? "—"}, pulse ${v.pulse ?? "—"}, SpO2 ${v.spo2 ?? "—"}%.`
    );
  }
  if (context.labs[0]) {
    const l = context.labs[0];
    previewParts.push(`Latest lab: ${l.testName} = ${l.resultValue}.`);
  }
  if (context.diagnoses[0]) {
    previewParts.push(`Active diagnosis: ${context.diagnoses[0].conditionName}.`);
  }
  if (context.medications[0]) {
    previewParts.push(
      `Active medication: ${context.medications[0].drugName} ${context.medications[0].dosage}.`
    );
  }
  if (context.document_chunks[0]) {
    previewParts.push(`Document excerpt: ${context.document_chunks[0].chunkText.slice(0, 160)}`);
  }

  return {
    ai_response: [
      `Based on recorded data for this admission only (question: "${question}"):`,
      previewParts.join(" "),
      sources.length
        ? "See cited_sources for exact record references."
        : "No specific source records matched.",
    ].join(" "),
    cited_sources: sources,
  };
};

const requestSummaryFromOrchestrator = async (context, summaryType) => {
  if (!config.n8nSummaryWebhookUrl) {
    return { overall_summary: stubSummaryFromContext(context, summaryType) };
  }

  const result = await callN8nWebhook(config.n8nSummaryWebhookUrl, {
    admission_id: context.admission_id,
    summary_type: summaryType,
    context,
  });

  if (!result?.overall_summary && !result?.summary) {
    throw new APIError("AI assistant temporarily unavailable — try again shortly", 503);
  }

  return {
    overall_summary: result.overall_summary || result.summary,
  };
};

const requestQueryFromOrchestrator = async (context, question) => {
  if (!config.n8nQueryWebhookUrl) {
    return stubQueryFromContext(context, question);
  }

  const result = await callN8nWebhook(config.n8nQueryWebhookUrl, {
    admission_id: context.admission_id,
    question,
    context,
  });

  if (!result?.ai_response && !result?.answer) {
    throw new APIError("AI assistant temporarily unavailable — try again shortly", 503);
  }

  return {
    ai_response: result.ai_response || result.answer,
    cited_sources: result.cited_sources || result.citations || [],
  };
};

const createSummary = async (requestedById, data, req) => {
  const admissionId = data.admission_id;
  await assertAdmissionExists(admissionId);

  const prismaType = SUMMARY_TYPE_TO_PRISMA[data.summary_type];
  if (!prismaType) {
    throw new APIError("Invalid summary_type", 400);
  }

  const since =
    data.summary_type === "24_HOUR"
      ? new Date(Date.now() - 24 * 60 * 60 * 1000)
      : null;

  const context = await buildAdmissionContext(admissionId, { since });
  const orchestrated = await requestSummaryFromOrchestrator(context, data.summary_type);

  return await auditedTransaction(
    req,
    { action: "GENERATE_SUMMARY", targetTable: "AiSummary" },
    async (tx) => {
      const summary = await tx.aiSummary.create({
        data: {
          admissionId,
          requestedById,
          summaryType: prismaType,
          overallSummary: orchestrated.overall_summary,
        },
      });

      return {
        targetId: summary.id,
        newValues: summary,
        result: formatSummary(summary),
      };
    }
  );
};

const getSummaries = async (admissionId) => {
  await assertAdmissionExists(admissionId);

  const rows = await prisma.aiSummary.findMany({
    where: {
      admissionId,
      isArchived: false,
    },
    orderBy: { generatedAt: "desc" },
    include: {
      requestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  return rows.map(formatSummary);
};

const createQuery = async (askedById, data, req) => {
  const admissionId = data.admission_id;
  await assertAdmissionExists(admissionId);

  const context = await buildAdmissionContext(admissionId, {
    includeHistory: Boolean(data.include_history),
  });

  const orchestrated = await requestQueryFromOrchestrator(context, data.question);

  return await auditedTransaction(
    req,
    { action: "QUERY_RAG", targetTable: "AiQueryLog" },
    async (tx) => {
      const log = await tx.aiQueryLog.create({
        data: {
          admissionId,
          askedById,
          question: data.question,
          aiResponse: orchestrated.ai_response,
          citedSources: orchestrated.cited_sources || null,
        },
      });

      return {
        targetId: log.id,
        newValues: log,
        result: {
          id: log.id,
          ai_response: log.aiResponse,
          cited_sources: log.citedSources,
        },
      };
    }
  );
};

const getQueryLogs = async (admissionId, limit = 20) => {
  await assertAdmissionExists(admissionId);

  const take = Number(limit) || 20;

  const rows = await prisma.aiQueryLog.findMany({
    where: { admissionId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      askedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  return rows.map(formatQueryLog);
};

module.exports = {
  createSummary,
  getSummaries,
  createQuery,
  getQueryLogs,
};
