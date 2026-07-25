const config = require("../config/env");
const APIError = require("./APIError");
const logger = require("./logger");

/**
 * Bedrock LLM client — calls the ITI API-access proxy that fronts AWS Bedrock.
 *
 * Environment variables consumed:
 *   BEDROCK_API_URL      — base URL of the proxy (default: http://apiaccess.iti.net.eg/api/v1/student/chat)
 *   BEDROCK_API_KEY      — bearer token for the proxy
 *   BEDROCK_MODEL_ID     — model identifier (default: us.meta.llama3-3-70b-instruct-v1:0)
 *   BEDROCK_TIMEOUT_MS   — request timeout in ms (default: 30000)
 *   BEDROCK_MAX_TOKENS   — max tokens in the response (default: 2048)
 */

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Send a chat completion request to the Bedrock-backed API.
 *
 * @param {Object} options
 * @param {string} options.systemPrompt  — system-level instructions for the LLM
 * @param {string} options.userMessage   — the user/content message
 * @param {number} [options.maxTokens]   — override for max_tokens
 * @param {number} [options.timeoutMs]   — override for timeout
 * @returns {Promise<string>}            — the LLM's text response
 */
const callBedrock = async ({ systemPrompt, userMessage, maxTokens, timeoutMs, temperature }) => {
  const apiUrl = config.bedrockApiUrl;
  const apiKey = config.bedrockApiKey;
  const modelId = config.bedrockModelId;

  if (!apiUrl || !apiKey) {
    throw new APIError(
      "AI service is not configured — missing BEDROCK_API_URL or BEDROCK_API_KEY",
      503
    );
  }

  const resolvedTimeout = timeoutMs || config.bedrockTimeoutMs || DEFAULT_TIMEOUT_MS;
  const resolvedMaxTokens = maxTokens || config.bedrockMaxTokens || 2048;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), resolvedTimeout);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model_id: modelId,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
        system_prompt: systemPrompt,
        max_tokens: resolvedMaxTokens,
        temperature: temperature ?? 0.2,
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new APIError("AI service rate limit exceeded — please try again later", 429);
    }

    if (response.status === 401 || response.status === 403) {
      logger.error("Bedrock API authentication failed (status %d)", response.status);
      throw new APIError("AI service authentication failed", 503);
    }

    if (!response.ok) {
      logger.error("Bedrock API returned non-OK status: %d", response.status);
      throw new APIError("AI service temporarily unavailable — try again shortly", 503);
    }

    const data = await response.json();

    // Extract the text content from the response.
    // The ITI proxy returns { output_text: "..." } — handle other shapes as fallback.
    const text =
      data?.output_text ||                       // ITI API proxy shape
      data?.choices?.[0]?.message?.content ||     // OpenAI-compatible shape
      data?.content ||                            // Direct content field
      data?.response ||                           // Simple response field
      data?.output?.message?.content ||           // Bedrock converse shape
      data?.completion ||                         // Anthropic legacy shape
      null;

    if (!text) {
      logger.error("Bedrock API returned unexpected response shape: %j", Object.keys(data));
      throw new APIError("AI service returned an invalid response", 503);
    }

    return typeof text === "string" ? text : JSON.stringify(text);
  } catch (err) {
    if (err instanceof APIError) throw err;

    if (err.name === "AbortError") {
      logger.error("Bedrock API request timed out after %dms", resolvedTimeout);
      throw new APIError("AI service request timed out — try again shortly", 504);
    }

    logger.error("Bedrock API request failed: %s", err.message);
    throw new APIError("AI service temporarily unavailable — try again shortly", 503);
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { callBedrock };
