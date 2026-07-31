import { useState, useEffect, useCallback, useRef } from 'react';
import { ragService, describeRagError } from '../services/ragService';

/**
 * Conversation state for the RAG assistant, shared by the patient AI Chat page
 * and the Resident/Specialist dashboard widget so both behave identically.
 *
 * Messages are a flat, render-ready list:
 *   { id, role: 'user' | 'assistant', text, citations, retrieval, createdAt, isError }
 */

let localIdCounter = 0;
const nextLocalId = () => `local-${Date.now()}-${(localIdCounter += 1)}`;

/** Turn a persisted ai_query_logs row into the two messages it represents. */
function logToMessages(entry) {
  return [
    {
      id: `${entry.id}-q`,
      role: 'user',
      text: entry.question,
      createdAt: entry.created_at,
      author: entry.asked_by_user,
    },
    {
      id: `${entry.id}-a`,
      role: 'assistant',
      text: entry.ai_response,
      citations: Array.isArray(entry.cited_sources) ? entry.cited_sources : [],
      createdAt: entry.created_at,
    },
  ];
}

export function useRagChat(admissionId, { autoLoadHistory = true, historyLimit = 30 } = {}) {
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  // Queries run 5-15s against the LLM; surface a live counter instead of a
  // spinner that looks frozen (FR-3.2 progress-indicator requirement).
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const abortRef = useRef(null);

  const loadHistory = useCallback(async () => {
    if (!admissionId) {
      setMessages([]);
      return;
    }

    setIsLoadingHistory(true);
    setHistoryError(null);

    try {
      const logs = await ragService.getHistory(admissionId, historyLimit);
      setMessages(logs.flatMap(logToMessages));
    } catch (err) {
      console.error('Failed to load AI conversation history:', err);
      setHistoryError(describeRagError(err));
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [admissionId, historyLimit]);

  useEffect(() => {
    if (autoLoadHistory) loadHistory();
  }, [autoLoadHistory, loadHistory]);

  // Cancel any in-flight question when the admission changes or we unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [admissionId]);

  // Tick a visible counter while a question is in flight. The counter is reset
  // by `ask()` when it starts, so this effect only ever advances it.
  useEffect(() => {
    if (!isAsking) return undefined;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isAsking]);

  const ask = useCallback(
    async (rawQuestion, options = {}) => {
      const question = String(rawQuestion || '').trim();
      if (!question || !admissionId || isAsking) return null;

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
        const result = await ragService.ask(admissionId, question, {
          ...options,
          signal: controller.signal,
        });

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

        return result;
      } catch (err) {
        const message = describeRagError(err);

        if (message === null) {
          // Cancelled — drop the optimistic question rather than leaving it orphaned.
          setMessages((prev) => prev.filter((m) => m.id !== pendingId));
          return null;
        }

        console.error('RAG query failed:', err);
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
        return null;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setIsAsking(false);
      }
    },
    [admissionId, isAsking]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const clear = useCallback(async () => {
    if (!admissionId) return;

    const previous = messages;
    setMessages([]);
    setError(null);

    try {
      await ragService.clearHistory(admissionId);
    } catch (err) {
      console.error('Failed to clear AI conversation:', err);
      setError(describeRagError(err));
      setMessages(previous);
    }
  }, [admissionId, messages]);

  return {
    messages,
    isLoadingHistory,
    isAsking,
    elapsedSeconds,
    error,
    historyError,
    ask,
    cancel,
    clear,
    reload: loadHistory,
    dismissError: () => setError(null),
  };
}
