import { useEffect, useState, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Upload,
  FileText,
  FileImage,
  File,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  FolderOpen,
  X,
  RefreshCcw,
  Eye,
  Database,
  CheckCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  documentsService,
  formatFileSize,
  validateUploadFile,
} from '../../services/documentsService';
import { ragService, describeRagError, getEmbeddingStatusMeta } from '../../services/ragService';
import EmbeddingStatusBadge from '../../components/rag/EmbeddingStatusBadge';
import { useAuthStore } from '../../store/authStore';
import api from '@/lib/api';

/* ================================================================
   Helpers
   ================================================================ */
function formatDocDate(value) {
  if (!value) return '—';
  try { return format(new Date(value), 'MMM d, HH:mm'); } catch { return '—'; }
}

// Map documentType string → badge color + label
const DOC_TYPE_META = {
  clinical:    { label: 'Clinical',    color: '#2563eb', bg: '#2563eb18' },
  imaging:     { label: 'Imaging',     color: '#7c3aed', bg: '#7c3aed18' },
  diagnostic:  { label: 'Diagnostic',  color: '#0891b2', bg: '#0891b218' },
  consent:     { label: 'Consent',     color: '#16a34a', bg: '#16a34a18' },
  lab:         { label: 'Lab',         color: '#ea580c', bg: '#ea580c18' },
  referral:    { label: 'Referral',    color: '#db2777', bg: '#db277718' },
  discharge:   { label: 'Discharge',   color: '#64748b', bg: '#64748b18' },
  other:       { label: 'Other',       color: '#6b7280', bg: '#6b728018' },
};

function getDocTypeMeta(type) {
  if (!type) return DOC_TYPE_META.other;
  const key = type.toLowerCase().replace(/\s+/g, '_');
  return DOC_TYPE_META[key] || { label: type, color: '#6b7280', bg: '#6b728018' };
}

// Icon based on filename extension
function DocIcon({ filename }) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return <FileImage size={18} />;
  }
  if (ext === 'pdf') {
    return <FileText size={18} />;
  }
  return <File size={18} />;
}

// Statuses that mean the RAG pipeline is still working on a document.
const IN_FLIGHT_STATUSES = ['PENDING', 'PROCESSING'];
const POLL_INTERVAL_MS = 3000;

/* ================================================================
   Document Row
   ================================================================ */
function DocumentRow({
  doc,
  canManage,
  onDelete,
  onDownload,
  onReindex,
  onInspect,
  onView,
  isDeleting,
  isReindexing,
  isDownloading,
}) {
  const meta = getDocTypeMeta(doc.documentType);
  const uploaderName = [doc.uploader?.firstName, doc.uploader?.lastName].filter(Boolean).join(' ') || 'Unknown';
  const statusMeta = getEmbeddingStatusMeta(doc.embeddingStatus);
  // SKIPPED = permanent (no text in image, e.g. X-ray). Retrying will never help.
  // FAILED / PENDING = transient / queued. Can be retried.
  // COMPLETED docs can also be re-indexed (e.g. after a code fix).
  const canRetry = canManage && ['FAILED', 'PENDING', 'COMPLETED'].includes(doc.embeddingStatus);
  const canInspect = canManage && doc.embeddingStatus === 'COMPLETED' && doc.chunkCount > 0;

  return (
    <div className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-4 px-4 py-3.5">
        {/* File icon */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: meta.bg, color: meta.color }}
        >
          <DocIcon filename={doc.originalFilename} />
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm font-semibold text-foreground leading-tight truncate">
            {doc.originalFilename}
          </p>
          <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
            {uploaderName} · {formatDocDate(doc.createdAt)}
            {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ''}
          </p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* AI indexing state */}
          <EmbeddingStatusBadge status={doc.embeddingStatus} chunkCount={doc.chunkCount} />

          {/* Type badge */}
          <span
            className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ color: meta.color, backgroundColor: meta.bg }}
          >
            {meta.label}
          </span>

          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
            onClick={() => onView(doc)}
            title="View file"
            aria-label={`View ${doc.originalFilename}`}
          >
            <Eye size={15} />
          </Button>

          {canInspect && (
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
              onClick={() => onInspect(doc)}
              title="View the indexed passages the AI can cite"
              aria-label={`View indexed passages for ${doc.originalFilename}`}
            >
              <Database size={15} />
            </Button>
          )}

          {canRetry && (
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onReindex(doc)}
              disabled={isReindexing}
              title="Retry AI indexing"
              aria-label={`Retry AI indexing for ${doc.originalFilename}`}
            >
              {isReindexing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={15} />}
            </Button>
          )}

          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
            onClick={() => onDownload(doc)}
            disabled={isDownloading}
            title="Download"
            aria-label={`Download ${doc.originalFilename}`}
          >
            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={15} />}
          </Button>

          {canManage && (
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
              onClick={() => onDelete(doc)}
              disabled={isDeleting}
              title="Delete"
              aria-label={`Delete ${doc.originalFilename}`}
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}
            </Button>
          )}
        </div>
      </div>

      {/* Explanation row — shown whenever there is relevant context below the row */}
      {doc.embeddingStatus === 'SKIPPED' && (
        <p className="px-4 pb-3 -mt-1 pl-[68px] font-sans text-[11px] text-amber-600 dark:text-amber-400">
          <span className="font-semibold">Not AI-searchable · </span>
          {doc.embeddingError
            ? doc.embeddingError
            : 'No readable text was found in this file. X-rays, scans, and photos are stored but cannot be searched by the AI assistant.'}
        </p>
      )}
      {doc.embeddingStatus === 'FAILED' && doc.embeddingError && (
        <p className="px-4 pb-3 -mt-1 pl-[68px] font-sans text-[11px] text-muted-foreground">
          <span className="font-semibold">Failed: </span>{doc.embeddingError}
        </p>
      )}
    </div>
  );
}

/* ================================================================
   Skeleton
   ================================================================ */
function DocSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border/60 last:border-0">
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   Upload Dialog
   ================================================================ */
const DOCUMENT_TYPES = [
  'Clinical', 'Imaging', 'Diagnostic', 'Consent', 'Lab', 'Referral', 'Discharge', 'Other'
];

function UploadDialog({ open, onClose, onUploaded, admissionId }) {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('Clinical');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const reset = () => {
    setFile(null);
    setDocType('Clinical');
    setError('');
    setProgress(0);
  };

  const handleClose = () => {
    if (isUploading) return;
    reset();
    onClose();
  };

  const selectFile = (selected) => {
    if (!selected) return;
    const validationError = validateUploadFile(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(selected);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    selectFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file to upload.'); return; }

    try {
      setIsUploading(true);
      setError('');
      setProgress(0);

      await documentsService.uploadDocument(admissionId, file, docType.toLowerCase(), {
        onProgress: setProgress,
      });

      onUploaded();
      reset();
      onClose();
    } catch (err) {
      console.error('Document upload failed:', err);
      const status = err?.response?.status;
      if (status === 413) {
        setError('That file exceeds the 10 MB limit.');
      } else if (status === 415) {
        setError('Unsupported file type. Upload a PDF, JPEG, PNG, or TXT file.');
      } else if (status === 409) {
        setError('Documents can only be added to an active admission.');
      } else {
        setError(err?.response?.data?.message || 'Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Upload size={18} className="text-primary" />
            Upload Document
          </DialogTitle>
          <DialogDescription className="font-sans text-xs text-muted-foreground">
            PDFs and text files are indexed automatically so the AI assistant can cite them.
            Images that contain printed or typed text (e.g. scanned forms, lab reports) are
            also indexed via OCR. X-rays, scans, and photos are stored but{' '}
            <span className="font-semibold text-amber-600 dark:text-amber-400">cannot be searched by the AI</span>
            {' '}— they contain no text for the assistant to read.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Drop zone */}
          <div
            className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {file ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText size={20} />
                </div>
                <p className="font-sans text-sm font-semibold text-foreground break-all">{file.name}</p>
                <p className="font-sans text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                {!isUploading && (
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    aria-label="Remove selected file"
                  >
                    <X size={12} />
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Upload size={20} />
                </div>
                <div>
                  <p className="font-sans text-sm font-semibold text-foreground">Click to select or drag & drop</p>
                  <p className="font-sans text-xs text-muted-foreground mt-0.5">PDF, JPEG, PNG, TXT — max 10 MB</p>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.txt"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => selectFile(e.target.files?.[0])}
            />
          </div>

          {/* Document type */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Document Type
            </Label>
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_TYPES.map(type => {
                const meta = getDocTypeMeta(type);
                const isSelected = docType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={isUploading}
                    onClick={() => setDocType(type)}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all disabled:opacity-60"
                    style={{
                      color: isSelected ? '#fff' : meta.color,
                      backgroundColor: isSelected ? meta.color : meta.bg,
                      borderColor: meta.color + '40',
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-sans text-[11px] text-muted-foreground">
                <span>{progress < 100 ? 'Uploading…' : 'Queuing for AI indexing…'}</span>
                <span className="font-tnum">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle size={14} />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !file} className="min-w-[110px] gap-1.5">
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {isUploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================
   Indexed passages dialog
   ================================================================ */
function ChunkInspectorDialog({ doc, onClose }) {
  const [state, setState] = useState({ isLoading: true, chunks: [], error: null });

  useEffect(() => {
    if (!doc) return undefined;

    let cancelled = false;
    setState({ isLoading: true, chunks: [], error: null });

    ragService
      .getDocumentChunks(doc.id)
      .then((data) => {
        if (!cancelled) setState({ isLoading: false, chunks: data?.chunks || [], error: null });
      })
      .catch((err) => {
        console.error('Failed to load document chunks:', err);
        if (!cancelled) setState({ isLoading: false, chunks: [], error: describeRagError(err) });
      });

    return () => { cancelled = true; };
  }, [doc]);

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-bold flex items-center gap-2">
            <Database size={15} className="text-primary" />
            Indexed passages
          </DialogTitle>
          <DialogDescription className="font-sans text-xs break-all">
            Exactly what the AI assistant can retrieve and cite from{' '}
            <span className="font-semibold">{doc?.originalFilename}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto space-y-2.5 pr-1">
          {state.isLoading ? (
            <>
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </>
          ) : state.error ? (
            <Alert variant="destructive" className="py-2">
              <AlertCircle size={14} />
              <AlertDescription className="text-xs">{state.error}</AlertDescription>
            </Alert>
          ) : state.chunks.length === 0 ? (
            <p className="py-6 text-center font-sans text-xs text-muted-foreground">
              No indexed passages for this document.
            </p>
          ) : (
            state.chunks.map((chunk) => (
              <div key={chunk.id} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="mb-1.5 flex items-center justify-between font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Passage {chunk.chunk_index + 1}</span>
                  <span className="font-tnum">{chunk.char_count} chars</span>
                </div>
                <p className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-foreground">
                  {chunk.chunk_text}
                </p>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================
   Main Page
   ================================================================ */
export default function PatientDocumentsPage() {
  const { admission } = useOutletContext();
  const user = useAuthStore((s) => s.user);

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [reindexingId, setReindexingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);
  const [inspectingDoc, setInspectingDoc] = useState(null);

  const pollRef = useRef(null);

  const canManage = user?.role === 'ICU_SPECIALIST' || user?.role === 'MEDICAL_RESIDENT';

  const fetchDocuments = useCallback(async ({ silent = false } = {}) => {
    if (!admission?.id) return [];
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const data = await documentsService.getDocuments(admission.id);
      setDocuments(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents. Please try again.');
      return [];
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [admission?.id]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // Poll only while at least one document is still being indexed, so a freshly
  // uploaded file flips to "Searchable" without a manual refresh.
  useEffect(() => {
    clearTimeout(pollRef.current);

    const isBusy = documents.some((doc) => IN_FLIGHT_STATUSES.includes(doc.embeddingStatus));
    if (!isBusy) return undefined;

    pollRef.current = setTimeout(() => fetchDocuments({ silent: true }), POLL_INTERVAL_MS);
    return () => clearTimeout(pollRef.current);
  }, [documents, fetchDocuments]);

  useEffect(() => () => clearTimeout(pollRef.current), []);

  const flashNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete || deletingId) return;
    const target = docToDelete;

    try {
      setDeletingId(target.id);
      setActionError(null);
      await documentsService.deleteDocument(target.id);
      setDocuments(prev => prev.filter(d => d.id !== target.id));
      setDocToDelete(null);
      flashNotice(`"${target.originalFilename}" was deleted.`);
    } catch (err) {
      console.error('Failed to delete document:', err);
      if (err?.response?.status === 404) {
        setDocuments(prev => prev.filter(d => d.id !== target.id));
        setDocToDelete(null);
        flashNotice(`"${target.originalFilename}" was already deleted.`);
      } else {
        setActionError(err?.response?.data?.message || 'Failed to delete the document. Please try again.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc) => {
    try {
      setDownloadingId(doc.id);
      setActionError(null);
      await documentsService.downloadDocument(doc.id, doc.originalFilename);
    } catch (err) {
      console.error('Download failed:', err);
      setActionError(
        err?.response?.status === 404
          ? 'The file is no longer available on the server.'
          : 'Download failed. Please try again.'
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (doc) => {
    try {
      setActionError(null);
      const response = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to view document:', err);
      setActionError('Failed to display file in browser.');
    }
  };

  const handleReindex = async (doc) => {
    if (reindexingId) return;
    try {
      setReindexingId(doc.id);
      setActionError(null);
      const updated = await ragService.reindexDocument(doc.id);
      await fetchDocuments({ silent: true });
      flashNotice(
        updated?.embedding_status === 'COMPLETED'
          ? `"${doc.originalFilename}" is now searchable (${updated.chunk_count} passages).`
          : updated?.embedding_error || 'Indexing finished.'
      );
    } catch (err) {
      console.error('Re-index failed:', err);
      setActionError(describeRagError(err));
    } finally {
      setReindexingId(null);
    }
  };

  // Unique types for filter tabs
  const allTypes = ['all', ...new Set(documents.map(d => d.documentType?.toLowerCase()))].filter(Boolean);
  const filtered = filter === 'all' ? documents : documents.filter(d => d.documentType?.toLowerCase() === filter);

  const searchableCount = documents.filter(d => d.embeddingStatus === 'COMPLETED').length;
  const skippedCount = documents.filter(d => d.embeddingStatus === 'SKIPPED').length;
  const indexingCount = documents.filter(d => IN_FLIGHT_STATUSES.includes(d.embeddingStatus)).length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-5 pb-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Patient Documents</h2>
          <p className="font-sans text-sm text-muted-foreground mt-0.5">
            {documents.length > 0 ? (
              <>
                {documents.length} document{documents.length !== 1 ? 's' : ''}
                {' · '}
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {searchableCount} AI-searchable
                </span>
                {skippedCount > 0 && (
                  <>
                    {' · '}
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {skippedCount} not AI-searchable
                    </span>
                  </>
                )}
              </>
            ) : 'No documents uploaded yet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 font-sans text-xs"
            onClick={() => fetchDocuments()}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="gap-1.5 font-sans text-xs"
            onClick={() => setShowUpload(true)}
          >
            <Upload size={14} />
            Upload
          </Button>
        </div>
      </div>

      {/* ── Indexing banner ─────────────────────────────────────────── */}
      {indexingCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3.5 py-2.5">
          <Loader2 size={14} className="animate-spin text-sky-600 dark:text-sky-400 shrink-0" />
          <p className="font-sans text-xs text-foreground">
            Indexing {indexingCount} document{indexingCount === 1 ? '' : 's'} for AI search — this
            page updates automatically when they become searchable.
          </p>
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2.5">
          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="font-sans text-xs text-foreground">{notice}</p>
        </div>
      )}

      {actionError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle size={14} />
          <AlertDescription className="flex items-center justify-between gap-2 text-xs">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="shrink-0 underline underline-offset-2">
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Type Filter Tabs ────────────────────────────────────────── */}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTypes.map(type => {
            const meta = type === 'all' ? { label: 'All', color: '#64748b', bg: '#64748b15' } : getDocTypeMeta(type);
            const isActive = filter === type;
            const count = type === 'all' ? documents.length : documents.filter(d => d.documentType?.toLowerCase() === type).length;
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={{
                  color: isActive ? '#fff' : meta.color,
                  backgroundColor: isActive ? meta.color : meta.bg,
                  borderColor: meta.color + '40',
                }}
              >
                {meta.label}
                <span
                  className="inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[16px] h-4 px-1"
                  style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : meta.color + '25', color: isActive ? '#fff' : meta.color }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <DocSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive opacity-60" />
          <p className="font-sans text-sm font-medium text-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchDocuments()}>Try Again</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-xl border border-dashed border-border bg-muted/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground/50">
            <FolderOpen size={26} />
          </div>
          <div>
            <p className="font-sans text-sm font-semibold text-foreground">
              {filter === 'all' ? 'No documents uploaded yet' : `No ${getDocTypeMeta(filter).label} documents`}
            </p>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              Upload clinical reports, imaging, consent forms, and more — text documents become
              searchable by the AI assistant automatically.
            </p>
          </div>
          <Button size="sm" className="gap-1.5 font-sans text-xs mt-1" onClick={() => setShowUpload(true)}>
            <Upload size={13} /> Upload Document
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {filtered.map(doc => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              canManage={canManage}
              onDelete={setDocToDelete}
              onDownload={handleDownload}
              onReindex={handleReindex}
              onInspect={setInspectingDoc}
              onView={handleView}
              isDeleting={deletingId === doc.id}
              isReindexing={reindexingId === doc.id}
              isDownloading={downloadingId === doc.id}
            />
          ))}
        </div>
      )}

      {/* ── Upload Dialog ────────────────────────────────────────────── */}
      <UploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={() => fetchDocuments({ silent: true })}
        admissionId={admission?.id}
      />

      {/* ── Indexed passages ─────────────────────────────────────────── */}
      <ChunkInspectorDialog doc={inspectingDoc} onClose={() => setInspectingDoc(null)} />

      {/* ── Delete confirmation ──────────────────────────────────────── */}
      <Dialog open={!!docToDelete} onOpenChange={(open) => !open && !deletingId && setDocToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base font-bold">
              <Trash2 size={15} className="text-destructive" />
              Delete document
            </DialogTitle>
            <DialogDescription className="pt-1 font-sans text-xs leading-relaxed break-all">
              "{docToDelete?.originalFilename}" will be archived and removed from the AI assistant's
              searchable knowledge base. Clinical records are never permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDocToDelete(null)} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={!!deletingId}
              className="gap-1.5"
            >
              {deletingId ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
