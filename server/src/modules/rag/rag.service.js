const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const logger = require("../../utils/logger");
const config = require("../../config/env");
const { auditedTransaction } = require("../../middlewares/auditLog");
const { callBedrock } = require("../../utils/bedrockClient");
const { embedText, getEmbeddingModelName } = require("../../utils/embeddingClient");
const { retrieveContext, formatClockTime } = require("./retrieval.service");

/**
 * Generation half of the RAG assistant (FR-3.1).
 *
 * Flow: embed question → admission-scoped pgvector + record retrieval →
 * grounded prompt → LLM → persist question/answer/citations to ai_query_logs
 * inside an audited transaction (QUERY_RAG).
 *
 * Deliberately independent of the AI Summary feature (patientSummary.service.js):
 * different prompt, different retrieval, different table semantics.
 */

const NO_DATA_ANSWER =
  "Not enough recorded data to answer this for the current admission. Nothing in this patient's vitals, labs, notes, examinations, or uploaded documents covers that question.";

const RAG_SYSTEM_PROMPT = `You are the SmartCare ICU clinical retrieval assistant. You answer questions from an ICU physician about ONE admitted patient, using ONLY the retrieved context supplied in the user message.

## ABSOLUTE RULES

1. **Grounding.** Every clinical statement must come from the retrieved context. Never use outside medical knowledge to assert a fact about this patient. If the context does not contain the answer, say so plainly — do not guess, extrapolate, or fill gaps.
2. **Insufficient context.** If the retrieved context cannot support an answer, reply with exactly this sentence and nothing else: "Not enough recorded data to answer this for the current admission."
3. **Single-patient scope.** The context is one admission. If the question asks about another patient, a ward-wide comparison, or anything outside this admission, reply: "That is outside the current admission's recorded data." Never speculate about other patients.
4. **Source attribution - natural mentions only.** When you use information from a retrieved document, mention the document name naturally once in your answer (e.g., "The History Taking Protocol outlines..." or "According to ICU Fundamentals..."). Do NOT repeatedly mention sources. For patient data (vitals, labs), you may naturally reference the data type (e.g., "The recent vital signs show..."). The system will detect these natural references to mark sources.
5. **No new orders.** You may describe and interpret what is recorded. You must not prescribe, direct, or recommend specific therapy. Supportive phrasing only: "Consider reviewing…", "Continue monitoring…", "Reassess…".
6. **Conservative certainty.** Use "suggests", "consistent with", "may indicate". Avoid "confirms", "definitely", "clearly". Do not infer a trend from a single measurement — if there is only one reading, say so.
7. **Safety.** If the context contains an allergy conflicting with an active medication, surface it even if the question did not ask.

## OUTPUT FORMAT

- Answer directly in the first sentence. No preamble, no restating the question.
- Keep it to what was asked — usually 1-4 short paragraphs or a tight bullet list.
- Use Markdown for structure when listing several values.
- Mention source document names naturally once if using retrieved documents (not repeatedly).
- End with nothing extra: no disclaimers, no sign-off.`;

/**
 * Knowledge mode is not tied to a real patient, so — unlike patient mode above —
 * it is allowed to draw on the model's own medical knowledge. It still prefers
 * the indexed knowledge base and must always disclose which source backs each
 * sentence, so a clinician can tell institutional reference material apart from
 * the model's general training.
 */
const KNOWLEDGE_SYSTEM_PROMPT = `You are the SmartCare ICU Medical Knowledge Assistant. You answer general medical-education questions for ICU clinicians. You are NOT discussing any specific patient.

You have two sources of information:
1. **Retrieved knowledge base excerpts** — passages retrieved from this institution's indexed clinical reference documents (given below, if any).
2. **Your own general medical knowledge** — standard, well-established clinical knowledge.

## RULES

1. **Prefer retrieved excerpts.** If the excerpts answer the question, ground your answer in them and mention the document name naturally once (e.g., "The History Taking Protocol outlines..." or "ICU Fundamentals states...").
2. **Fill gaps with general knowledge.** If the excerpts are missing, empty, or only partially answer the question, use your own general medical knowledge to complete the answer without mentioning that it's general knowledge.
3. **Natural source attribution.** When using retrieved documents, mention the source document name naturally once in your answer. When using general knowledge, do NOT mention it—just answer confidently. The system will detect which sources you reference.
4. **Stay general.** This is not about a specific patient. If asked about an individual patient's data, decline and say the physician should use that patient's own AI chat, which has access to their record.
5. **Clinical caution.** Explain concepts, guidelines, and reasoning frameworks. Do not issue a directive treatment plan for a real patient. Supportive phrasing only.
6. **Honesty about uncertainty.** If neither the excerpts nor general medical knowledge can answer confidently, say so plainly rather than guessing.

## OUTPUT FORMAT

- Answer directly in the first sentence. No preamble, no restating the question.
- Use Markdown for structure when listing several values.
- Mention document source names naturally once if using retrieved excerpts (e.g., "According to the History Taking Protocol...").
- For general knowledge, just answer without mentioning the source.
- End with nothing extra: no disclaimers, no sign-off.`;

// ─── Prompt construction ─────────────────────────────────────────────────────

const describeAdmission = (admission) => {
  if (!admission) return "";

  const patient = admission.patient;
  const lines = [
    `Patient: ${patient?.name ?? "Unknown"} (MRN ${patient?.mrn ?? "—"}, age ${patient?.age ?? "—"}${
      patient?.gender ? `, ${patient.gender}` : ""
    })`,
    `Admission status: ${admission.status}, admitted ${formatClockTime(admission.admittedAt)}`,
  ];

  if (admission.bed?.bedNumber) lines.push(`Bed: ${admission.bed.bedNumber}`);
  if (admission.chiefComplaint) lines.push(`Chief complaint: ${admission.chiefComplaint}`);
  if (admission.provisionalDiagnosis) {
    lines.push(`Provisional diagnosis: ${admission.provisionalDiagnosis}`);
  }
  if (admission.doctor) {
    lines.push(`Attending: Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}`);
  }

  return lines.join("\n");
};

/**
 * Render retrieved context into the prompt, respecting a character budget so a
 * data-rich admission cannot blow past the model's context window.
 */
const buildContextBlock = (context) => {
  const budget = config.ragMaxContextChars;
  const sections = [];
  let used = 0;

  const appendSection = (title, lines) => {
    if (lines.length === 0) return;
    const body = `### ${title}\n${lines.join("\n")}`;
    if (used + body.length > budget) return;
    sections.push(body);
    used += body.length;
  };

  const admissionBlock = describeAdmission(context.admission);
  if (admissionBlock) {
    sections.push(`### Admission overview\n${admissionBlock}`);
    used += admissionBlock.length;
  }

  const documentLines = context.chunks.map(
    (chunk) =>
      `- [Document: ${chunk.original_filename}, part ${chunk.chunk_index + 1}] (relevance ${chunk.score.toFixed(
        2
      )})\n  ${chunk.chunk_text.replace(/\n/g, "\n  ")}`
  );
  appendSection("Retrieved document excerpts", documentLines);

  const grouped = new Map();
  for (const record of context.records) {
    if (!grouped.has(record.type)) grouped.set(record.type, []);
    grouped.get(record.type).push(`- [${record.label}] ${record.text}`);
  }

  const TYPE_TITLES = {
    vital_signs: "Vital signs",
    lab_results: "Laboratory results",
    diagnoses: "Diagnoses",
    medications: "Medications",
    allergies: "Allergies",
    clinical_notes: "Clinical notes",
    nursing_notes: "Nursing notes",
    clinical_examinations: "Clinical examinations",
    follow_ups: "Follow-up (SOAP) notes",
  };

  for (const [type, lines] of grouped) {
    appendSection(TYPE_TITLES[type] || type, lines);
  }

  return sections.join("\n\n");
};

const buildConversationBlock = (history) => {
  if (!history || history.length === 0) return "";

  const turns = history
    .slice()
    .reverse()
    .map((entry) => `Q: ${entry.question}\nA: ${String(entry.aiResponse).slice(0, 600)}`)
    .join("\n\n");

  return `### Earlier questions in this conversation (for pronoun resolution only — never cite these as clinical sources)\n${turns}`;
};

const buildUserMessage = (question, context, history) => {
  const parts = [
    "Answer the physician's question using only the retrieved context below.",
    "",
    "--- RETRIEVED CONTEXT ---",
    buildContextBlock(context),
    "--- END RETRIEVED CONTEXT ---",
  ];

  const conversation = buildConversationBlock(history);
  if (conversation) {
    parts.push("", conversation);
  }

  parts.push("", `PHYSICIAN'S QUESTION: ${question}`);

  return parts.join("\n");
};

const buildKnowledgeUserMessage = (question, context, history) => {
  const documentLines = context.chunks.map(
    (chunk) =>
      `- [Document: ${chunk.original_filename}, part ${chunk.chunk_index + 1}] (relevance ${chunk.score.toFixed(
        2
      )})\n  ${chunk.chunk_text.replace(/\n/g, "\n  ")}`
  );

  const parts = [
    "Answer the clinician's general medical knowledge question below.",
    "",
    "--- RETRIEVED KNOWLEDGE BASE EXCERPTS ---",
    documentLines.length > 0
      ? documentLines.join("\n")
      : "(No matching excerpts were found in the knowledge base for this question. Answer using your own general medical knowledge and label it accordingly.)",
    "--- END RETRIEVED KNOWLEDGE BASE EXCERPTS ---",
  ];

  const conversation = buildConversationBlock(history);
  if (conversation) {
    parts.push("", conversation);
  }

  parts.push("", `CLINICIAN'S QUESTION: ${question}`);

  return parts.join("\n");
};

// ─── Citations ───────────────────────────────────────────────────────────────

/**
 * Extract document name from filename for flexible citation matching.
 * E.g., "ICU_Fundamentals.pdf" → ["icu fundamentals", "icu_fundamentals"]
 */
const getDocumentVariants = (filename) => {
  const base = filename.replace(/\.[^/.]+$/, ""); // Remove extension
  return [
    base.toLowerCase(),
    base.toLowerCase().replace(/_/g, " "),
  ];
};

/**
 * Check if a source is cited in the answer text using flexible matching.
 * Looks for:
 * 1. Exact label match (for bracketed citations)
 * 2. Natural reference to document name
 * 3. Natural reference to record type/label
 */
const isCitedInAnswer = (label, answerText, sourceType, filename) => {
  const answer = String(answerText || "").toLowerCase();

  // 1. Try exact match first
  if (answer.includes(label.toLowerCase())) {
    return true;
  }

  // 2. For documents, try filename variants
  if (sourceType === "document_chunk" && filename) {
    const variants = getDocumentVariants(filename);
    if (variants.some((v) => answer.includes(v))) {
      return true;
    }
  }

  // 3. For clinical records, try partial label match (e.g., "vitals log" for "Vitals log, 04 Aug 04:15")
  if (sourceType !== "document_chunk") {
    const labelParts = label.toLowerCase().split(",")[0]; // Get first part before comma
    if (labelParts && answer.includes(labelParts.trim())) {
      return true;
    }
  }

  return false;
};

/**
 * Build the citation list returned to the client. Only include sources that were
 * actually cited in the answer text, or general knowledge if no sources were cited.
 */
const buildCitedSources = (context, answerText) => {
  const answer = String(answerText || "");
  const sources = [];
  const citedSources = [];

  for (const chunk of context.chunks) {
    const label = `Document: ${chunk.original_filename}, part ${chunk.chunk_index + 1}`;
    const cited = isCitedInAnswer(label, answer, "document_chunk", chunk.original_filename);

    if (cited) {
      citedSources.push({
        type: "document_chunk",
        id: chunk.id,
        document_id: chunk.document_id,
        chunk_index: chunk.chunk_index,
        label,
        excerpt: chunk.chunk_text.slice(0, 320),
        score: Number(chunk.score.toFixed(4)),
        cited: true,
      });
    }
  }

  for (const record of context.records) {
    if (record.matched_terms === 0 && citedSources.length >= 12) continue;
    const cited = isCitedInAnswer(record.label, answer, record.type);

    if (cited) {
      citedSources.push({
        type: record.type,
        id: record.id,
        label: record.label,
        timestamp: record.timestamp,
        excerpt: record.text.slice(0, 320),
        cited: true,
      });
    }
  }

  // If sources were cited, return only those
  if (citedSources.length > 0) {
    return citedSources.slice(0, 25);
  }

  // If no sources were cited but retrieval happened, show general knowledge
  if (context.chunks.length > 0 || context.records.length > 0) {
    return [
      {
        type: "general_knowledge",
        id: "general-knowledge",
        label: "General medical knowledge",
        excerpt: "This answer is based on the AI's general medical training, not the retrieved sources.",
        cited: true,
      },
    ];
  }

  // No context retrieved and no citations
  return [];
};

// ─── Answer generation ───────────────────────────────────────────────────────

/**
 * The test suite runs in retrieval-only mode by default: deterministic
 * assertions, no API budget spent on every CI run. Set RAG_LIVE_LLM=true to
 * exercise the real generation path from tests.
 */
const isLlmConfigured = () => {
  if (config.nodeEnv === "test" && process.env.RAG_LIVE_LLM !== "true") return false;
  return Boolean(config.bedrockApiUrl && config.bedrockApiKey);
};

/**
 * Deterministic extractive answer used when no LLM is configured (CI, offline
 * dev). It never invents anything — it reports the top retrieved records
 * verbatim with their citation labels, so the contract stays the same.
 */
const buildExtractiveAnswer = (context, question) => {
  const lines = [
    `Retrieval-only mode (no language model configured). Closest recorded data for "${question}":`,
    "",
  ];

  for (const chunk of context.chunks.slice(0, 3)) {
    lines.push(
      `- [Document: ${chunk.original_filename}, part ${chunk.chunk_index + 1}] ${chunk.chunk_text.slice(0, 240)}`
    );
  }

  for (const record of context.records.slice(0, 8)) {
    lines.push(`- [${record.label}] ${record.text}`);
  }

  return lines.join("\n");
};

const generateAnswer = async (context, question, history, mode = "patient") => {
  if (!isLlmConfigured()) {
    return { answer: buildExtractiveAnswer(context, question), mode: "retrieval_only" };
  }

  const isKnowledge = mode === "knowledge";
  const answer = await callBedrock({
    systemPrompt: isKnowledge ? KNOWLEDGE_SYSTEM_PROMPT : RAG_SYSTEM_PROMPT,
    userMessage: isKnowledge
      ? buildKnowledgeUserMessage(question, context, history)
      : buildUserMessage(question, context, history),
    maxTokens: 1536,
    temperature: 0.1,
  });

  return { answer: answer.trim(), mode: "llm" };
};

// ─── Persistence ─────────────────────────────────────────────────────────────

const assertAdmissionExists = async (admissionId) => {
  const admission = await prisma.admission.findUnique({ where: { id: admissionId } });

  if (!admission || admission.isArchived) {
    throw new APIError("Admission not found", 404);
  }

  return admission;
};

/**
 * Guard against a stale JWT referencing a deleted user, which would otherwise
 * fail the ai_query_logs foreign key. Mirrors the behaviour of ai.service.js.
 */
const resolveUserId = async (userId) => {
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return userId;

  const fallback = await prisma.user.findFirst({ where: { status: "ACTIVE" } });
  return fallback ? fallback.id : null;
};

const formatQueryLog = (row) => ({
  id: row.id,
  admission_id: row.admissionId,
  asked_by: row.askedById,
  question: row.question,
  ai_response: row.aiResponse,
  cited_sources: row.citedSources || [],
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

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Retrieve context for knowledge mode (medical knowledge questions without patient data).
 * Searches only indexed documents (the medical PDF) across all admissions.
 */
const retrieveKnowledgeContext = async (question, questionVector, topK = 6) => {
  const { toVectorLiteral } = require("../../utils/embeddingClient");
  const config = require("../../config/env");

  if (!Array.isArray(questionVector) || questionVector.length === 0) {
    return {
      chunks: [],
      records: [],
      admission: null,
      hasContext: false,
    };
  }

  const limit = Math.max(1, Math.min(topK || config.ragTopK, 25));
  const minScore = config.ragMinScore;
  const relevanceRatio = config.ragRelevanceRatio;

  // Search across all indexed documents (no admission scope)
  const rows = await prisma.$queryRawUnsafe(
    `SELECT de.id,
            de.document_id,
            de.chunk_index,
            de.chunk_text,
            md.original_filename,
            1 - (de.embedding <=> $1::vector) AS score
       FROM document_embeddings de
       JOIN medical_documents md ON md.id = de.document_id
      WHERE md.is_archived = false
      ORDER BY de.embedding <=> $1::vector
      LIMIT $2`,
    toVectorLiteral(questionVector),
    limit
  );

  const scored = rows
    .map((row) => ({
      id: row.id,
      document_id: row.document_id,
      chunk_index: row.chunk_index,
      chunk_text: row.chunk_text,
      original_filename: row.original_filename,
      score: Number(row.score),
    }))
    .filter((row) => Number.isFinite(row.score) && row.score > minScore);

  if (scored.length === 0) {
    return {
      chunks: [],
      records: [],
      admission: null,
      hasContext: false,
    };
  }

  // Relative scoring: keep results within relevanceRatio of the top score
  const topScore = scored[0].score;
  const chunks = scored.filter((row) => row.score >= topScore * relevanceRatio);

  return {
    chunks,
    records: [], // No patient records in knowledge mode
    admission: null,
    totalRecordCount: 0,
    hasContext: chunks.length > 0,
  };
};

/**
 * Answer one natural-language question about an admission (patient mode) or
 * about medical knowledge (knowledge mode).
 *
 * @param {string} askedById
 * @param {Object} payload
 * @param {string} [payload.admission_id] — Required for patient mode
 * @param {string} payload.question
 * @param {boolean} [payload.include_history]
 * @param {number} [payload.top_k]
 * @param {string} [payload.mode] — "patient" (default) or "knowledge"
 * @param {Object} req — Express request, for audit metadata
 */
const answerQuestion = async (askedById, payload, req) => {
  const startedAt = Date.now();
  const admissionId = payload.admission_id;
  const question = String(payload.question || "").trim();
  const mode_type = payload.mode || "patient";

  if (mode_type === "patient" && !admissionId) {
    throw new APIError("admission_id is required for patient mode", 400);
  }

  if (mode_type === "patient") {
    await assertAdmissionExists(admissionId);
  }

  const history = payload.include_history && mode_type === "patient"
    ? await prisma.aiQueryLog.findMany({
        where: { admissionId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { question: true, aiResponse: true },
      })
    : [];

  const questionVector = await embedText(question);
  const context = mode_type === "knowledge"
    ? await retrieveKnowledgeContext(question, questionVector, payload.top_k)
    : await retrieveContext(admissionId, question, questionVector, { topK: payload.top_k });

  let answer;
  let llm_mode;

  if (!context.hasContext && mode_type === "patient") {
    // Patient mode never falls back to general knowledge — every clinical
    // statement about a real patient must be grounded in their own record.
    answer = NO_DATA_ANSWER;
    llm_mode = "no_context";
  } else if (!context.hasContext && !isLlmConfigured()) {
    // Knowledge mode with no LLM configured (CI/offline) has nothing to fall
    // back to — there is no retrieved context and no model to reason from.
    answer = "No information found in the medical knowledge base for this question.";
    llm_mode = "no_context";
  } else {
    // Knowledge mode: ground in retrieved excerpts when there are any, and
    // let the model draw on its own medical knowledge otherwise — generateAnswer
    // picks the prompt and clearly labels which source backs each sentence.
    ({ answer, mode: llm_mode } = await generateAnswer(context, question, history, mode_type));
  }

  const citedSources = llm_mode === "no_context" ? [] : buildCitedSources(context, answer);
  const validAskedById = await resolveUserId(askedById);
  const durationMs = Date.now() - startedAt;

  // Only log to DB if patient mode
  let log = null;
  if (mode_type === "patient" && admissionId) {
    log = await auditedTransaction(
      req,
      { action: "QUERY_RAG", targetTable: "AiQueryLog" },
      async (tx) => {
        const created = await tx.aiQueryLog.create({
          data: {
            admissionId,
            askedById: validAskedById,
            question,
            aiResponse: answer,
            citedSources: citedSources.length > 0 ? citedSources : null,
          },
        });

        return { targetId: created.id, newValues: created, result: created };
      }
    );
  }

  if (mode_type === "patient") {
    logger.info(
      "RAG query answered for admission %s in %dms (mode=%s, chunks=%d, records=%d)",
      admissionId,
      durationMs,
      llm_mode,
      context.chunks.length,
      context.records.length
    );
  } else {
    logger.info(
      "Knowledge query answered in %dms (mode=%s, chunks=%d)",
      durationMs,
      llm_mode,
      context.chunks.length
    );
  }

  return {
    id: log?.id || null,
    admission_id: admissionId || null,
    query_mode: mode_type,
    question,
    ai_response: answer,
    cited_sources: citedSources,
    created_at: log?.createdAt || new Date().toISOString(),
    retrieval: {
      mode: llm_mode,
      embedding_model: getEmbeddingModelName(),
      document_chunks_retrieved: context.chunks.length,
      clinical_records_retrieved: context.records.length,
      clinical_records_available: context.totalRecordCount,
      top_score: context.chunks[0] ? Number(context.chunks[0].score.toFixed(4)) : null,
      duration_ms: durationMs,
    },
  };
};

/** Conversation history for an admission, oldest → newest for chat rendering. */
const getHistory = async (admissionId, limit = 30) => {
  await assertAdmissionExists(admissionId);

  const take = Math.max(1, Math.min(Number(limit) || 30, 100));

  const rows = await prisma.aiQueryLog.findMany({
    where: { admissionId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      askedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  return rows.reverse().map(formatQueryLog);
};

/** Permanently drop the conversation for an admission (audit trail is retained). */
const clearHistory = async (admissionId, req) => {
  await assertAdmissionExists(admissionId);

  return await auditedTransaction(
    req,
    { action: "ARCHIVE", targetTable: "AiQueryLog" },
    async (tx) => {
      const { count } = await tx.aiQueryLog.deleteMany({ where: { admissionId } });

      return {
        targetId: admissionId,
        oldValues: { admissionId, deleted: count },
        result: {
          status: "success",
          message: `Cleared ${count} conversation entr${count === 1 ? "y" : "ies"}.`,
          deleted: count,
        },
      };
    }
  );
};

module.exports = {
  answerQuestion,
  getHistory,
  clearHistory,
  formatQueryLog,
  buildCitedSources,
  buildUserMessage,
  NO_DATA_ANSWER,
  RAG_SYSTEM_PROMPT,
};
