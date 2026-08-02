require("dotenv").config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 8000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  cookieName: "smartcare_token",
  cookieMaxAge: 12 * 60 * 60 * 1000, // 12 hours in ms
  lockoutThreshold: 5,
  lockoutDurationMinutes: 15,
  // AI orchestration (n8n) — FR-3.1 / FR-3.2 graceful degradation at 6s
  n8nSummaryWebhookUrl: process.env.N8N_SUMMARY_WEBHOOK_URL || "",
  n8nQueryWebhookUrl: process.env.N8N_QUERY_WEBHOOK_URL || "",
  n8nTimeoutMs: Number(process.env.N8N_TIMEOUT_MS) || 6000,
  // AI Patient Summary — Bedrock via ITI API proxy
  bedrockApiUrl: process.env.BEDROCK_API_URL || "",
  bedrockApiKey: process.env.BEDROCK_API_KEY || "",
  bedrockModelId: process.env.BEDROCK_MODEL_ID || "us.meta.llama3-3-70b-instruct-v1:0",
  bedrockTimeoutMs: Number(process.env.BEDROCK_TIMEOUT_MS) || 30000,
  bedrockMaxTokens: Number(process.env.BEDROCK_MAX_TOKENS) || 2048,
  // ── Cloudinary (Knowledge Base Storage) ──────────────────────────────────────
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  // ── RAG (FR-3.1) — document indexing, embeddings, and retrieval ────────────
  // Provider for chunk/question embeddings:
  //   "local"   — deterministic hashed lexical embedding, no external calls (default)
  //   "bedrock" — the ITI Bedrock proxy's /embed endpoint
  embeddingProvider: (process.env.EMBEDDING_PROVIDER || "local").toLowerCase(),
  embeddingApiUrl: process.env.EMBEDDING_API_URL || "",
  embeddingModelId: process.env.EMBEDDING_MODEL_ID || "amazon.titan-embed-text-v2:0",
  embeddingTimeoutMs: Number(process.env.EMBEDDING_TIMEOUT_MS) || 30000,
  embeddingBatchSize: Number(process.env.EMBEDDING_BATCH_SIZE) || 16,
  // Must match the vector(N) column width in prisma/medicalDocument.prisma.
  embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS) || 1024,
  ragChunkSize: Number(process.env.RAG_CHUNK_SIZE) || 1200,
  ragChunkOverlap: Number(process.env.RAG_CHUNK_OVERLAP) || 200,
  ragTopK: Number(process.env.RAG_TOP_K) || 6,
  // Absolute cosine-similarity floor — below this a chunk shares essentially no
  // signal with the question. Kept low because absolute scores are provider
  // dependent; the relative cut-off below does the real filtering.
  ragMinScore: Number(process.env.RAG_MIN_SCORE) || 0.02,
  // Keep chunks scoring at least this fraction of the best match.
  ragRelevanceRatio: Number(process.env.RAG_RELEVANCE_RATIO) || 0.35,
  ragMaxContextChars: Number(process.env.RAG_MAX_CONTEXT_CHARS) || 14000,
  ragMaxDocumentChars: Number(process.env.RAG_MAX_DOCUMENT_CHARS) || 400000,

  // ── Log & session retention ─────────────────────────────────────────────
  // How long each append-only table is kept before the nightly job removes
  // it. See src/jobs/logRetention.job.js for the reasoning per table.
  logRetentionCron: process.env.LOG_RETENTION_CRON || "15 3 * * *", // 03:15 daily
  logRetentionBatchSize: Number(process.env.LOG_RETENTION_BATCH_SIZE) || 500,
  auditLogRetentionDays: Number(process.env.AUDIT_LOG_RETENTION_DAYS) || 365,
  auditLogArchiveDir: process.env.AUDIT_LOG_ARCHIVE_DIR || "storage/audit-archive",
  aiQueryLogRetentionDays: Number(process.env.AI_QUERY_LOG_RETENTION_DAYS) || 180,
  loginAttemptRetentionDays: Number(process.env.LOGIN_ATTEMPT_RETENTION_DAYS) || 90,
  // Grace period after a refresh token expires/is revoked before it's purged
  // — short, since an expired token is inert, but non-zero so a concurrent
  // refresh mid-rotation can't be cleaned up out from under it.
  refreshTokenGraceDays: Number(process.env.REFRESH_TOKEN_GRACE_DAYS) || 7,

  // ── SMTP (password reset emails) ───────────────────────────────────────
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "ICU SmartCare <noreply@smartcare.local>",
};
