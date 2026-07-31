import { useCallback, useEffect, useRef, useState } from 'react';
import { ragService, describeRagError } from '../services/ragService';

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
    setError(null);
  }, [setActive]);

  const openChat = useCallback(
    async (chatId) => {
      if (!chatId || chatId === activeChatRef.current) return;

      abortRef.current?.abort();
      abortRef.current = null;

      setActive(chatId);
      setMessages([]);
      setError(null);
      setIsLoadingMessages(true);

      try {
        const chat = await ragService.getChat(chatId);
        if (activeChatRef.current !== chatId) return;
        setMessages((chat?.messages ?? []).map(toMessage));
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

  // ── Asking ────────────────────────────────────────────────────────────────

  const ask = useCallback(
    async (rawQuestion) => {
      const question = String(rawQuestion || '').trim();
      if (!question || isAsking) return null;

      const chatId = activeChatRef.current;
      const pendingId = nextLocalId();

      setError(null);
      setElapsedSeconds(0);
      setIsAsking(true);
      setMessages((prev) => [
        ...prev,
        { id: pendingId, role: 'user', text: question, createdAt: new Date().toISOString() },
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
            ...prev,
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
    [isAsking, loadChats, setActive]
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
    ask,
    cancel,
    openChat,
    startNewChat,
    renameChat,
    deleteChat,
    deleteAllChats,
    reloadChats: loadChats,
    dismissError: () => setError(null),
  };
}
