const config = require("../../config/env");

/**
 * Split extracted document text into overlapping, embedding-sized chunks.
 *
 * Chunks are grown from natural boundaries (paragraph → sentence → word) so a
 * retrieved chunk reads as coherent prose when it is shown to the clinician as
 * a citation, rather than starting and ending mid-word. Consecutive chunks
 * share a trailing overlap so a fact spanning a boundary is still retrievable.
 */

const MIN_CHUNK_CHARS = 40;

/** Split a paragraph into sentences, keeping the terminating punctuation. */
const splitSentences = (paragraph) => {
  const sentences = paragraph.match(/[^.!?\n]+(?:[.!?]+["')\]]*|\n|$)/g);
  return sentences ? sentences.map((s) => s.trim()).filter(Boolean) : [paragraph];
};

/** Hard-split a fragment that is longer than a whole chunk, on word boundaries. */
const splitLongFragment = (fragment, maxChars) => {
  const pieces = [];
  const words = fragment.split(/\s+/);
  let current = "";

  for (const word of words) {
    if (current && current.length + word.length + 1 > maxChars) {
      pieces.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
    // A single "word" longer than a chunk (e.g. a base64 blob) still has to yield.
    while (current.length > maxChars) {
      pieces.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }

  if (current) pieces.push(current);
  return pieces;
};

/** Take the trailing `overlapChars` of a chunk, rounded up to a word boundary. */
const takeOverlap = (chunk, overlapChars) => {
  if (overlapChars <= 0 || chunk.length <= overlapChars) return chunk;

  const tail = chunk.slice(chunk.length - overlapChars);
  const spaceIndex = tail.indexOf(" ");
  return spaceIndex === -1 ? tail : tail.slice(spaceIndex + 1);
};

/**
 * @param {string} text
 * @param {Object} [options]
 * @param {number} [options.maxChars]     — target chunk size (default RAG_CHUNK_SIZE)
 * @param {number} [options.overlapChars] — shared tail between chunks (default RAG_CHUNK_OVERLAP)
 * @returns {string[]} ordered, non-empty chunks
 */
const chunkText = (text, options = {}) => {
  const maxChars = Math.max(200, options.maxChars || config.ragChunkSize);
  const overlapChars = Math.max(0, Math.min(options.overlapChars ?? config.ragChunkOverlap, Math.floor(maxChars / 2)));

  const normalized = String(text || "").trim();
  if (!normalized) return [];

  // Break into the smallest units we are willing to keep intact.
  const fragments = [];
  for (const paragraph of normalized.split(/\n{2,}/)) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    if (trimmedParagraph.length <= maxChars) {
      fragments.push(trimmedParagraph);
      continue;
    }

    for (const sentence of splitSentences(trimmedParagraph)) {
      if (sentence.length <= maxChars) {
        fragments.push(sentence);
      } else {
        fragments.push(...splitLongFragment(sentence, maxChars));
      }
    }
  }

  const chunks = [];
  let current = "";

  for (const fragment of fragments) {
    const candidate = current ? `${current}\n${fragment}` : fragment;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);
    const overlap = current ? takeOverlap(current, overlapChars) : "";
    current = overlap ? `${overlap}\n${fragment}` : fragment;

    // The overlap may push an already-max-length fragment past the limit.
    while (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }

  if (current.trim()) chunks.push(current);

  // Fold a trailing sliver back into its predecessor rather than indexing noise.
  if (chunks.length > 1 && chunks[chunks.length - 1].length < MIN_CHUNK_CHARS) {
    const sliver = chunks.pop();
    chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}\n${sliver}`;
  }

  return chunks.map((chunk) => chunk.trim()).filter(Boolean);
};

module.exports = { chunkText };
