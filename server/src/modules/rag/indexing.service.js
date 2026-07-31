const { randomUUID } = require("crypto");
const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const logger = require("../../utils/logger");
const config = require("../../config/env");
const {
  embedTexts,
  toVectorLiteral,
  getEmbeddingModelName,
} = require("../../utils/embeddingClient");
const { chunkText } = require("./chunker");
const {
  extractText,
  UnsupportedDocumentError,
  ExtractionError,
} = require("./textExtractor");

/**
 * Document processing and indexing for the RAG assistant (FR-3.1).
 *
 * Lifecycle of `medical_documents.embedding_status`:
 *
 *   PENDING     — uploaded, not picked up yet
 *   PROCESSING  — extraction/embedding in flight
 *   COMPLETED   — chunks embedded and searchable
 *   SKIPPED     — no extractable text (e.g. scanned image); retrying will not help
 *   FAILED      — a technical failure; `embedding_error` explains it and the
 *                 document can be re-queued through the re-index endpoint
 *
 * Indexing runs out of band from the upload request so a slow embedding provider
 * never blocks the clinician's upload (FR-7.3 graceful degradation).
 */

// Documents currently being processed in this process, keyed by document id.
// Prevents a double re-index when a user clicks twice or upload races a retry.
const inFlight = new Set();

const INSERT_BATCH_SIZE = 25;

const setStatus = (documentId, data) =>
  prisma.medicalDocument.update({ where: { id: documentId }, data });

/** Replace a document's chunk rows with freshly embedded ones, atomically. */
const replaceEmbeddings = async (document, chunks, vectors, modelName) => {
  await prisma.$transaction(
    async (tx) => {
      await tx.documentEmbedding.deleteMany({ where: { documentId: document.id } });

      for (let offset = 0; offset < chunks.length; offset += INSERT_BATCH_SIZE) {
        const batch = chunks.slice(offset, offset + INSERT_BATCH_SIZE);

        const rows = [];
        const params = [];

        batch.forEach((chunk, index) => {
          const chunkIndex = offset + index;
          const p = params.length;
          rows.push(
            `($${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7}, $${p + 8}::vector)`
          );
          params.push(
            randomUUID(),
            document.id,
            document.admissionId,
            chunkIndex,
            chunk,
            chunk.length,
            modelName,
            toVectorLiteral(vectors[chunkIndex])
          );
        });

        // Raw SQL because Prisma cannot write the pgvector `Unsupported` column.
        // eslint-disable-next-line no-await-in-loop -- batches must land in order
        await tx.$executeRawUnsafe(
          `INSERT INTO document_embeddings
             (id, document_id, admission_id, chunk_index, chunk_text, char_count, embedding_model, embedding)
           VALUES ${rows.join(", ")}`,
          ...params
        );
      }
    },
    { maxWait: 20_000, timeout: 60_000 }
  );
};

/**
 * Extract, chunk, embed, and store one document.
 * Never throws — every outcome is recorded on the document row instead, because
 * this runs detached from the HTTP request that triggered it.
 *
 * @param {string} documentId
 * @returns {Promise<{ status: string, chunkCount: number, message?: string }>}
 */
const indexDocument = async (documentId) => {
  if (inFlight.has(documentId)) {
    return { status: "PROCESSING", chunkCount: 0, message: "Indexing already in progress." };
  }
  inFlight.add(documentId);

  const startedAt = Date.now();

  try {
    const document = await prisma.medicalDocument.findUnique({ where: { id: documentId } });

    if (!document) {
      logger.warn("RAG indexing skipped — document %s no longer exists", documentId);
      return { status: "FAILED", chunkCount: 0, message: "Document not found." };
    }

    if (document.isArchived) {
      return { status: document.embeddingStatus, chunkCount: document.chunkCount, message: "Document is archived." };
    }

    await setStatus(documentId, {
      embeddingStatus: "PROCESSING",
      embeddingError: null,
    });

    const { text, pageCount, extractor, truncated } = await extractText({
      filePath: document.filePath,
      cloudinaryUrl: document.cloudinaryUrl,
      fileContent: document.fileContent,
      storageType: document.storageType,
      mimeType: document.mimeType,
      originalName: document.originalFilename,
    });

    const chunks = chunkText(text);

    if (chunks.length === 0) {
      await setStatus(documentId, {
        embeddingStatus: "SKIPPED",
        embeddingError: "The document contained no indexable text.",
        chunkCount: 0,
        embeddedAt: null,
      });
      return { status: "SKIPPED", chunkCount: 0, message: "The document contained no indexable text." };
    }

    const modelName = getEmbeddingModelName();
    const vectors = await embedTexts(chunks);

    if (vectors.length !== chunks.length) {
      throw new Error(
        `Embedding provider returned ${vectors.length} vectors for ${chunks.length} chunks`
      );
    }

    await replaceEmbeddings(document, chunks, vectors, modelName);

    await setStatus(documentId, {
      embeddingStatus: "COMPLETED",
      embeddingError: truncated
        ? `Only the first ${config.ragMaxDocumentChars.toLocaleString()} characters were indexed.`
        : null,
      embeddingModel: modelName,
      chunkCount: chunks.length,
      embeddedAt: new Date(),
    });

    logger.info(
      "RAG indexed document %s (%s, %s pages, %d chunks, %dms)",
      documentId,
      extractor,
      pageCount ?? "n/a",
      chunks.length,
      Date.now() - startedAt
    );

    return { status: "COMPLETED", chunkCount: chunks.length };
  } catch (err) {
    const isPermanent = err instanceof UnsupportedDocumentError;
    const status = isPermanent ? "SKIPPED" : "FAILED";
    const message =
      isPermanent || err instanceof ExtractionError
        ? err.message
        : err instanceof APIError
        ? err.message
        : "Indexing failed unexpectedly. Please retry.";

    if (!isPermanent) {
      logger.error("RAG indexing failed for document %s: %s", documentId, err.message);
    }

    await setStatus(documentId, {
      embeddingStatus: status,
      embeddingError: message,
      chunkCount: 0,
      embeddedAt: null,
    }).catch((updateErr) => {
      logger.error(
        "Could not record indexing outcome for document %s: %s",
        documentId,
        updateErr.message
      );
    });

    return { status, chunkCount: 0, message };
  } finally {
    inFlight.delete(documentId);
  }
};

/**
 * Kick off indexing without blocking the caller's response.
 * Returns immediately; progress is observable through the document's status.
 */
const queueIndexing = (documentId) => {
  setImmediate(() => {
    indexDocument(documentId).catch((err) => {
      logger.error("Unhandled RAG indexing error for document %s: %s", documentId, err.message);
    });
  });
};

/** True while this process is still working on the document. */
const isIndexing = (documentId) => inFlight.has(documentId);

// ─── Read models ─────────────────────────────────────────────────────────────

const RETRYABLE_STATUSES = new Set(["FAILED", "PENDING"]);

const formatDocumentStatus = (document) => ({
  id: document.id,
  original_filename: document.originalFilename,
  document_type: document.documentType,
  mime_type: document.mimeType,
  file_size: document.fileSize,
  embedding_status: isIndexing(document.id) ? "PROCESSING" : document.embeddingStatus,
  embedding_error: document.embeddingError,
  embedding_model: document.embeddingModel,
  chunk_count: document.chunkCount,
  embedded_at: document.embeddedAt,
  uploaded_at: document.createdAt,
  is_retryable:
    RETRYABLE_STATUSES.has(document.embeddingStatus) && !isIndexing(document.id),
});

/** Per-admission indexing dashboard: counts by status plus per-document detail. */
const getAdmissionIndexStatus = async (admissionId) => {
  const documents = await prisma.medicalDocument.findMany({
    where: { admissionId, isArchived: false },
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    total: documents.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
  };

  let indexedChunks = 0;

  for (const document of documents) {
    const status = isIndexing(document.id) ? "PROCESSING" : document.embeddingStatus;
    const key = status.toLowerCase();
    if (key in counts) counts[key] += 1;
    indexedChunks += document.chunkCount || 0;
  }

  return {
    admission_id: admissionId,
    embedding_provider: getEmbeddingModelName(),
    indexed_chunks: indexedChunks,
    is_searchable: counts.completed > 0,
    is_busy: counts.processing > 0 || counts.pending > 0,
    counts,
    documents: documents.map(formatDocumentStatus),
  };
};

const getDocumentOrThrow = async (documentId) => {
  const document = await prisma.medicalDocument.findUnique({ where: { id: documentId } });

  if (!document || document.isArchived) {
    throw new APIError("Document not found", 404);
  }

  return document;
};

const getDocumentStatus = async (documentId) => {
  const document = await getDocumentOrThrow(documentId);
  return formatDocumentStatus(document);
};

/** Return the stored chunks for a document so clinicians can audit what the AI sees. */
const getDocumentChunks = async (documentId, limit = 50) => {
  const document = await getDocumentOrThrow(documentId);

  const chunks = await prisma.documentEmbedding.findMany({
    where: { documentId },
    orderBy: { chunkIndex: "asc" },
    take: limit,
    select: {
      id: true,
      chunkIndex: true,
      chunkText: true,
      charCount: true,
      embeddingModel: true,
      createdAt: true,
    },
  });

  return {
    document: formatDocumentStatus(document),
    results: chunks.length,
    chunks: chunks.map((chunk) => ({
      id: chunk.id,
      chunk_index: chunk.chunkIndex,
      chunk_text: chunk.chunkText,
      char_count: chunk.charCount,
      embedding_model: chunk.embeddingModel,
      created_at: chunk.createdAt,
    })),
  };
};

/** Force a fresh extract → chunk → embed cycle for one document. */
const reindexDocument = async (documentId) => {
  const document = await getDocumentOrThrow(documentId);

  if (isIndexing(document.id)) {
    throw new APIError("This document is already being indexed", 409);
  }

  await setStatus(document.id, {
    embeddingStatus: "PENDING",
    embeddingError: null,
    chunkCount: 0,
    embeddedAt: null,
  });

  const outcome = await indexDocument(document.id);

  return {
    ...(await getDocumentStatus(document.id)),
    message:
      outcome.message ||
      (outcome.status === "COMPLETED"
        ? `Indexed ${outcome.chunkCount} chunk${outcome.chunkCount === 1 ? "" : "s"}.`
        : "Indexing finished."),
  };
};

/** Re-queue every document for an admission that is not currently searchable. */
const reindexAdmission = async (admissionId) => {
  const documents = await prisma.medicalDocument.findMany({
    where: {
      admissionId,
      isArchived: false,
      embeddingStatus: { in: ["PENDING", "FAILED"] },
    },
    select: { id: true },
  });

  for (const document of documents) {
    if (!isIndexing(document.id)) {
      queueIndexing(document.id);
    }
  }

  return { queued: documents.length };
};

module.exports = {
  indexDocument,
  queueIndexing,
  reindexDocument,
  reindexAdmission,
  getAdmissionIndexStatus,
  getDocumentStatus,
  getDocumentChunks,
  formatDocumentStatus,
  isIndexing,
};
