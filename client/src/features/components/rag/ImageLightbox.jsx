import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, X } from 'lucide-react';

import { useResourceFileUrl } from '../../hooks/useResourceFileUrl';

/**
 * Full-screen viewer for an attached image.
 *
 * Rendered in a portal so it escapes the chat panel's `overflow-hidden`, and
 * dismissed by Escape, the close button, or a click on the backdrop — clicks on
 * the image itself are swallowed so panning around does not close it.
 */
export default function ImageLightbox({ chatId, resource, onClose }) {
  const { url, isLoading, error } = useResourceFileUrl(chatId, resource?.id, Boolean(resource));

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    // Freeze the page behind the overlay while it is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!resource) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={resource.original_filename}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex flex-col bg-black/85 backdrop-blur-sm"
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="truncate font-sans text-sm">{resource.original_filename}</p>
        <div className="flex shrink-0 items-center gap-1">
          {url && (
            <a
              href={url}
              download={resource.original_filename}
              title="Download"
              aria-label="Download image"
              className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download size={16} />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close image viewer"
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {isLoading && <Loader2 size={28} className="animate-spin text-white/70" />}

        {error && (
          <p className="font-sans text-sm text-white/70">This image could not be loaded.</p>
        )}

        {url && (
          <img
            src={url}
            alt={resource.original_filename}
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        )}
      </div>
    </div>,
    document.body
  );
}
