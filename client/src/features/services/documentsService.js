import api from '@/lib/api';

export const documentsService = {
  /**
   * Upload a medical document. The server queues it for RAG indexing and
   * returns immediately with `embeddingStatus: 'PENDING'`.
   *
   * @param {string} admissionId
   * @param {File} file
   * @param {string} documentType
   * @param {Object} [options]
   * @param {(percent: number) => void} [options.onProgress] — 0-100 upload progress
   * @param {AbortSignal} [options.signal]
   */
  async uploadDocument(admissionId, file, documentType, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    const { data } = await api.post(`/admissions/${admissionId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options.signal,
      onUploadProgress: (event) => {
        if (!options.onProgress) return;
        const total = event.total || file.size;
        if (!total) return;
        options.onProgress(Math.min(100, Math.round((event.loaded * 100) / total)));
      },
    });

    return data.data;
  },

  async getDocuments(admissionId) {
    const { data } = await api.get(`/admissions/${admissionId}/documents`);
    return data.data || [];
  },

  async downloadDocument(docId, filename) {
    const response = await api.get(`/documents/${docId}/download`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'document');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async deleteDocument(docId) {
    await api.delete(`/documents/${docId}`);
  },
};

/** Bytes → a short human-readable size. */
export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Client-side guardrails mirroring the server's multer configuration. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_UPLOAD_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
];

/**
 * Validate a file before spending an upload round-trip on it.
 * @returns {string|null} an error message, or null when the file is acceptable
 */
export function validateUploadFile(file) {
  if (!file) return 'Please select a file to upload.';

  if (file.size > MAX_UPLOAD_BYTES) {
    return `"${file.name}" is ${formatFileSize(file.size)}. The limit is 10 MB.`;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  const extensionAllowed = ['pdf', 'jpg', 'jpeg', 'png', 'txt'].includes(extension);

  if (!ACCEPTED_UPLOAD_TYPES.includes(file.type) && !extensionAllowed) {
    return 'Unsupported file type. Upload a PDF, JPEG, PNG, or TXT file.';
  }

  return null;
}
