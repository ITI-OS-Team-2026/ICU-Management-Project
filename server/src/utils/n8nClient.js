const config = require("../config/env");
const APIError = require("./APIError");

/**
 * Call an n8n webhook with a hard timeout (FR-3.1 / FR-7.3).
 * Throws APIError 503 when unreachable, non-OK, or past N8N_TIMEOUT_MS.
 */
const callN8nWebhook = async (url, payload, timeoutMs = config.n8nTimeoutMs) => {
  if (!url) {
    throw new APIError("AI assistant temporarily unavailable — try again shortly", 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new APIError("AI assistant temporarily unavailable — try again shortly", 503);
    }

    return await response.json();
  } catch (err) {
    if (err instanceof APIError) throw err;
    throw new APIError("AI assistant temporarily unavailable — try again shortly", 503);
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { callN8nWebhook };
