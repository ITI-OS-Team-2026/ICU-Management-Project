import api from '@/lib/api';

/**
 * RAG assistant API (backend: server/src/modules/rag).
 *
 * Deliberately separate from `aiService`, which owns the AI Summary feature —
 * the two features share no endpoints and no state.
 */
export const ragService = {
  /**
   * Ask a natural-language question (patient-scoped or knowledge-base only).
   * @param {string} [admissionId] — Required for "patient" mode, omit for "knowledge"
   * @param {string} question
   * @param {Object} [options]
   * @param {string} [options.mode] — "patient" (default, requires admissionId) or "knowledge" (medical knowledge only)
   * @param {boolean} [options.includeHistory] — let the model resolve pronouns (patient mode only)
   * @param {number} [options.topK] — number of document chunks to retrieve
   * @param {string} [options.chatId] — knowledge mode: continue this saved chat.
   *   Omit it to start a new one; the response carries the new `chat_id`.
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<Object>} `{ id, chat_id, ai_response, cited_sources, retrieval, created_at }`
   */
  async ask(admissionId, question, options = {}) {
    const mode = options.mode || 'patient';

    const payload = {
      question,
      mode,
      ...(mode === 'patient' ? { admission_id: admissionId } : {}),
      ...(mode === 'patient' ? { include_history: options.includeHistory ?? true } : {}),
      ...(mode === 'knowledge' && options.chatId ? { chat_id: options.chatId } : {}),
      ...(options.topK ? { top_k: options.topK } : {}),
    };

    const { data } = await api.post(
      '/rag/query',
      payload,
      { signal: options.signal }
    );
    return data?.data ?? data;
  },

  /** Conversation transcript for an admission, oldest first. */
  async getHistory(admissionId, limit = 30) {
    const { data } = await api.get(`/rag/admissions/${admissionId}/history`, {
      params: { limit },
    });
    return data?.data ?? [];
  },

  /** Permanently clear the conversation (the audit trail is untouched). */
  async clearHistory(admissionId) {
    const { data } = await api.delete(`/rag/admissions/${admissionId}/history`);
    return data;
  },

  // ── Saved assistant chats (knowledge mode) ────────────────────────────────
  // Personal to the signed-in clinician: the API only ever returns their own.

  /** All of the clinician's chats, most recently active first. */
  async listChats(limit = 100) {
    const { data } = await api.get('/rag/chats', { params: { limit } });
    return data?.data ?? [];
  },

  /** One chat with its full transcript. */
  async getChat(chatId) {
    const { data } = await api.get(`/rag/chats/${chatId}`);
    return data?.data ?? null;
  },

  /** Start an empty chat up front (asking without a chat_id also creates one). */
  async createChat(title) {
    const { data } = await api.post('/rag/chats', title ? { title } : {});
    return data?.data ?? null;
  },

  /** Rename a chat. */
  async renameChat(chatId, title) {
    const { data } = await api.patch(`/rag/chats/${chatId}`, { title });
    return data?.data ?? null;
  },

  /** Permanently delete one chat and its messages. */
  async deleteChat(chatId) {
    const { data } = await api.delete(`/rag/chats/${chatId}`);
    return data;
  },

  /** Permanently delete every chat this clinician owns. */
  async deleteAllChats() {
    const { data } = await api.delete('/rag/chats');
    return data;
  },

  // ── Chat resources ────────────────────────────────────────────────────────
  // Files attached to one chat. Only that chat can retrieve them, and deleting
  // the chat removes them from Cloudinary and the database.

  /** Files attached to a chat, with their indexing status. */
  async listChatResources(chatId) {
    const { data } = await api.get(`/rag/chats/${chatId}/resources`);
    return data?.data ?? [];
  },

  /**
   * Attach a file to a chat.
   * @param {string} chatId
   * @param {File} file — PDF, JPEG, PNG or TXT, max 10MB
   * @param {Object} [options]
   * @param {(percent: number) => void} [options.onProgress]
   * @param {AbortSignal} [options.signal]
   */
  async addChatResource(chatId, file, options = {}) {
    const form = new FormData();
    form.append('file', file);

    const { data } = await api.post(`/rag/chats/${chatId}/resources`, form, {
      // Let the browser set the multipart boundary.
      headers: { 'Content-Type': undefined },
      signal: options.signal,
      onUploadProgress: (event) => {
        if (!options.onProgress || !event.total) return;
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });

    return data?.data ?? null;
  },

  /**
   * The raw bytes of a resource, as an object URL for <img>, a lightbox or a
   * new tab. Fetched through axios so the session cookie and interceptors
   * apply — a bare <img src> would be a cross-site request without them.
   *
   * The caller owns the returned URL and must revokeObjectURL it.
   */
  async getChatResourceObjectUrl(chatId, documentId, options = {}) {
    const response = await api.get(`/rag/chats/${chatId}/resources/${documentId}/file`, {
      responseType: 'blob',
      signal: options.signal,
    });

    return URL.createObjectURL(response.data);
  },

  /** Detach one file and destroy the stored original. */
  async removeChatResource(chatId, documentId) {
    const { data } = await api.delete(`/rag/chats/${chatId}/resources/${documentId}`);
    return data;
  },

  /** Knowledge-base status: how many documents are indexed and searchable. */
  async getIndexStatus(admissionId) {
    const { data } = await api.get(`/rag/admissions/${admissionId}/index`);
    return data?.data ?? null;
  },

  /** Re-queue every pending/failed document for this admission. */
  async reindexAdmission(admissionId) {
    const { data } = await api.post(`/rag/admissions/${admissionId}/reindex`);
    return data;
  },

  /** Poll a single document's indexing progress. */
  async getDocumentStatus(documentId) {
    const { data } = await api.get(`/rag/documents/${documentId}/status`);
    return data?.data ?? null;
  },

  /** Force a fresh extract → chunk → embed cycle for one document. */
  async reindexDocument(documentId) {
    const { data } = await api.post(`/rag/documents/${documentId}/reindex`);
    return data?.data ?? data;
  },

  /** The exact chunks stored for a document — what the assistant can see. */
  async getDocumentChunks(documentId, limit = 50) {
    const { data } = await api.get(`/rag/documents/${documentId}/chunks`, {
      params: { limit },
    });
    return data?.data ?? null;
  },
};

/** Human-readable copy for each embedding lifecycle state. */
export const EMBEDDING_STATUS_META = {
  PENDING: {
    label: 'Queued',
    tone: 'muted',
    description: 'Waiting to be processed for AI search.',
  },
  PROCESSING: {
    label: 'Indexing',
    tone: 'info',
    description: 'Extracting text and generating embeddings.',
  },
  COMPLETED: {
    label: 'Searchable',
    tone: 'success',
    description: 'Indexed — the AI assistant can cite this document.',
  },
  SKIPPED: {
    label: 'No text',
    tone: 'warning',
    description: 'No machine-readable text (scanned images need OCR).',
  },
  FAILED: {
    label: 'Failed',
    tone: 'danger',
    description: 'Indexing failed. Retry to try again.',
  },
};

export function getEmbeddingStatusMeta(status) {
  return (
    EMBEDDING_STATUS_META[status] || {
      label: status || 'Unknown',
      tone: 'muted',
      description: '',
    }
  );
}

/**
 * Map an axios error from any RAG endpoint onto clinician-facing copy.
 * FR-3.1/FR-7.3: the assistant degrades gracefully and never blocks the rest
 * of the dashboard.
 */
export function describeRagError(err) {
  if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return null;

  const status = err?.response?.status;
  const serverMessage = err?.response?.data?.message;

  if (status === 503 || status === 504) {
    return 'AI assistant temporarily unavailable — try again shortly.';
  }
  if (status === 429) {
    return 'The AI service is rate limited right now. Please wait a moment and retry.';
  }
  if (status === 403) {
    return 'Your role does not have access to the AI assistant.';
  }
  if (status === 413) {
    return 'That file is larger than the 10MB limit.';
  }
  if (status === 415) {
    return serverMessage || 'Unsupported file type. Attach a PDF, JPEG, PNG or TXT file.';
  }
  if (status === 404) {
    return 'This admission could not be found.';
  }
  if (status === 400) {
    return serverMessage || 'That question could not be processed. Try rephrasing it.';
  }
  if (!err?.response) {
    return 'Could not reach the server. Check your connection and try again.';
  }

  return serverMessage || 'Something went wrong while contacting the AI assistant.';
}
