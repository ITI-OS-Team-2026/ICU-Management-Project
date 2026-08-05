import { CheckCircle2, Clock, Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { getEmbeddingStatusMeta } from '../../services/ragService';

const TONE_CLASSES = {
  success: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400',
  info: 'text-sky-600 bg-sky-500/10 border-sky-500/30 dark:text-sky-400',
  warning: 'text-amber-600 bg-amber-500/10 border-amber-500/30 dark:text-amber-400',
  danger: 'text-destructive bg-destructive/10 border-destructive/30',
  muted: 'text-muted-foreground bg-muted border-border',
};

const TONE_ICONS = {
  success: CheckCircle2,
  info: Loader2,
  warning: AlertTriangle,
  danger: XCircle,
  muted: Clock,
};

/**
 * Compact indicator for a document's RAG indexing state.
 * Shown wherever a document appears so clinicians can tell at a glance whether
 * the AI assistant can actually cite it.
 */
export function EmbeddingStatusBadge({ status, chunkCount, className = '' }) {
  const meta = getEmbeddingStatusMeta(status);
  const Icon = TONE_ICONS[meta.tone] || Clock;
  const isSpinning = status === 'PROCESSING';

  return (
    <span
      title={meta.description}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold font-sans whitespace-nowrap ${
        TONE_CLASSES[meta.tone]
      } ${className}`}
    >
      <Icon size={11} className={isSpinning ? 'animate-spin' : ''} />
      {meta.label}
      {status === 'COMPLETED' && chunkCount > 0 && (
        <span className="font-tnum opacity-70">· {chunkCount}</span>
      )}
    </span>
  );
}

export default EmbeddingStatusBadge;
