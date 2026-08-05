import { useCallback, useEffect, useRef, useState } from 'react';
import { ragService, describeRagError } from '../services/ragService';
import { validateUploadFile } from '../services/documentsService';

/**
 * Saved conversations with the Medical Knowledge Assistant.
 *
 * Mirrors how ChatGPT/Claude behave: a sidebar of past chats, one active
 * transcript, and a "new chat" that stays local until the first question is
 * answered — the server creates the row and hands back its `chat_id`, so an
 * abandoned empty chat never litters the list.
 *
 * Messages are render-ready:
 *   { id, role: 'user' | 'assistant', text, citations, retrieval, createdAt, isError }
 */

let localIdCounter = 0;
const nextLocalId = () => `local-${Date.now()}-${(localIdCounter += 1)}`;

/** Persisted ai_chat_messages row → render-ready message. */
const toMessage = (row) => ({
  id: row.id,
  role: row.role,
  text: row.content,
  citations: Array.isArray(row.cited_sources) ? row.cited_sources : [],
  retrieval: row.retrieval || null,
  attachments: Array.isArray(row.attachments) ? row.attachments : [],
  createdAt: row.created_at,
});

export function useKnowledgeChats() {
  const [chats, setChats] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);

  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [isAsking, setIsAsking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState(null);

  // Files attached to the active chat, plus the one currently uploading.
  const [resources, setResources] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(null);

  const abortRef = useRef(null);
  // Answers land asynchronously; ignore one that arrives after the clinician
  // has already switched to a different chat.
  const activeChatRef = useRef(null);

  const setActive = useCallback((chatId) => {
    activeChatRef.current = chatId;
    setActiveChatId(chatId);
  }, []);

  // ── Chat list ─────────────────────────────────────────────────────────────

  const loadChats = useCallback(async () => {
    setIsLoadingChats(true);
    try {
      setChats(await ragService.listChats());
    } catch (err) {
      console.error('Failed to load saved chats:', err);
      setError(describeRagError(err));
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      abortRef.current = null;
    },
    []
  );

  // A live counter beats a spinner that looks frozen: answers take 5-15s.
  useEffect(() => {
    if (!isAsking) return undefined;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isAsking]);

  // ── Navigation ────────────────────────────────────────────────────────────

  /** Start a blank chat. Nothing is persisted until the first answer arrives. */
  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setActive(null);
    setMessages([]);
    setResources([]);
    setError(null);
  }, [setActive]);

  const openChat = useCallback(
    async (chatId) => {
      if (!chatId || chatId === activeChatRef.current) return;

      abortRef.current?.abort();
      abortRef.current = null;

      setActive(chatId);
      setMessages([]);
      setResources([]);
      setError(null);
      setIsLoadingMessages(true);

      try {
        const [chat, files] = await Promise.all([
          ragService.getChat(chatId),
          ragService.listChatResources(chatId),
        ]);
        if (activeChatRef.current !== chatId) return;
        setMessages((chat?.messages ?? []).map(toMessage));
        setResources(files);
      } catch (err) {
        console.error('Failed to open chat:', err);
        if (activeChatRef.current !== chatId) return;
        setError(describeRagError(err));
      } finally {
        if (activeChatRef.current === chatId) setIsLoadingMessages(false);
      }
    },
    [setActive]
  );

  // ── Resources ─────────────────────────────────────────────────────────────

  /**
   * Attach a file to the active chat. A chat that has not been saved yet is
   * created first — the attachment needs something to belong to, and the
   * clinician's intent to keep this conversation is already clear.
   */
  const attachResource = useCallback(
    async (file) => {
      if (!file || uploadingFile) return null;

      // Reject oversized/unsupported files here rather than spending an upload
      // round-trip to be told the same thing.
      const validationError = validateUploadFile(file);
      if (validationError) {
        setError(validationError);
        return null;
      }

      setError(null);
      setUploadingFile({ name: file.name, progress: 0 });

      try {
        let chatId = activeChatRef.current;

        if (!chatId) {
          const chat = await ragService.createChat();
          chatId = chat.id;
          setActive(chatId);
          loadChats();
        }

        const resource = await ragService.addChatResource(chatId, file, {
          onProgress: (progress) => setUploadingFile((prev) => (prev ? { ...prev, progress } : prev)),
        });

        if (activeChatRef.current === chatId) {
          setResources((prev) => [...prev, resource]);
        }
        return resource;
      } catch (err) {
        console.error('Failed to attach resource:', err);
        setError(describeRagError(err));
        return null;
      } finally {
        setUploadingFile(null);
      }
    },
    [uploadingFile, setActive, loadChats]
  );

  const removeResource = useCallback(async (documentId) => {
    const chatId = activeChatRef.current;
    if (!chatId || !documentId) return false;

    const previous = resources;
    setResources((prev) => prev.filter((r) => r.id !== documentId));

    try {
      await ragService.removeChatResource(chatId, documentId);
      return true;
    } catch (err) {
      console.error('Failed to remove resource:', err);
      setResources(previous);
      setError(describeRagError(err));
      return false;
    }
  }, [resources]);

  // Indexing runs out of band, so poll while anything is still being processed.
  // FAILED and SKIPPED are terminal — the file simply is not searchable, which
  // is no reason to hold the clinician's question back.
  const isPreparing = (resource) =>
    resource.embedding_status === 'PENDING' || resource.embedding_status === 'PROCESSING';

  const hasPendingResource = resources.some(isPreparing);

  useEffect(() => {
    if (!hasPendingResource || !activeChatId) return undefined;

    const interval = setInterval(async () => {
      try {
        const files = await ragService.listChatResources(activeChatId);
        if (activeChatRef.current === activeChatId) setResources(files);
      } catch (err) {
        console.error('Failed to refresh resource status:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [hasPendingResource, activeChatId]);

  // ── Asking ────────────────────────────────────────────────────────────────

  const ask = useCallback(
    async (rawQuestion) => {
      const question = String(rawQuestion || '').trim();
      if (!question || isAsking) return null;

      const chatId = activeChatRef.current;
      const pendingId = nextLocalId();
      // Files still sitting in the composer go out with this message; the server
      // binds them to it, and the optimistic bubble shows them straight away.
      const staged = resources.filter((resource) => !resource.message_id);

      setError(null);
      setElapsedSeconds(0);
      setIsAsking(true);
      setMessages((prev) => [
        ...prev,
        {
          id: pendingId,
          role: 'user',
          text: question,
          attachments: staged,
          createdAt: new Date().toISOString(),
        },
      ]);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await ragService.ask(null, question, {
          mode: 'knowledge',
          chatId: chatId || undefined,
          signal: controller.signal,
        });

        // The answer belongs to the chat it was asked in — if the clinician has
        // since navigated away, persist it silently and leave the view alone.
        const stillActive = activeChatRef.current === chatId;

        if (stillActive) {
          if (!chatId && result.chat_id) setActive(result.chat_id);

          setMessages((prev) => [
            // Adopt the server's id for the optimistic bubble so files bound to
            // that message resolve against the live resource list below.
            ...prev.map((message) =>
              message.id === pendingId && result.user_message_id
                ? { ...message, id: result.user_message_id }
                : message
            ),
            {
              id: result.id || nextLocalId(),
              role: 'assistant',
              text: result.ai_response,
              citations: Array.isArray(result.cited_sources) ? result.cited_sources : [],
              retrieval: result.retrieval,
              createdAt: result.created_at || new Date().toISOString(),
            },
          ]);
        }

        // Staged files are now bound to the message that sent them, which is
        // what moves them out of the composer and into the transcript. Refresh
        // whenever the chat holds any file, not just what this send staged —
        // an upload that landed mid-request is bound server-side too.
        if (resources.length > 0 && activeChatRef.current) {
          ragService
            .listChatResources(activeChatRef.current)
            .then((files) => {
              if (activeChatRef.current === chatId || !chatId) setResources(files);
            })
            .catch((err) => console.error('Failed to refresh resources:', err));
        }

        // Refresh titles and ordering — a new chat appears, an existing one
        // moves to the top.
        loadChats();
        return result;
      } catch (err) {
        const message = describeRagError(err);
        const stillActive = activeChatRef.current === chatId;

        if (message === null) {
          // Cancelled — drop the optimistic question instead of orphaning it.
          // Cancelling only abandons the response: the server finishes the turn
          // and saves it, so refresh the list or the chat it created would be
          // missing from the sidebar until the next load.
          if (stillActive) setMessages((prev) => prev.filter((m) => m.id !== pendingId));
          loadChats();
          return null;
        }

        console.error('Medical knowledge query failed:', err);
        if (stillActive) {
          setError(message);
          setMessages((prev) => [
            ...prev,
            {
              id: nextLocalId(),
              role: 'assistant',
              text: message,
              citations: [],
              createdAt: new Date().toISOString(),
              isError: true,
            },
          ]);
        }
        return null;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setIsAsking(false);
      }
    },
    [isAsking, loadChats, setActive, resources]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const renameChat = useCallback(async (chatId, title) => {
    const clean = String(title || '').trim();
    if (!chatId || !clean) return false;

    const previous = chats;
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: clean } : c)));

    try {
      await ragService.renameChat(chatId, clean);
      return true;
    } catch (err) {
      console.error('Failed to rename chat:', err);
      setChats(previous);
      setError(describeRagError(err));
      return false;
    }
    // `chats` is read only to restore it on failure; it is intentionally a
    // dependency so the snapshot is never stale.
  }, [chats]);

  const deleteChat = useCallback(
    async (chatId) => {
      if (!chatId) return false;

      const previous = chats;
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatRef.current === chatId) startNewChat();

      try {
        await ragService.deleteChat(chatId);
        return true;
      } catch (err) {
        console.error('Failed to delete chat:', err);
        setChats(previous);
        setError(describeRagError(err));
        return false;
      }
    },
    [chats, startNewChat]
  );

  const deleteAllChats = useCallback(async () => {
    const previous = chats;
    setChats([]);
    startNewChat();

    try {
      await ragService.deleteAllChats();
      return true;
    } catch (err) {
      console.error('Failed to delete chats:', err);
      setChats(previous);
      setError(describeRagError(err));
      return false;
    }
  }, [chats, startNewChat]);

  return {
    chats,
    isLoadingChats,
    activeChatId,
    messages,
    isLoadingMessages,
    isAsking,
    elapsedSeconds,
    error,
    resources,
    // Only what is still in the composer — sent files render inside their message.
    stagedResources: resources.filter((resource) => !resource.message_id),
    // Sent files, grouped by the message that carries them. The transcript
    // prefers this over each message's own snapshot so a bubble always shows
    // the current file list and its live indexing status.
    resourcesByMessage: resources.reduce((grouped, resource) => {
      if (!resource.message_id) return grouped;
      (grouped[resource.message_id] ||= []).push(resource);
      return grouped;
    }, {}),
    uploadingFile,
    // True while a file about to be sent is still uploading or indexing. The
    // composer blocks on this: a question asked now could not cite the file.
    isPreparingFiles: Boolean(uploadingFile) || resources.some((r) => !r.message_id && isPreparing(r)),
    preparingFileNames: resources.filter((r) => !r.message_id && isPreparing(r)).map((r) => r.original_filename),
    ask,
    cancel,
    openChat,
    startNewChat,
    renameChat,
    deleteChat,
    deleteAllChats,
    attachResource,
    removeResource,
    reloadChats: loadChats,
    dismissError: () => setError(null),
  };
}
