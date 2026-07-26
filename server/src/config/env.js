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
};
