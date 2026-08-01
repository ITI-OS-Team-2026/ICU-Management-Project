import { AlertTriangle, Check, FileText, Loader2, X } from 'lucide-react';

import { getEmbeddingStatusMeta } from '../../services/ragService';
import { formatFileSize } from '../../services/documentsService';
import ResourceThumbnail from './ResourceThumbnail';

/**
 * Staged attachments shown directly above the composer — the files that will go
 * out with the next question.
 *
 * Images preview as thumbnails, everything else as an icon card with filename
 * and size. Indexing runs after the upload, so each item also carries its own
 * state: the assistant can only quote a file once it reads "Searchable".
 */

function StatusLine({ resource }) {
  const meta = getEmbeddingStatusMeta(resource.embedding_status);
  const size = formatFileSize(resource.file_size);

  const Icon =
    resource.embedding_status === 'COMPLETED'
      ? Check
      : resource.embedding_status === 'FAILED' || resource.embedding_status === 'SKIPPED'
      ? AlertTriangle
      : Loader2;

  const tone =
    resource.embedding_status === 'COMPLETED'
      ? 'text-primary'
      : resource.embedding_status === 'FAILED' || resource.embedding_status === 'SKIPPED'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-muted-foreground';

  return (
    <p className="flex items-center gap-1 font-sans text-[9px] leading-tight text-muted-foreground">
      <Icon
        size={11}
        className={`shrink-0 ${tone} ${Icon === Loader2 ? 'animate-spin' : ''}`}
      />
      {meta.label}
      {size !== '—' && <span className="font-tnum">· {size}</span>}
    </p>
  );
}

function RemoveButton({ resource, onRemove, className = '' }) {
  return (
    <button
      type="button"
      onClick={() => onRemove(resource.id)}
      title="Remove this file"
      aria-label={`Remove ${resource.original_filename}`}
      className={`rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive ${className}`}
    >
      <X size={12} />
    </button>
  );
}

function StagedImage({ chatId, resource, onRemove }) {
  return (
    <div
      className="group relative"
      title={`${resource.original_filename} — ${getEmbeddingStatusMeta(resource.embedding_status).description}`}
    >
      <ResourceThumbnail chatId={chatId} resource={resource} />

      {/* Status rides on the thumbnail so the tile stays compact. */}
      <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/60 px-1 py-0.5 text-[8px] text-white">
        {resource.embedding_status === 'COMPLETED' ? (
          <Check size={9} className="shrink-0" />
        ) : resource.embedding_status === 'FAILED' || resource.embedding_status === 'SKIPPED' ? (
          <AlertTriangle size={9} className="shrink-0" />
        ) : (
          <Loader2 size={9} className="shrink-0 animate-spin" />
        )}
        <span className="truncate">{getEmbeddingStatusMeta(resource.embedding_status).label}</span>
      </span>

      <RemoveButton
        resource={resource}
        onRemove={onRemove}
        className="absolute -right-1.5 -top-1.5 rounded-full border border-border bg-background p-1 shadow-sm hover:bg-destructive/10"
      />
    </div>
  );
}

function StagedFile({ resource, onRemove }) {
  return (
    <div
      className="flex max-w-[240px] items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1"
      title={resource.embedding_error || getEmbeddingStatusMeta(resource.embedding_status).description}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <FileText size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[11px] leading-tight text-foreground">
          {resource.original_filename}
        </p>
        <StatusLine resource={resource} />
      </div>
      <RemoveButton resource={resource} onRemove={onRemove} className="shrink-0" />
    </div>
  );
}

export default function ChatResourceBar({ chatId, resources, uploadingFile, onRemove }) {
  if (resources.length === 0 && !uploadingFile) return null;

  return (
    <div className="mb-2 flex flex-wrap items-end gap-2">
      {resources.map((resource) =>
        resource.is_image ? (
          <StagedImage key={resource.id} chatId={chatId} resource={resource} onRemove={onRemove} />
        ) : (
          <StagedFile key={resource.id} resource={resource} onRemove={onRemove} />
        )
      )}

      {uploadingFile && (
        <div className="flex max-w-[240px] items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-2 py-1">
          <Loader2 size={12} className="shrink-0 animate-spin text-primary" />
          <div className="min-w-0">
            <p className="truncate font-sans text-[11px] leading-tight text-foreground">
              {uploadingFile.name}
            </p>
            <p className="font-sans text-[9px] leading-tight text-muted-foreground">
              Uploading <span className="font-tnum">{uploadingFile.progress}%</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
