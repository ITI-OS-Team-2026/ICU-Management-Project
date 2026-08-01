import { FileText, ImageIcon, Loader2 } from 'lucide-react';

import { useResourceFileUrl } from '../../hooks/useResourceFileUrl';

/**
 * The square image preview used both above the composer and inside a sent
 * message. Falls back to an icon tile while the bytes are in flight or when the
 * file cannot be read, so layout never jumps.
 */
export default function ResourceThumbnail({ chatId, resource, size = 'md', onClick }) {
  const { url, isLoading, error } = useResourceFileUrl(chatId, resource.id, resource.is_image);

  const box = size === 'sm' ? 'h-10 w-10' : 'h-20 w-20';
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      {...(onClick
        ? {
            type: 'button',
            onClick,
            title: `Open ${resource.original_filename}`,
            'aria-label': `Open ${resource.original_filename} full screen`,
          }
        : {})}
      className={`${box} relative shrink-0 overflow-hidden rounded-lg border border-border bg-muted ${
        onClick ? 'transition-opacity hover:opacity-90' : ''
      }`}
    >
      {url ? (
        <img
          src={url}
          alt={resource.original_filename}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
          {isLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : error ? (
            <FileText size={14} />
          ) : (
            <ImageIcon size={14} />
          )}
        </span>
      )}
    </Wrapper>
  );
}
