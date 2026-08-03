/**
 * Text preparation for the voice agent's speech synthesis.
 *
 * Assistant answers are written to be *read*: they carry markdown emphasis,
 * bullet glyphs, bracketed citation markers and occasional URLs. Fed straight
 * to a speech engine those are pronounced literally ("asterisk asterisk",
 * "bracket one bracket", the whole of an https link), which makes a clinically
 * useful answer unlistenable. Everything here exists to turn the written answer
 * back into the sentence a person would have said.
 */

/** Longest utterance we hand to the engine in one go. */
const MAX_CHUNK_CHARS = 180;

/**
 * Strip the written-only scaffolding from an answer.
 *
 * @param {string} raw — assistant message text
 * @returns {string}   — plain prose, safe to speak
 */
export function toSpeakableText(raw) {
  if (!raw) return '';

  return (
    String(raw)
      // Fenced code blocks read as noise — announce them instead of spelling
      // out every brace and semicolon.
      .replace(/```[\s\S]*?```/g, ' (code block omitted) ')
      .replace(/`([^`]+)`/g, '$1')
      // Markdown links: keep the label, drop the target.
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
      // Bare URLs.
      .replace(/https?:\/\/\S+/g, ' link ')
      // Citation markers such as [1] or [2, 3] — visual affordances only.
      .replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '')
      // Emphasis and heading markers.
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s.,;:)!?]|$)/g, '$1$2')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      // Bullet and numbered list markers at the head of a line.
      .replace(/^\s*[-*+•]\s+/gm, '')
      .replace(/^\s*\d+[.)]\s+/gm, '')
      // Table separator rows carry no content at all.
      .replace(/^\s*\|?[\s:|-]{6,}\|?\s*$/gm, ' ')
      // A table row becomes a spoken list of its cells. The outer pipes go
      // first, or every row would open and close on a stray comma.
      .replace(/^\s*\|/gm, '')
      .replace(/\|\s*$/gm, '')
      .replace(/\|/g, ', ')
      // Collapse the whitespace all of the above leaves behind.
      .replace(/[ \t]+/g, ' ')
      // Removing an inline citation strands a space before the punctuation it
      // sat in front of, which some engines pronounce as a pause mid-sentence.
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/\n{2,}/g, '\n')
      .trim()
  );
}

/**
 * Split speakable text into utterance-sized pieces.
 *
 * Chrome silently truncates a single utterance after roughly fifteen seconds,
 * so a long answer must be queued as several short ones. Splitting on sentence
 * boundaries also gives `cancel()` a fine-grained stopping point, which is what
 * makes barge-in feel immediate rather than waiting out a paragraph.
 *
 * @param {string} text — output of {@link toSpeakableText}
 * @returns {string[]}  — non-empty chunks, in order
 */
export function chunkForSpeech(text) {
  const clean = String(text || '').trim();
  if (!clean) return [];

  // Sentence-ish boundaries: terminator followed by whitespace, plus newlines.
  const sentences = clean
    .split(/(?<=[.!?;:])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const sentence of sentences) {
    // A single sentence longer than the budget is split on word boundaries;
    // there is no punctuation left to split on.
    if (sentence.length > MAX_CHUNK_CHARS) {
      flush();
      let remainder = sentence;
      while (remainder.length > MAX_CHUNK_CHARS) {
        const cut = remainder.lastIndexOf(' ', MAX_CHUNK_CHARS);
        const at = cut > MAX_CHUNK_CHARS / 2 ? cut : MAX_CHUNK_CHARS;
        chunks.push(remainder.slice(0, at).trim());
        remainder = remainder.slice(at).trim();
      }
      current = remainder;
      continue;
    }

    if (current.length + sentence.length + 1 > MAX_CHUNK_CHARS) flush();
    current = current ? `${current} ${sentence}` : sentence;
  }

  flush();
  return chunks;
}
