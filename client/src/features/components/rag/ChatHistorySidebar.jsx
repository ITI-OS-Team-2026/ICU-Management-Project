import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, MessageSquare, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

/**
 * Saved-chat rail for the Medical Knowledge Assistant: start a new chat, resume
 * an old one, rename it, or delete it. Grouped by recency the way clinicians
 * actually look for a conversation ("the one I had this morning").
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

/** Today / Yesterday / Previous 7 days / Older — evaluated per render. */
function groupChats(chats) {
  const today = startOfToday();
  const buckets = [
    { key: 'today', label: 'Today', chats: [] },
    { key: 'yesterday', label: 'Yesterday', chats: [] },
    { key: 'week', label: 'Previous 7 days', chats: [] },
    { key: 'older', label: 'Older', chats: [] },
  ];

  for (const chat of chats) {
    const stamp = new Date(chat.last_message_at || chat.created_at).getTime();

    if (Number.isNaN(stamp) || stamp >= today) buckets[0].chats.push(chat);
    else if (stamp >= today - DAY_MS) buckets[1].chats.push(chat);
    else if (stamp >= today - 7 * DAY_MS) buckets[2].chats.push(chat);
    else buckets[3].chats.push(chat);
  }

  return buckets.filter((bucket) => bucket.chats.length > 0);
}

function ChatRow({ chat, isActive, onSelect, onRename, onRequestDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const beginEdit = (event) => {
    event.stopPropagation();
    setDraft(chat.title);
    setIsEditing(true);
  };

  const commit = () => {
    const clean = draft.trim();
    setIsEditing(false);
    if (clean && clean !== chat.title) onRename(chat.id, clean);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-lg border border-primary/40 bg-background px-1.5 py-1">
        <Input
          ref={inputRef}
          value={draft}
          maxLength={120}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setIsEditing(false);
            }
          }}
          aria-label="Chat title"
          className="h-7 border-0 bg-transparent px-1 font-sans text-xs shadow-none focus-visible:ring-0"
        />
        <button
          type="button"
          onClick={commit}
          aria-label="Save title"
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary"
        >
          <Check size={13} />
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          aria-label="Cancel rename"
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded-lg pr-1 transition-colors ${
        isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/60'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(chat.id)}
        aria-current={isActive ? 'true' : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left"
      >
        <MessageSquare size={13} className="shrink-0 opacity-70" />
        <span className="truncate font-sans text-xs" title={chat.title}>
          {chat.title}
        </span>
      </button>

      {/* Always reachable on touch; unobtrusive until hover on pointer devices. */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={beginEdit}
          title="Rename chat"
          aria-label={`Rename chat: ${chat.title}`}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRequestDelete(chat);
          }}
          title="Delete chat"
          aria-label={`Delete chat: ${chat.title}`}
          className="rounded p-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export default function ChatHistorySidebar({
  chats,
  activeChatId,
  isLoading,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  onDeleteAll,
}) {
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return chats;
    return chats.filter((chat) => chat.title.toLowerCase().includes(term));
  }, [chats, search]);

  const groups = useMemo(() => groupChats(filtered), [filtered]);

  const confirmDelete = async () => {
    setIsDeleting(true);
    await onDelete(pendingDelete.id);
    setIsDeleting(false);
    setPendingDelete(null);
  };

  const confirmDeleteAll = async () => {
    setIsDeleting(true);
    await onDeleteAll();
    setIsDeleting(false);
    setShowDeleteAll(false);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <Button onClick={onNewChat} size="sm" className="w-full gap-1.5">
          <Plus size={14} />
          New chat
        </Button>

        {chats.length > 4 && (
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search chats"
              aria-label="Search saved chats"
              className="h-8 pl-7 font-sans text-xs"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2 p-1">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-5/6 rounded-lg" />
            <Skeleton className="h-8 w-4/6 rounded-lg" />
          </div>
        ) : chats.length === 0 ? (
          <p className="px-2 py-6 text-center font-sans text-[11px] leading-relaxed text-muted-foreground">
            No saved chats yet. Ask a question and this conversation is kept here so you can pick it
            up later.
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-6 text-center font-sans text-[11px] text-muted-foreground">
            No chats match “{search.trim()}”.
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.key}>
                <p className="px-2 pb-1 font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.chats.map((chat) => (
                    <ChatRow
                      key={chat.id}
                      chat={chat}
                      isActive={chat.id === activeChatId}
                      onSelect={onSelect}
                      onRename={onRename}
                      onRequestDelete={setPendingDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {chats.length > 0 && (
        <div className="shrink-0 border-t border-border p-2">
          <button
            type="button"
            onClick={() => setShowDeleteAll(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 font-sans text-[11px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 size={12} />
            Delete all chats
          </button>
        </div>
      )}

      {/* ── Delete one chat ──────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base font-bold">
              <Trash2 size={15} className="text-destructive" />
              Delete chat
            </DialogTitle>
            <DialogDescription className="pt-1 font-sans text-xs leading-relaxed">
              “{pendingDelete?.title}” and its messages will be permanently deleted. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              <Trash2 size={13} />
              Delete chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete every chat ────────────────────────────────────────────── */}
      <Dialog open={showDeleteAll} onOpenChange={(open) => !open && !isDeleting && setShowDeleteAll(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base font-bold">
              <Trash2 size={15} className="text-destructive" />
              Delete all chats
            </DialogTitle>
            <DialogDescription className="pt-1 font-sans text-xs leading-relaxed">
              All {chats.length} saved conversation{chats.length === 1 ? '' : 's'} with the Medical
              Knowledge Assistant will be permanently deleted. Patient AI chats are stored
              separately and are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteAll(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDeleteAll}
              disabled={isDeleting}
              className="gap-1.5"
            >
              <Trash2 size={13} />
              Delete all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
