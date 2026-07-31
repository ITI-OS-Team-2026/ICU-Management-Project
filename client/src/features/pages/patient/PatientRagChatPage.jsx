import { useEffect, useRef, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import {
  MessageSquareText,
  Send,
  Loader2,
  Trash2,
  AlertCircle,
  Sparkles,
  User,
  RefreshCcw,
  StopCircle,
  Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { useRagChat } from '../../hooks/useRagChat';
import CitationList from '../../components/rag/CitationList';
import KnowledgeBasePanel from '../../components/rag/KnowledgeBasePanel';
import { useAuthStore } from '../../store/authStore';

const PATIENT_QUESTIONS = [
  'What are the most recent vital signs and are any abnormal?',
  'Which laboratory results are flagged abnormal or need monitoring?',
  'Are any active medications in conflict with documented allergies?',
  'What trends do you see in this patient\'s condition over the last 48 hours?',
  'What does the uploaded clinical documentation indicate about the diagnosis?',
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

/** Small explainer shown under an answer: how it was produced. */
function RetrievalFootnote({ retrieval }) {
  if (!retrieval) return null;

  const parts = [];
  if (retrieval.document_chunks_retrieved > 0) {
    parts.push(
      `${retrieval.document_chunks_retrieved} document passage${
        retrieval.document_chunks_retrieved === 1 ? '' : 's'
      }`
    );
  }
  if (retrieval.clinical_records_retrieved > 0) {
    parts.push(
      `${retrieval.clinical_records_retrieved} clinical record${
        retrieval.clinical_records_retrieved === 1 ? '' : 's'
      }`
    );
  }

  const modeNote =
    retrieval.mode === 'retrieval_only'
      ? ' · retrieval-only (no language model configured)'
      : retrieval.mode === 'no_context'
      ? ' · nothing recorded to search'
      : '';

  return (
    <p className="mt-2 font-sans text-[10px] text-muted-foreground">
      Searched {parts.length > 0 ? parts.join(' + ') : 'this admission'}
      {typeof retrieval.duration_ms === 'number' && (
        <span className="font-tnum"> · {(retrieval.duration_ms / 1000).toFixed(1)}s</span>
      )}
      {modeNote}
    </p>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[70%]">
          <div className="flex items-center justify-end gap-1.5 mb-1">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {message.author
                ? `${message.author.first_name ?? ''} ${message.author.last_name ?? ''}`.trim() || 'Clinician'
                : 'You'}
            </span>
            <User size={11} className="text-muted-foreground" />
          </div>
          <div className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-primary-foreground">
            <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.text}
            </p>
          </div>
          {message.createdAt && (
            <p className="mt-1 text-right font-tnum text-[10px] text-muted-foreground">
              {formatTime(message.createdAt)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] sm:max-w-[80%]">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles size={11} className={message.isError ? 'text-destructive' : 'text-primary'} />
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            SmartCare AI
          </span>
        </div>
        <div
          className={`rounded-2xl rounded-tl-sm border px-3.5 py-2.5 ${
            message.isError
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-border bg-card'
          }`}
        >
          {message.isError ? (
            <p className="font-sans text-sm leading-relaxed text-destructive">{message.text}</p>
          ) : (
            <div className="text-sm">
              <FormattedMarkdown content={message.text} />
            </div>
          )}

          {!message.isError && <CitationList citations={message.citations} />}
          {!message.isError && <RetrievalFootnote retrieval={message.retrieval} />}
        </div>
      </div>
    </div>
  );
}

export default function PatientRagChatPage() {
  const { admissionId } = useParams();
  const outlet = useOutletContext() || {};
  const admission = outlet.admission;
  const user = useAuthStore((s) => s.user);

  const {
    messages,
    isLoadingHistory,
    isAsking,
    elapsedSeconds,
    error,
    historyError,
    ask,
    cancel,
    clear,
    reload,
    dismissError,
  } = useRagChat(admissionId);

  const [question, setQuestion] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const canClear = user?.role === 'MEDICAL_RESIDENT' || user?.role === 'ICU_SPECIALIST';
  const patientName = admission?.patient?.name;

  // Keep the newest turn in view as the conversation grows.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, isAsking]);

  const submitQuestion = async (text) => {
    const value = String(text ?? question).trim();
    if (!value || isAsking) return;

    setQuestion('');
    await ask(value, { mode: 'patient' });
    inputRef.current?.focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuestion();
  };

  const handleKeyDown = (event) => {
    // Enter sends, Shift+Enter adds a newline — standard chat behaviour.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitQuestion();
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    await clear();
    setIsClearing(false);
    setShowClearDialog(false);
  };

  const isEmpty = messages.length === 0 && !isLoadingHistory;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── Conversation ───────────────────────────────────────────────── */}
        <div className="lg:col-span-8 flex flex-col rounded-xl border border-border bg-card shadow-sm h-[calc(100vh-11rem)] min-h-[520px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquareText size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-base font-bold text-foreground leading-tight">
                  AI Chat Assistant
                </h1>
                <p className="font-sans text-[11px] text-muted-foreground truncate">
                  Grounded in {patientName ? `${patientName}'s` : 'this'} recorded data and uploaded documents — answers cite their source.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={reload}
                disabled={isLoadingHistory}
                title="Reload conversation"
                aria-label="Reload conversation"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <RefreshCcw size={14} className={isLoadingHistory ? 'animate-spin' : ''} />
              </Button>
              {canClear && messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowClearDialog(true)}
                  title="Clear conversation"
                  aria-label="Clear conversation"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </div>

          {historyError && (
            <Alert variant="destructive" className="m-3 mb-0 py-2">
              <AlertCircle size={14} />
              <AlertDescription className="text-xs">{historyError}</AlertDescription>
            </Alert>
          )}

          {/* Transcript */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {isLoadingHistory ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-2/3 ml-auto rounded-2xl" />
                <Skeleton className="h-24 w-4/5 rounded-2xl" />
                <Skeleton className="h-12 w-1/2 ml-auto rounded-2xl" />
              </div>
            ) : isEmpty ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-4">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles size={22} />
                </div>
                <h2 className="font-display text-base font-bold text-foreground">
                  Ask about this admission
                </h2>
                <p className="mt-1 max-w-sm font-sans text-xs leading-relaxed text-muted-foreground">
                  Questions are answered only from this patient's vitals, labs, notes, examinations,
                  and indexed documents. If the record does not contain the answer, the assistant
                  says so rather than guessing.
                </p>

                <div className="mt-5 flex w-full max-w-md flex-col gap-2">
                  {PATIENT_QUESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => submitQuestion(suggestion)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-left font-sans text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      {suggestion}
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
                    Retrieving records and composing an answer…
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
                    onClick={dismissError}
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
                placeholder="Ask about vitals, labs, medications, notes, or an uploaded document…"
                aria-label="Ask the AI assistant a question"
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
              Enter to send · Shift+Enter for a new line. Decision support only — verify every answer
              against the cited record.
            </p>
          </div>
        </div>

        {/* ── Knowledge base ─────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          <KnowledgeBasePanel admissionId={admissionId} canReindex={canClear} />

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-display text-xs font-bold text-foreground">How answers are built</h3>
            <ol className="mt-2 space-y-1.5 font-sans text-[11px] leading-relaxed text-muted-foreground list-decimal list-inside">
              <li>Your question is turned into a search vector.</li>
              <li>
                The closest passages from this admission's indexed documents are retrieved with
                pgvector.
              </li>
              <li>
                The admission's vitals, labs, medications, diagnoses, notes and examinations are
                added as structured context.
              </li>
              <li>The model answers using only that context, citing each source inline.</li>
            </ol>
            <p className="mt-2.5 font-sans text-[10px] text-muted-foreground">
              Retrieval never crosses admissions — another patient's records are unreachable from
              here.
            </p>
          </div>
        </div>
      </div>

      {/* ── Clear conversation confirmation ─────────────────────────────── */}
      <Dialog open={showClearDialog} onOpenChange={(open) => !open && !isClearing && setShowClearDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base font-bold">
              <Trash2 size={15} className="text-destructive" />
              Clear conversation
            </DialogTitle>
            <DialogDescription className="pt-1 font-sans text-xs leading-relaxed">
              This removes the question-and-answer history for this admission. The audit log keeps a
              permanent record of every query, so nothing is lost for compliance purposes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearDialog(false)}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClear} disabled={isClearing} className="gap-1.5">
              {isClearing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Clear conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
