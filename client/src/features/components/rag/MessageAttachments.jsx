import { useState } from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';

import { ragService } from '../../services/ragService';
import { formatFileSize } from '../../services/documentsService';
import ResourceThumbnail from './ResourceThumbnail';

/**
 * Files sent with a chat message, rendered inside the bubble.
 *
 * Images become thumbnails that open a full-screen lightbox; everything else
 * (PDF, TXT) becomes a card that opens the file in a new tab.
 */

function FileCard({ chatId, resource }) {
  const [isOpening, setIsOpening] = useState(false);

  const openInNewTab = async () => {
    if (isOpening) return;

    // Claim the tab inside the click itself: fetching first would break the
    // user-gesture chain and the popup blocker would swallow the window.
    // No "noopener" here — with that feature set window.open returns null, and
    // there would be no handle to point at the blob once it arrives. The tab is
    // severed from this page manually instead.
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;

    setIsOpening(true);

    try {
      const url = await ragService.getChatResourceObjectUrl(chatId, resource.id);

      if (tab) {
        tab.location = url;
      } else {
        // Popup blocked. Never navigate the current tab — that would throw the
        // clinician out of the conversation; hand them the file as a download.
        const link = document.createElement('a');
        link.href = url;
        link.download = resource.original_filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      // The tab needs the blob alive long enough to render it.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('Could not open attachment:', err);
      tab?.close();
    } finally {
      setIsOpening(false);
    }
  };

  const size = formatFileSize(resource.file_size);

  // Both background states are opaque on purpose: this card sits inside the
  // blue user bubble, where a translucent or primary-tinted hover resolves to
  // the bubble's own colour and the card vanishes under the cursor.
  return (
    <button
      type="button"
      onClick={openInNewTab}
      title={`Open ${resource.original_filename} in a new tab`}
      className="group flex w-full max-w-[280px] items-center gap-2.5 rounded-lg border border-border bg-background p-2 text-left transition-colors hover:border-primary/50 hover:bg-secondary"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {isOpening ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-xs font-medium text-foreground">
          {resource.original_filename}
        </span>
        <span className="block font-sans text-[10px] text-muted-foreground">
          {resource.mime_type === 'application/pdf' ? 'PDF' : 'Document'}
          {size !== '—' && <span className="font-tnum"> · {size}</span>}
        </span>
      </span>
      <ExternalLink
        size={12}
        className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
      />
    </button>
  );
}

export default function MessageAttachments({ chatId, attachments, onOpenImage }) {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;

  const images = attachments.filter((file) => file.is_image);
  const documents = attachments.filter((file) => !file.is_image);

  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {images.map((file) => (
            <ResourceThumbnail
              key={file.id}
              chatId={chatId}
              resource={file}
              onClick={() => onOpenImage(file)}
            />
          ))}
        </div>
      )}

      {documents.map((file) => (
        <FileCard key={file.id} chatId={chatId} resource={file} />
      ))}
    </div>
  );
}
