const config = require("../config/env");
const APIError = require("./APIError");
const logger = require("./logger");

/**
 * Embedding client for the RAG pipeline (FR-3.1).
 *
 * Two interchangeable providers, selected by EMBEDDING_PROVIDER:
 *
 *   "local"   — deterministic hashed lexical embedding computed in-process.
 *               No network, no API budget, identical output for identical input,
 *               so indexing and querying always agree. Cosine similarity over
 *               these vectors is a sub-linear-TF weighted term overlap, which is
 *               a genuine (lexical) retriever — it just cannot match synonyms.
 *
 *   "bedrock" — POSTs to the Bedrock proxy's /embed endpoint. Semantic quality,
 *               but requires an embedding model the API key is allowed to invoke.
 *
 * Both providers return L2-normalised vectors of exactly config.embeddingDimensions
 * components, which is what the vector(1024) column and the `<=>` cosine operator
 * in retrieval.service.js expect.
 */

const DIMENSIONS = config.embeddingDimensions;

// ─── Text normalisation ──────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "was", "are", "were", "has", "have",
  "had", "not", "but", "from", "his", "her", "its", "they", "them", "their", "there",
  "then", "than", "you", "your", "our", "who", "whom", "which", "what", "when",
  "where", "how", "why", "all", "any", "can", "did", "does", "done", "into", "over",
  "under", "out", "off", "per", "via", "about", "also", "been", "being", "both",
  "each", "more", "most", "such", "some", "only", "other", "same", "very", "will",
  "would", "should", "could", "may", "might", "must", "shall", "here",
]);

/**
 * Split text into normalised terms: lowercase alphanumeric tokens plus a light
 * plural strip so "labs"/"lab" and "results"/"result" collide.
 */
const tokenize = (text) => {
  if (!text) return [];

  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s./-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^[./-]+|[./-]+$/g, ""))
    .filter((token) => token.length >= 2 && token.length <= 40)
    .map((token) =>
      token.length > 4 && token.endsWith("s") && !token.endsWith("ss")
        ? token.slice(0, -1)
        : token
    );
};

/** 32-bit FNV-1a — fast, dependency-free, and stable across Node versions. */
const fnv1a = (str, seed = 0x811c9dc5) => {
  let hash = seed >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

// ─── Local provider ──────────────────────────────────────────────────────────

/**
 * Hash unigrams and bigrams into a fixed-width vector using signed hashing
 * (the "hashing trick"): each term maps to one bucket with a +1/-1 sign, so
 * collisions cancel out on average instead of always inflating a bucket.
 * Term weights use sub-linear TF (1 + ln(tf)), then the vector is L2-normalised
 * so the dot product equals cosine similarity.
 */
const embedTextLocally = (text) => {
  const vector = new Array(DIMENSIONS).fill(0);
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return vector;
  }

  const termFrequencies = new Map();
  const addTerm = (term) => {
    termFrequencies.set(term, (termFrequencies.get(term) || 0) + 1);
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!STOP_WORDS.has(token)) {
      addTerm(token);
    }
    if (i + 1 < tokens.length) {
      addTerm(`${token}_${tokens[i + 1]}`);
    }
  }

  for (const [term, frequency] of termFrequencies) {
    const bucketHash = fnv1a(term);
    const signHash = fnv1a(term, 0x9e3779b9);
    const bucket = bucketHash % DIMENSIONS;
    const sign = signHash % 2 === 0 ? 1 : -1;
    vector[bucket] += sign * (1 + Math.log(frequency));
  }

  let magnitude = 0;
  for (const component of vector) {
    magnitude += component * component;
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((component) => component / magnitude);
};

// ─── Bedrock proxy provider ──────────────────────────────────────────────────

/**
 * Resolve the embedding endpoint. Defaults to the /embed sibling of the
 * configured chat endpoint so a single BEDROCK_API_URL covers both.
 */
const resolveEmbeddingUrl = () => {
  if (config.embeddingApiUrl) return config.embeddingApiUrl;
  if (!config.bedrockApiUrl) return "";
  return config.bedrockApiUrl.replace(/\/chat\/?$/, "/embed");
};

const l2Normalize = (vector) => {
  let magnitude = 0;
  for (const component of vector) {
    magnitude += component * component;
  }
  magnitude = Math.sqrt(magnitude);
  return magnitude === 0 ? vector : vector.map((component) => component / magnitude);
};

/** Pull the embedding matrix out of the various shapes the proxy may return. */
const extractVectors = (payload) => {
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload?.embeddings,
    payload?.vectors,
    payload?.data,
    payload?.output?.embeddings,
    payload?.results,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || candidate.length === 0) continue;
    if (Array.isArray(candidate[0])) return candidate;
    // OpenAI-compatible shape: [{ embedding: [...] }]
    if (Array.isArray(candidate[0]?.embedding)) {
      return candidate.map((item) => item.embedding);
    }
  }

  return null;
};

const embedTextsViaBedrock = async (texts) => {
  const url = resolveEmbeddingUrl();
  const apiKey = config.bedrockApiKey;

  if (!url || !apiKey) {
    throw new APIError(
      "Embedding service is not configured — set EMBEDDING_API_URL/BEDROCK_API_KEY or use EMBEDDING_PROVIDER=local",
      503
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.embeddingTimeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model_id: config.embeddingModelId,
        texts,
        dimensions: DIMENSIONS,
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new APIError("Embedding service rate limit exceeded — please try again later", 429);
    }

    if (!response.ok) {
      logger.error("Embedding API returned non-OK status: %d", response.status);
      throw new APIError("Embedding service temporarily unavailable — try again shortly", 503);
    }

    const payload = await response.json();

    if (payload?.error) {
      logger.error("Embedding API error: %j", payload.error);
      throw new APIError(
        `Embedding service rejected the request (${payload.error.code || "unknown error"})`,
        503
      );
    }

    const vectors = extractVectors(payload);

    if (!vectors || vectors.length !== texts.length) {
      logger.error("Embedding API returned an unexpected shape: %j", Object.keys(payload || {}));
      throw new APIError("Embedding service returned an invalid response", 503);
    }

    for (const vector of vectors) {
      if (!Array.isArray(vector) || vector.length !== DIMENSIONS) {
        logger.error(
          "Embedding dimension mismatch: expected %d, received %s",
          DIMENSIONS,
          Array.isArray(vector) ? vector.length : typeof vector
        );
        throw new APIError(
          `Embedding dimension mismatch — model returned ${
            Array.isArray(vector) ? vector.length : "a non-vector"
          }, database expects ${DIMENSIONS}`,
          503
        );
      }
    }

    return vectors.map(l2Normalize);
  } catch (err) {
    if (err instanceof APIError) throw err;

    if (err.name === "AbortError") {
      logger.error("Embedding API request timed out after %dms", config.embeddingTimeoutMs);
      throw new APIError("Embedding service request timed out — try again shortly", 504);
    }

    logger.error("Embedding API request failed: %s", err.message);
    throw new APIError("Embedding service temporarily unavailable — try again shortly", 503);
  } finally {
    clearTimeout(timer);
  }
};

// ─── Public API ──────────────────────────────────────────────────────────────

const isRemoteProvider = () => config.embeddingProvider === "bedrock";

/** Identifier persisted alongside each chunk so stale vectors are traceable. */
const getEmbeddingModelName = () =>
  isRemoteProvider() ? `bedrock:${config.embeddingModelId}` : `local:hashed-lexical-v1`;

/**
 * Embed a batch of texts.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>} one L2-normalised vector per input, in order
 */
const embedTexts = async (texts) => {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  if (!isRemoteProvider()) {
    return texts.map(embedTextLocally);
  }

  const results = [];
  const batchSize = Math.max(1, config.embeddingBatchSize);

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    // eslint-disable-next-line no-await-in-loop -- provider rate limits favour sequential batches
    const vectors = await embedTextsViaBedrock(batch);
    results.push(...vectors);
  }

  return results;
};

/** Embed a single text. Convenience wrapper around {@link embedTexts}. */
const embedText = async (text) => {
  const [vector] = await embedTexts([text]);
  return vector;
};

/** Serialise a vector into the pgvector literal form: "[0.1,0.2,...]". */
const toVectorLiteral = (vector) => `[${vector.map((n) => Number(n).toFixed(8)).join(",")}]`;

module.exports = {
  embedText,
  embedTexts,
  toVectorLiteral,
  getEmbeddingModelName,
  isRemoteProvider,
  tokenize,
  DIMENSIONS,
};
