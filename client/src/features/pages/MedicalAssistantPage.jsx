import { useEffect, useRef, useState } from 'react';
import {
  MessageSquareText,
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  RefreshCcw,
  StopCircle,
  Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { ragService, describeRagError } from '../../features/services/ragService';
import CitationList from '../../features/components/rag/CitationList';

const KNOWLEDGE_PROMPTS = [
  'What smoking index indicates heavy smoking?',
  'What occupational hazards cause chest diseases?',
  'What are the cardinal symptoms of respiratory diseases?',
  'What\'s the difference between acute and gradual onset?',
  'What gender-specific history should I take from female patients?',
];

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  // document_chunks_retrieved counts what retrieval found, not what the model
  // actually used — a weak match can be retrieved and still go uncited if the
  // model judged it irrelevant and answered from general knowledge instead.
  // Whether a document chunk was actually cited is the accurate "grounded"
  // signal — the synthetic "general_knowledge" source is also `cited: true`,
  // so it must be excluded here or every answer would read as grounded.
  const isGrounded =
    Array.isArray(message.citations) &&
    message.citations.some((c) => c.cited && c.type === 'document_chunk');

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[70%] ${isUser ? '' : ''}`}>
        <div className="mb-1 flex items-center gap-1.5">
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isUser ? 'You' : 'Medical Assistant'}
          </span>
          {!isUser && !message.isError && message.retrieval && (
            <Badge
              variant="outline"
              className={`h-4 px-1.5 text-[9px] font-normal normal-case ${
                isGrounded
                  ? 'border-primary/30 text-primary'
                  : 'border-amber-500/30 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isGrounded ? 'Knowledge base' : 'General AI knowledge'}
            </Badge>
          )}
        </div>
        <div
          className={`p-3.5 rounded-2xl ${
            isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
          } border text-sm font-sans leading-relaxed ${
            isUser
              ? 'bg-primary text-primary-foreground border-primary/20'
              : message.isError
              ? 'bg-destructive/15 text-destructive border-destructive/40'
              : 'bg-card text-foreground border-border'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          {!isUser && !message.isError && (
            <CitationList citations={message.citations} />
          )}
        </div>
        {message.createdAt && (
          <p className={`mt-1 font-tnum text-[10px] text-muted-foreground ${isUser ? 'text-right' : ''}`}>
            {formatTime(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MedicalAssistantPage() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, isAsking]);

  useEffect(() => {
    if (!isAsking) {
      setElapsedSeconds(0);
      return undefined;
    }

    const startedAt = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isAsking]);

  const submitQuestion = async (text) => {
    const value = String(text ?? question).trim();
    if (!value || isAsking) return;

    setQuestion('');
    setError(null);
    setElapsedSeconds(0);
    setIsAsking(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: 'user',
          text: value,
          createdAt: new Date().toISOString(),
        },
      ]);

      const result = await ragService.ask(null, value, {
        mode: 'knowledge',
        signal: controller.signal,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: result.id || `local-${Date.now()}`,
          role: 'assistant',
          text: result.ai_response,
          citations: Array.isArray(result.cited_sources) ? result.cited_sources : [],
          retrieval: result.retrieval,
          createdAt: result.created_at || new Date().toISOString(),
        },
      ]);
    } catch (err) {
      const message = describeRagError(err);

      if (message === null) {
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      console.error('Medical knowledge query failed:', err);
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: 'assistant',
          text: message,
          citations: [],
          createdAt: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsAsking(false);
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuestion();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitQuestion();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── Conversation ───────────────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col rounded-xl border border-border bg-card shadow-sm h-[calc(100vh-11rem)] min-h-[520px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles size={17} />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-base font-bold text-foreground leading-tight">
                  Medical Knowledge Assistant
                </h1>
                <p className="font-sans text-[11px] text-muted-foreground truncate">
                  Ask about medical knowledge from clinical guidelines — references the indexed knowledge base
                </p>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {isEmpty ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-4">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles size={22} />
                </div>
                <h2 className="font-display text-base font-bold text-foreground">
                  Ask medical knowledge questions
                </h2>
                <p className="mt-1 max-w-sm font-sans text-xs leading-relaxed text-muted-foreground">
                  Questions about medical concepts, guidelines, symptom interpretation, occupational exposures, risk factors, and clinical frameworks from the ICU medicine knowledge base.
                </p>

                <div className="mt-5 flex w-full max-w-md flex-col gap-2">
                  {KNOWLEDGE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => submitQuestion(prompt)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-left font-sans text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => <ChatBubble key={message.id} message={message} />)
            )}

            {isAsking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-border bg-muted/40 px-3.5 py-2.5">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span className="font-sans text-xs text-muted-foreground">
                    Searching medical knowledge base…
                  </span>
                  <span className="font-tnum text-xs text-muted-foreground">{elapsedSeconds}s</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancel}
                    title="Cancel"
                    aria-label="Cancel request"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  >
                    <StopCircle size={13} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3 shrink-0">
            {error && (
              <Alert variant="destructive" className="mb-2 py-2">
                <AlertCircle size={14} />
                <AlertDescription className="flex items-center justify-between gap-2 text-xs">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="shrink-0 underline underline-offset-2"
                  >
                    Dismiss
                  </button>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                disabled={isAsking}
                placeholder="Ask about medical concepts, guidelines, symptoms, risks, or clinical frameworks…"
                aria-label="Ask the medical assistant a question"
                className="min-h-[42px] max-h-32 resize-y font-sans text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isAsking || !question.trim()}
                aria-label="Send question"
                className="h-[42px] w-[42px] shrink-0"
              >
                {isAsking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </Button>
            </form>

            <p className="mt-1.5 flex items-center gap-1 font-sans text-[10px] text-muted-foreground">
              <Info size={10} className="shrink-0" />
              Enter to send · Shift+Enter for a new line. Prefers the knowledge base; falls back to general medical knowledge when nothing matches.
            </p>
          </div>
        </div>

        {/* ── Info Panel ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-display text-xs font-bold text-foreground">About This Assistant</h3>
            <ul className="mt-2 space-y-1.5 font-sans text-[11px] leading-relaxed text-muted-foreground list-disc list-inside">
              <li>Searches the indexed medical knowledge base first and cites it when it answers the question</li>
              <li>Falls back to the AI's own general medical knowledge when the knowledge base has nothing relevant — labeled "General AI knowledge"</li>
              <li>NOT patient-specific — no access to individual patient records</li>
              <li>Great for: understanding concepts, checking guidelines, learning best practices</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-display text-xs font-bold text-foreground">Knowledge Base Includes</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px]">History-Taking Guides</Badge>
              <Badge variant="outline" className="text-[10px]">Symptom Analysis</Badge>
              <Badge variant="outline" className="text-[10px]">Occupational Exposures</Badge>
              <Badge variant="outline" className="text-[10px]">Risk Stratification</Badge>
              <Badge variant="outline" className="text-[10px]">Gender-Specific Care</Badge>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-display text-xs font-bold text-foreground">Tip</h3>
            <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted-foreground">
              Use this for medical concepts and guidelines. For patient-specific questions, go to a patient's record and use the <strong>AI Chat</strong> tab to ask about their records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
