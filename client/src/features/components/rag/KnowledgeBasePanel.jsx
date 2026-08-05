import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  RefreshCcw,
  Loader2,
  FileText,
  Upload,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ragService, describeRagError } from '../../services/ragService';
import EmbeddingStatusBadge from './EmbeddingStatusBadge';

const POLL_INTERVAL_MS = 3000;

/**
 * Live view of what the RAG assistant can search for this admission.
 *
 * Polls while any document is still queued or indexing, so a clinician who has
 * just uploaded a report sees it become searchable without a manual refresh.
 */
export function KnowledgeBasePanel({ admissionId, canReindex = false, className = '' }) {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReindexing, setIsReindexing] = useState(false);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);

  const fetchStatus = useCallback(
    async ({ silent = false } = {}) => {
      if (!admissionId) return null;
      if (!silent) setIsLoading(true);

      try {
        const data = await ragService.getIndexStatus(admissionId);
        setStatus(data);
        setError(null);
        return data;
      } catch (err) {
        console.error('Failed to load RAG index status:', err);
        setError(describeRagError(err));
        return null;
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [admissionId]
  );

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll only while work is outstanding — an idle admission makes no requests.
  useEffect(() => {
    clearTimeout(timerRef.current);

    if (!status?.is_busy) return undefined;

    timerRef.current = setTimeout(() => fetchStatus({ silent: true }), POLL_INTERVAL_MS);
    return () => clearTimeout(timerRef.current);
  }, [status, fetchStatus]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleReindex = async () => {
    if (isReindexing) return;
    setIsReindexing(true);
    try {
      await ragService.reindexAdmission(admissionId);
      await fetchStatus({ silent: true });
    } catch (err) {
      console.error('Failed to re-index admission documents:', err);
      setError(describeRagError(err));
    } finally {
      setIsReindexing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`rounded-xl border border-border bg-card p-4 space-y-3 ${className}`}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  const counts = status?.counts || { total: 0 };
  const needsAttention = (counts.failed || 0) + (counts.pending || 0);
  const documentsPath = admissionId ? `/patients/${admissionId}/documents` : '#';

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Database size={14} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold text-foreground leading-tight">
              Knowledge Base
            </h3>
            <p className="font-sans text-[11px] text-muted-foreground truncate">
              {counts.total === 0
                ? 'No documents uploaded'
                : `${status.indexed_chunks} searchable passage${
                    status.indexed_chunks === 1 ? '' : 's'
                  } from ${counts.completed}/${counts.total} document${counts.total === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {canReindex && needsAttention > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleReindex}
            disabled={isReindexing}
            className="h-7 gap-1.5 text-[11px] font-sans shrink-0"
            title="Retry indexing for queued and failed documents"
          >
            {isReindexing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCcw size={12} />
            )}
            Retry {needsAttention}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 border-b border-border bg-destructive/5 px-4 py-2 text-[11px] font-sans text-destructive">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {counts.total === 0 ? (
        <div className="px-4 py-6 text-center">
          <FileText size={22} className="mx-auto mb-2 text-muted-foreground/40" />
          <p className="font-sans text-xs font-medium text-foreground">
            The assistant can only cite clinical records
          </p>
          <p className="font-sans text-[11px] text-muted-foreground mt-1 leading-relaxed">
            Upload consult notes, reports, or discharge letters to let it search their contents too.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 h-8 gap-1.5 text-[11px] font-sans"
            nativeButton={false}
            render={<Link to={documentsPath} className="flex items-center justify-center gap-1.5" />}
          >
            <Upload size={13} /> Upload a document
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border/60 max-h-64 overflow-y-auto">
          {status.documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-2.5 px-4 py-2.5">
              <FileText size={13} className="shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[12px] font-medium text-foreground truncate">
                  {doc.original_filename}
                </p>
                {doc.embedding_error && (
                  <p
                    className="font-sans text-[10px] text-muted-foreground truncate"
                    title={doc.embedding_error}
                  >
                    {doc.embedding_error}
                  </p>
                )}
              </div>
              <EmbeddingStatusBadge
                status={doc.embedding_status}
                chunkCount={doc.chunk_count}
                className="shrink-0"
              />
            </li>
          ))}
        </ul>
      )}

      {status?.embedding_provider && (
        <p className="border-t border-border px-4 py-2 font-sans text-[10px] text-muted-foreground truncate">
          Embeddings: <span className="font-mono">{status.embedding_provider}</span>
        </p>
      )}
    </div>
  );
}

export default KnowledgeBasePanel;
