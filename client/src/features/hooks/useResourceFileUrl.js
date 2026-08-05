import { useEffect, useState } from 'react';
import { ragService } from '../services/ragService';

/**
 * Object URL for a chat resource's bytes.
 *
 * The file lives behind a cookie-authenticated endpoint, so it cannot be used
 * as a plain `<img src>` — it is fetched once and cached per document id, then
 * shared by every consumer (thumbnail in the transcript, the lightbox, the
 * "open PDF" button) rather than downloading the same file three times.
 *
 * Entries are reference-counted and revoked when the last consumer unmounts, so
 * a long chat session does not leak blobs.
 */

const cache = new Map(); // documentId -> { url, promise, refs }

function acquire(chatId, documentId) {
  let entry = cache.get(documentId);

  if (!entry) {
    entry = { url: null, refs: 0, promise: null };
    entry.promise = ragService
      .getChatResourceObjectUrl(chatId, documentId)
      .then((url) => {
        // Nobody is waiting any more — do not strand the blob in memory.
        if (entry.refs === 0) {
          URL.revokeObjectURL(url);
          cache.delete(documentId);
          return null;
        }
        entry.url = url;
        return url;
      })
      .catch((err) => {
        cache.delete(documentId);
        throw err;
      });
    cache.set(documentId, entry);
  }

  entry.refs += 1;
  return entry;
}

function release(documentId) {
  const entry = cache.get(documentId);
  if (!entry) return;

  entry.refs -= 1;
  if (entry.refs > 0) return;

  if (entry.url) URL.revokeObjectURL(entry.url);
  cache.delete(documentId);
}

/**
 * @param {string} chatId
 * @param {string} documentId
 * @param {boolean} [enabled] — skip the fetch entirely when false
 * @returns {{ url: string|null, isLoading: boolean, error: boolean }}
 */
export function useResourceFileUrl(chatId, documentId, enabled = true) {
  // Both pieces of state carry the id they belong to, so a hook instance reused
  // for a different document never renders the previous one's blob.
  const [resolved, setResolved] = useState(null); // { id, url }
  const [failed, setFailed] = useState(null); // id

  useEffect(() => {
    if (!enabled || !chatId || !documentId) return undefined;

    let active = true;
    const entry = acquire(chatId, documentId);

    // Timeout: if the blob isn't loaded in 10s, give up and show an error rather
    // than loading infinitely (upload may have failed or the resource row doesn't exist).
    const timeout = setTimeout(() => {
      if (active) setFailed(documentId);
    }, 10_000);

    // Always go through the promise — already-cached entries resolve on the
    // microtask queue, which keeps this effect free of synchronous setState.
    entry.promise
      .then((url) => {
        clearTimeout(timeout);
        if (active && url) setResolved({ id: documentId, url });
      })
      .catch(() => {
        clearTimeout(timeout);
        if (active) setFailed(documentId);
      });

    return () => {
      active = false;
      clearTimeout(timeout);
      release(documentId);
    };
  }, [chatId, documentId, enabled]);

  const url = resolved?.id === documentId ? resolved.url : cache.get(documentId)?.url ?? null;
  const error = failed === documentId;

  return { url, isLoading: enabled && !url && !error, error };
}
